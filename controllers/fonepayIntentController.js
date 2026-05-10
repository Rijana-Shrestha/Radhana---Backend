/**
 * controllers/fonepayIntentController.js
 *
 * HTTP handlers for Fonepay Intent / Dynamic QR payment.
 *
 * All routes registered under /api/fonepay-intent (auth applied in app.js)
 *
 *   GET  /banks               → getBankList
 *   POST /initiate/:orderId   → initiateIntentPayment
 *   POST /verify/:orderId     → verifyIntentPayment
 *   GET  /status/:orderId     → getPaymentStatus
 */

import fonepayIntentService from "../services/fonepayIntentService.js";
import fonepayIntentOrderService from "../services/fonepayIntentOrderService.js";

// GET /api/fonepay-intent/banks?mobileNo=98XXXXXXXX
const getBankList = async (req, res) => {
  try {
    const banks = await fonepayIntentService.getBankList(
      req.query.mobileNo || "",
    );
    res.json({ banks });
  } catch (e) {
    console.error("[FonepayIntent] getBankList:", e.message);
    if (e.response?.status === 401) fonepayIntentService.invalidateToken();
    res.status(e.response?.status || 500).json({ message: e.message });
  }
};

// POST /api/fonepay-intent/initiate/:orderId
// Returns: { qrMessage, websocketId, referenceLabel, prn, orderId }
const initiateIntentPayment = async (req, res) => {
  try {
    const data = await fonepayIntentOrderService.initiateIntentPayment(
      req.params.orderId,
      req.user,
    );
    res.json(data);
  } catch (e) {
    console.error("[FonepayIntent] initiate:", e.message);
    if (e.response?.status === 401) fonepayIntentService.invalidateToken();
    res
      .status(e.statusCode || e.response?.status || 500)
      .json({ message: e.message });
  }
};

// POST /api/fonepay-intent/verify/:orderId
// Body: { referenceLabel, websocketPayload? }
// Returns: { success, order, traceId }
const verifyIntentPayment = async (req, res) => {
  try {
    const { referenceLabel, websocketPayload } = req.body;
    if (!referenceLabel)
      return res.status(400).json({ message: "referenceLabel is required" });

    const data = await fonepayIntentOrderService.verifyAndFinalizePayment(
      req.params.orderId,
      referenceLabel,
      websocketPayload || null,
      req.user,
    );
    res.json(data);
  } catch (e) {
    console.error("[FonepayIntent] verify:", e.message);
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// GET /api/fonepay-intent/status/:orderId?referenceLabel=FPI...
// Fallback poll — safe to call multiple times
const getPaymentStatus = async (req, res) => {
  try {
    const { referenceLabel } = req.query;
    if (!referenceLabel)
      return res.status(400).json({ message: "referenceLabel is required" });

    const data = await fonepayIntentOrderService.checkAndFinalizeIfPaid(
      req.params.orderId,
      referenceLabel,
      req.user,
    );
    res.json(data);
  } catch (e) {
    console.error("[FonepayIntent] status:", e.message);
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

export default {
  getBankList,
  initiateIntentPayment,
  verifyIntentPayment,
  getPaymentStatus,
};
