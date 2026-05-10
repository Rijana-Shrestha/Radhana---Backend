/**
 * routes/fonepayIntentRoute.js
 *
 * All routes auth-protected via the global auth middleware in app.js
 *
 *   GET  /api/fonepay-intent/banks
 *   POST /api/fonepay-intent/initiate/:orderId
 *   POST /api/fonepay-intent/verify/:orderId
 *   GET  /api/fonepay-intent/status/:orderId
 */

import express from "express";
import fonepayIntentController from "../controllers/fonepayIntentController.js";

const router = express.Router();

router.get("/banks", fonepayIntentController.getBankList);
router.post(
  "/initiate/:orderId",
  fonepayIntentController.initiateIntentPayment,
);
router.post("/verify/:orderId", fonepayIntentController.verifyIntentPayment);
router.get("/status/:orderId", fonepayIntentController.getPaymentStatus);

export default router;
