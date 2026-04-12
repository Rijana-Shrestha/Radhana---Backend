import express from "express";
import orderController from "../controllers/orderController.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// All routes already have auth applied globally in app.js

// Admin: get all orders
router.get("/", roleBasedAuth(ADMIN), orderController.getOrders);

// User: get their own orders
router.get("/user", orderController.getOrdersByUser);

// Admin: get single order
router.get("/:id", roleBasedAuth(ADMIN), orderController.getOrderById);

// Create order (any logged-in user)
router.post("/", orderController.createOrder);

// Update order status (admin) or cancel (user)
router.put("/:id", roleBasedAuth(ADMIN), orderController.updateOrder);

// Delete order
router.delete("/:id", orderController.deleteOrder);

// Khalti payment
router.post("/:id/payment/khalti", orderController.orderPaymentViaKhalti);
router.put("/:id/confirm-payment", orderController.confirmOrderPayment);

export default router;
