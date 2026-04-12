import express from "express";
import galleryController from "../controllers/galleryController.js";
import auth from "../middlewares/auth.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// Public
router.get("/", galleryController.getGallery);

// Admin only — multer middleware applied in app.js for this route group
// Expects FormData with field name "images" (for multiple files)
router.post(
  "/",
  auth,
  roleBasedAuth(ADMIN),
  galleryController.createGalleryItem,
);
router.put(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  galleryController.updateGalleryItem,
);
router.delete(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  galleryController.deleteGalleryItem,
);

export default router;
