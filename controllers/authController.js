import argon2 from 'argon2';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import { generateToken } from "../utils/auth.js";
import MSG from "../utils/message.js"
import {
    findUserByEmail,
    getUserById,
    updateUserProfile,
    fetchUserPassword,
    updatePassword,
    getUserCountByRole,
    updateClientAssignment,
    removeUserPermissions,
    insertUserPermissions,
    getPermissions,
    getPermissionsByUserId,
    getCompletedCaseCount
} from "../models/userModel.js";

dotenv.config();
const __dirname = path.resolve();

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
};

let localIp = getLocalIp();
let baseUrl = `http://${localIp}:${process.env.PORT}`;

// Login API
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(400).json({ success: false, message: MSG.USER_NOT_FOUND });

        if (!user.email_verified_at) return res.status(403).json({ success: false, message: MSG.VERIFY_EMAIL_FIRST });

        if (user.status == 2) return res.status(403).json({ success: false, message: MSG.BLOCKED_USER });

        const isMatch = await argon2.verify(user.password, password);
        if (!isMatch) return res.status(400).json({ success: false, message: MSG.INVALID_CREDENTIALS });

        const token = generateToken(user);

        res.json({
            success: true,
            message: MSG.LOGIN_SUCCESSFULL,
            token,
            user: {
                ...user,
                role_name: user.role_name,
                profile_image: user.profile_image ? `${baseUrl}/uploads/profile_images/${user.profile_image}` : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

// Get Profile API
export const getProfile = async (req, res) => {

    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }
        const { show_password, ...other } = user

        res.json({ success: true, user: { ...other, profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null, } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update Profile API
export const updateProfile = async (req, res) => {
    const { name, phone_number } = req.body;
    const userId = req.user.id;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }

        let updateData = {
            name: name || user.name,
            phone_number: phone_number || user.phone_number,
            profile_image: user.profile_image,
        };

        if (req.files?.profile_image) {
            const newImagePath = `${req.files.profile_image[0].filename}`;

            if (user.profile_image) {
                const oldImagePath = path.join("public", user.profile_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            updateData.profile_image = newImagePath;
        }

        const response = await updateUserProfile(userId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: MSG.PROFILE_UPDATED,
            });
        } else {
            return res.status(400).json({ success: false, message: MSG.NO_PROFILE_CHANGES });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Change Password API
export const changePassword = async (req, res) => {
    console.log(req.body)
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: MSG.PASSWORD_REQUIRED,
            });
        }

        const user = await fetchUserPassword(userId);
        if (!user || !user.password) {
            return res.status(404).json({
                success: false,
                message: MSG.USER_NOT_FOUND,
            });
        }

        const isMatch = await argon2.verify(user.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: MSG.INCORRECT_OLD_PASSWORD });
        }

        const hashedNewPassword = await argon2.hash(new_password);

        const response = await updatePassword(hashedNewPassword, new_password, userId);

        if (response?.affectedRows > 0) {
            return res.json({
                success: true,
                message: MSG.PASSWORD_CHANGED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.PASSWORD_CHANGE_FAILED,
            });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR });
    }
};

// Forgot Password API
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(404).json({ message: MSG.USER_NOT_FOUND });

        // if (user.status == 0) return res.status(403).json({ success: false, message: MSG.PENDING_USER });
        // if (user.status == 2) return res.status(403).json({ success: false, message: MSG.BLOCKED_USER });

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        const resetLink = `${baseUrl}/api/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const templatePath = path.join(__dirname, "../views/forget-password.ejs");
        let emailHtml = fs.readFileSync(templatePath, "utf8");
        emailHtml = emailHtml.replace("<%= resetLink %>", resetLink);

        await transporter.sendMail({
            from: '"No Reply" <no-reply@gmail.com>',
            to: user.email,
            subject: "Password Reset Request",
            html: emailHtml,
        });

        res.status(200).json({ success: true, message: MSG.RECOVERY_EMAIL_SENT });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Load reset password view page
export const loadResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    const resetLink = `${baseUrl}/api/`
    res.render("reset-password", { token, resetLink });
};

//  Reset Password API
export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const hashedNewPassword = await argon2.hash(password);

        await updatePassword(hashedNewPassword, password, decoded.id);
        return res.json({ success: true, message: MSG.PROFILE_UPDATED, redirect: process.env.APP_PATH });
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR + error.message });
    }
};

//  Admin Dashboard
export const adminDashboard = async (req, res) => {
    const { number_of_months = 6 } = req.body;
    try {
        const subadminCount = await getUserCountByRole(2);
        const agentCount = await getUserCountByRole(3);
        const clientCount = await getUserCountByRole(4);
        const completedCaseCount = await getCompletedCaseCount(1);
        const completedCaseData = await getCompletedCaseCount(1, number_of_months);

        res.status(200).json({
            success: true,
            data: {
                subadminCount,
                agentCount,
                clientCount,
                completedCaseCount: completedCaseCount[0]?.count ?? 0,
                completedCaseData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

//  Agent Dashboard
export const agentDashboard = async (req, res) => {
    const { number_of_months = 6 } = req.body;
    try {
        const clientCount = await getUserCountByRole(4);     // role_id = 4 (client)
        const completedCaseCount = await getCompletedCaseCount(1);
        const completedCaseData = await getCompletedCaseCount(1, number_of_months);

        res.status(200).json({
            success: true,
            data: {
                clientCount,
                completedCaseCount: completedCaseCount[0]?.count ?? 0,
                completedCaseData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

//  Client Dashboard
export const clientDashboard = async (req, res) => {
    const { number_of_months = 6 } = req.body;
    try {
        const completedCaseCount = await getCompletedCaseCount(1);
        const completedCaseData = await getCompletedCaseCount(1, number_of_months);

        res.status(200).json({
            success: true,
            data: {
                completedCaseCount: completedCaseCount[0]?.count ?? 0,
                completedCaseData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: error.message });
    }
};


// assign clients to agent
export const assignClientsToAgent = async (req, res) => {
    const { agent_id, client_ids } = req.body;

    if (!agent_id || !client_ids) {
        return res.status(400).json({ message: 'agent_id and client_ids are required' });
    }

    const clientIdArray = client_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

    if (clientIdArray.length === 0) {
        return res.status(400).json({ message: 'No valid client IDs provided.' });
    }

    try {
        const agent = await getUserById(agent_id);
        if (!agent || agent.role_id !== 3) {
            return res.status(404).json({ success: false, message: 'Agent not found or invalid.' });
        }

        const response = await updateClientAssignment(agent_id, clientIdArray);

        const msg = response.affectedRows === 0
            ? 'Clients were already assigned to this agent or no valid clients found.'
            : 'Clients assigned successfully.';

        return res.status(200).json({ success: true, message: msg });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: MSG.INTERNAL_SERVER_ERROR, error: err });
    }
};

// set permission for sub admin
export const setSubadminPermissions = async (req, res) => {
    const { subadmin_id, permission_ids } = req.body;

    if (!subadmin_id || !permission_ids) {
        return res.status(400).json({ message: 'subadmin_id and permission_ids are required' });
    }

    const permissionIdArray = permission_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

    if (permissionIdArray.length === 0) {
        return res.status(400).json({ message: 'No valid permission IDs provided.' });
    }

    try {
        // Check if user exists and is a SubAdmin
        const user = await getUserById(subadmin_id);
        if (!user || user.role_id !== 2) {
            return res.status(404).json({ success: false, message: "SubAdmin not found." });
        }

        // Remove existing permissions
        await removeUserPermissions(subadmin_id);

        // Insert new permissions
        if (permission_ids.length > 0) {
            await insertUserPermissions(subadmin_id, permissionIdArray);
        }

        return res.status(200).json({ success: true, message: MSG.PERMISSION_UPDATED });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: err });
    }
};

// Get All Permissions assigned to sub admin
export const getSubadminPermissions = async (req, res) => {
    const { subadmin_id } = req.body;
    
    if (!subadmin_id) {
        return res.status(400).json({
            success: false,
            message: "subadmin_id is required",
        });
    }

    try {
        const permissions = await getPermissionsByUserId(subadmin_id);

        if (!permissions || permissions.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.PERMISSION_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// Get All Permissions
export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await getPermissions();

        if (!permissions || permissions.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.PERMISSION_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: permissions,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

