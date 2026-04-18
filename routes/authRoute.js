import express from "express";
import authController from "../controllers/authController.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", authController.register);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", auth, authController.getMe);

export default router;
