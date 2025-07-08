import express from "express";
import { auth } from "../middleware/auth.js";
import { upload } from "../config/multer.js";
import {
    adminDashboard,
    agentDashboard,
    assignClientsToAgent,
    changePassword,
    clientDashboard,
    forgotPassword,
    getAllPermissions,
    getProfile,
    getSubadminPermissions,
    loadResetPasswordForm,
    login,
    resetPassword,
    setSubadminPermissions,
    updateProfile
} from "../controllers/authController.js";
import {
    blockUnblockUser,
    createUserByRole,
    deleteUserById,
    getAllUsersByRole,
    getClientsByAgentId,
    getUserInfoById,
    setNewPasswordById,
    verifyEmail
} from "../controllers/userController.js";

const router = express.Router();

router.post("/login", login);
router.get("/get-profile", auth, getProfile);
router.put("/update-profile", auth, upload, updateProfile);
router.post("/change-password", auth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);
router.post("/admin-dashboard", auth, adminDashboard);
router.post("/agent-dashboard", auth, agentDashboard);
router.post("/client-dashboard", auth, clientDashboard);

router.post("/create-user-by-role", auth, createUserByRole);
router.get("/verify/:token", verifyEmail);

router.post("/get-users-by-role", auth, getAllUsersByRole);
router.post("/get-user-info-by-id", auth, getUserInfoById);
router.post("/block-unblock-user", auth, blockUnblockUser);
router.post("/delete-user", auth, deleteUserById);
router.post("/set-new-password", auth, setNewPasswordById);

router.post("/get-clients-by-agent-id", auth, getClientsByAgentId);
router.post('/assign-clients-to-agent', auth, assignClientsToAgent);
router.get('/get-all-permissions', auth, getAllPermissions);
router.post('/set-sub-admin-permissions', auth, setSubadminPermissions);
router.post('/get-sub-admin-permissions', auth, getSubadminPermissions);
// router.get('/subadmin/permissions/:user_id', getSubadminPermissions);

export default router;