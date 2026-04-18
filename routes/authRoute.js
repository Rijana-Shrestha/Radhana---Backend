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
<<<<<<< HEAD
router.post("/verify-email", authController.verifyEmail);
router.get("/check-verification", authController.checkVerificationStatus);
// Returns current user data — used by frontend to check login state
=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
router.get("/me", auth, authController.getMe);

export default router;
