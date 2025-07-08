import os from 'os';
import path from 'path';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import MSG from "../utils/message.js";
import { sendVerificationEmail } from '../config/mailer.js';
import {
    createUser,
    deleteUser,
    findUserByActToken,
    findUserByEmail,
    getAllClients,
    getUserById,
    getUsersByRole,
    insertUserPermissions,
    setNewPassword,
    updateStatus,
    verifyUserEmail
} from "../models/userModel.js";

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

// function to generate random alphanumeric string
function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Create Agent
export const createUserByRole = async (req, res) => {
    const { name, email, role_id, agent_id, permission_ids } = req.body;

    try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: MSG.EMAIL_ALREADY_REGISTERED
            })
        }

        const password = generateRandomPassword(8);
        const hashedPassword = await argon2.hash(password);

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        await sendVerificationEmail(req, email, password, token);

        const userData = {
            name,
            role_id,
            email,
            password: hashedPassword,
            show_password: password,
            act_token: token,
            created_by: agent_id ?? null,
            status: role_id == 2 ? 1 : 0
        };

        const response = await createUser(userData);

        if (response.affectedRows > 0) {
            const insertedUserId = response.insertId;

            if (role_id == 2 && permission_ids) {
                const permissionIdArray = permission_ids
                    .split(',')
                    .map(id => parseInt(id.trim()))
                    .filter(id => !isNaN(id));

                if (permissionIdArray.length > 0) {
                    await insertUserPermissions(insertedUserId, permissionIdArray);
                }
            }

            res.status(201).json({
                success: true,
                message: `Invitation sent! Please check (${email}) for login details and accept the invitation.`,
            });
        } else {
            res.status(500).json({ success: false, message: MSG.SIGNUP_FAILED });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Verify User
export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await findUserByActToken(token);

        if (user?.act_token != token) {
            return res.sendFile(path.join(__dirname, "views", "notverify.html"));
        }

        const data = {
            act_token: null,
            email_verified_at: new Date(),
            id: user.id,
        };

        const result = await verifyUserEmail(
            data?.act_token,
            data?.email_verified_at,
            data?.id
        );

        if (result.affectedRows > 0) {
            return res.render("success");
            // return res.redirect("http://89.116.21.92/ibs/");
        } else {
            return res.sendFile(path.join(__dirname, "views", "notverify.html"));
        }
    } catch (error) {
        res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

// get all users by role
export const getAllUsersByRole = async (req, res) => {
    const { role_id, search = '', status = '' } = req.body;

    try {
        const users = await getUsersByRole(role_id, search, status);

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }

        const formattedUsers = users.map(user => {
            const { show_password, ...other } = user;
            return {
                ...other,
                profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null
            };
        });

        res.status(200).json({ success: true, users: formattedUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// get all users by role
export const blockUnblockUser = async (req, res) => {
    const { id, status } = req.body;

    try {
        const updated = await updateStatus(id, status);

        if (!updated) {
            return res.status(404).json({ success: false, message: MSG.SOMETHING_WENT_WRONG });
        }

        res.status(200).json({ success: true, message: MSG.STATUS_CHANGED });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// get user info by id
export const getUserInfoById = async (req, res) => {
    const { id } = req.body;

    try {
        const user = await getUserById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }
        const { show_password, ...other } = user

        res.json({
            success: true,
            user: {
                ...other,
                profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// get user info by id
export const deleteUserById = async (req, res) => {
    const { id } = req.body;

    try {
        const result = await deleteUser(id);

        if (!result) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }

        return res.status(200).json({ success: true, message: MSG.USER_DELETED });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// set new password by user
export const setNewPasswordById = async (req, res) => {
    const { id, password } = req.body;

    try {
        const result = await getUserById(id);

        if (!result) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }

        if (result.status === 0) {
            const hashedNewPassword = await argon2.hash(password);
            const status = 1;
            const updated = await setNewPassword(hashedNewPassword, password, status, id);

            if (updated) {
                return res.status(200).json({ success: true, message: MSG.PASSWORD_CHANGED });
            } else {
                return res.status(400).json({ success: false, message: MSG.PASSWORD_CHANGE_FAILED });
            }
        } else {
            return res.status(400).json({ success: false, message: "User is already active." });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: MSG.INTERNAL_SERVER_ERROR + error.message });
    }
};

// Get my all clients API
export const getClientsByAgentId = async (req, res) => {
    const { agent_id, search = '', status = '' } = req.body;
    try {
        const users = await getAllClients(agent_id, search, status);

        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: MSG.USER_NOT_FOUND });
        }

        const formattedUsers = users.map(user => {
            const { show_password, ...other } = user;
            return {
                ...other,
                profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null
            };
        });

        res.status(200).json({ success: true, users: formattedUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
