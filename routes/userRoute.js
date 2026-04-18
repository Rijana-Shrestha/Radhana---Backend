import express from "express";
import userController from "../controllers/userController.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import auth from "../middlewares/auth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// Specific routes first (to prevent :id from matching "profile")
router.get("/profile", auth, userController.getProfile);
router.patch("/:id/profile-image", userController.updateProfileImage);
router.patch("/:id/change-password", auth, userController.changePassword);

// Admin only
router.post("/", roleBasedAuth(ADMIN), userController.createUser);
router.get("/", roleBasedAuth(ADMIN), userController.getUsers);
router.get("/:id", roleBasedAuth(ADMIN), userController.getUserById);
router.delete("/:id", roleBasedAuth(ADMIN), userController.deleteUser);

// User can update their own profile
router.put("/:id", userController.updateUser);

export default router;
