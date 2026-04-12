import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

// All routes require auth (applied globally in app.js)

// Get user's cart
router.get("/", cartController.getCart);

// Add item to cart
router.post("/add", cartController.addToCart);

// Update cart item quantity
router.put("/update", cartController.updateCartItem);

// Remove item from cart
router.delete("/remove", cartController.removeFromCart);

// Clear entire cart
router.delete("/clear", cartController.clearCart);

export default router;
