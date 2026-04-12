import express from "express";
import productsController from "../controllers/productsController.js";
import auth from "../middlewares/auth.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// Public routes
router.get("/", productsController.getProducts);
router.get("/:id", productsController.getProductById);

// Admin only — multer already applied in app.js for this route group
router.post("/", auth, roleBasedAuth(ADMIN), productsController.createProduct);
router.put(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  productsController.updateProduct,
);
router.delete(
  "/:id",
  auth,
  roleBasedAuth(ADMIN),
  productsController.deleteProduct,
);

export default router;
