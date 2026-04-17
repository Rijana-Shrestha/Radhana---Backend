import express from "express";
import categoryController from "../controllers/categoryController.js";
import auth from "../middlewares/auth.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

router.get("/", categoryController.getCategories);

// Admin only
router.post("/", auth, roleBasedAuth(ADMIN), categoryController.createCategory);
router.delete(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  categoryController.deleteCategory,
);

export default router;
