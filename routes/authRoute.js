import express from "express";
import authController from "../controllers/authController.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// 2FA routes
router.post("/verify-2fa", authController.verifyTwoFactor);
router.patch("/toggle-2fa", auth, authController.toggleTwoFactor);

// Returns current user data
router.get("/me", auth, authController.getMe);

export default router;
