import express from "express";
import multer from "multer";
import contactController from "../controllers/contactController.js";
import auth from "../middlewares/auth.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public — anyone can send a contact message
router.post("/", upload.single("attachment"), contactController.createMessage);

// Admin only
router.get("/", auth, roleBasedAuth(ADMIN), contactController.getMessages);
router.patch(
  "/:id/read",
  auth,
  roleBasedAuth(ADMIN),
  contactController.markAsRead,
);
router.delete(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  contactController.deleteMessage,
);

export default router;
