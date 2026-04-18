import express from "express";
import orderController from "../controllers/orderController.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// All routes have auth applied globally in app.js
router.get("/", roleBasedAuth(ADMIN), orderController.getOrders);
router.get("/user", orderController.getOrdersByUser);
router.get("/:id", roleBasedAuth(ADMIN), orderController.getOrderById);
router.post("/", orderController.createOrder);
router.put("/:id", roleBasedAuth(ADMIN), orderController.updateOrder);
router.delete("/:id", orderController.deleteOrder);

// ── Payment routes ─────────────────────────────────────────
// Khalti
router.post("/:id/payment/khalti", orderController.orderPaymentViaKhalti);
router.get("/:id/verify-khalti", orderController.verifyKhaltiPayment);

// Fonepay
router.post("/:id/payment/fonepay", orderController.orderPaymentViaFonepay);
router.get("/:id/verify-fonepay", orderController.verifyFonepayPayment);

// Legacy confirm
router.put("/:id/confirm-payment", orderController.confirmOrderPayment);

export default router;
