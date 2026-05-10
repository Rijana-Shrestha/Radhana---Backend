/**
 * services/fonepayIntentOrderService.js
 *
 * Bridges the Fonepay Intent API with your existing Order + Payment models.
 *
 * KEY FIX: Imports and reuses finalizePayment directly from orderService.js
 * so invoice generation, order confirmation, and fraud guard are identical
 * to your existing Khalti/Fonepay redirect flow — no duplication.
 */

import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import crypto from "crypto";
import fonepayIntentService from "./fonepayIntentService.js";
import {
  PAYMENT_STATUS_COMPLETED,
  PAYMENT_STATUS_FAILED,
} from "../constants/paymentStatuses.js";
import { ADMIN } from "../constants/roles.js";

// Import the shared finalizePayment from orderService to avoid duplication
// Note: we export it separately below so it's importable without circular deps
import orderService from "./orderService.js";

// ── Helper: fetch order + verify ownership ────────────────────────────────────
const getOwnOrder = async (orderId, user) => {
  const order = await Order.findById(orderId)
    .populate("orderItems.product")
    .populate("payment");

  if (!order) throw { statusCode: 404, message: "Order not found." };

  const isOwner = order.user.toString() === user._id.toString();
  const isAdmin = user.roles?.includes(ADMIN);
  if (!isOwner && !isAdmin)
    throw { statusCode: 403, message: "Access denied." };

  return order;
};

// ── 1. Initiate — create Payment record + generate QR ────────────────────────
const initiateIntentPayment = async (orderId, user) => {
  const order = await getOwnOrder(orderId, user);

  // Guard: don't re-initiate if already paid
  if (order.payment) {
    const existing = await Payment.findById(order.payment);
    if (existing?.status === PAYMENT_STATUS_COMPLETED)
      throw { statusCode: 409, message: "This order is already paid." };
  }

  // Create a PENDING payment record
  const paymentDoc = await Payment.create({
    amount: order.totalPrice,
    method: "fonepay",
    transactionId: crypto.randomUUID(), // replaced after confirmation
  });

  await Order.findByIdAndUpdate(orderId, { payment: paymentDoc._id });

  // Call Fonepay API to generate the dynamic QR
  const qrData = await fonepayIntentService.generateIntentQR({
    amount: order.totalPrice,
    orderId,
    orderNumber: order.orderNumber,
  });

  // Store the referenceLabel on the Payment for later verification
  await Payment.findByIdAndUpdate(paymentDoc._id, {
    fonepayRef: qrData.referenceLabel,
    transactionId: qrData.prn,
  });

  return {
    qrMessage: qrData.qrMessage, // render this as QR image on frontend
    websocketId: qrData.websocketId, // ws:// — frontend connects here
    referenceLabel: qrData.referenceLabel,
    prn: qrData.prn,
    displayName: qrData.displayName,
    orderId,
  };
};

// ── 2. Verify + finalize — called after WebSocket fires or user clicks Check ──
const verifyAndFinalizePayment = async (
  orderId,
  referenceLabel,
  websocketPayload,
  user,
) => {
  const order = await getOwnOrder(orderId, user);

  if (!order.payment)
    throw {
      statusCode: 400,
      message: "No payment record found for this order.",
    };

  const paymentId = order.payment._id || order.payment;

  // Optional: quick check of WebSocket payload before calling status API
  if (websocketPayload) {
    const parsed = fonepayIntentService.parseWebSocketMessage(
      typeof websocketPayload === "string"
        ? websocketPayload
        : JSON.stringify(websocketPayload),
    );
    if (!parsed.isPaymentSuccess) {
      await Payment.findByIdAndUpdate(paymentId, {
        status: PAYMENT_STATUS_FAILED,
        gatewayResponse: parsed.raw,
      });
      throw {
        statusCode: 400,
        message: "Fonepay payment not successful: " + parsed.message,
      };
    }
  }

  // Authoritative check via Fonepay status API
  const statusData = await fonepayIntentService.checkPaymentStatus({
    referenceLabel,
    terminalId: null, // fonepayIntentService reads from config
  });

  if (statusData.paymentStatus?.toLowerCase() !== "success") {
    await Payment.findByIdAndUpdate(paymentId, {
      status: PAYMENT_STATUS_FAILED,
      gatewayResponse: statusData,
    });
    throw {
      statusCode: 400,
      message: `Fonepay: ${statusData.paymentStatus} — ${statusData.paymentMessage}`,
    };
  }

  // All checks passed — use the shared finalizePayment from orderService
  // This ensures identical invoice generation, order status, fraud guard
  const confirmedOrder = await orderService.finalizePaymentPublic({
    order,
    paymentId,
    method: "fonepay",
    transactionId: String(statusData.fonepayTraceId || referenceLabel),
    gatewayResponse: statusData,
  });

  return {
    success: true,
    message: "Payment confirmed successfully.",
    order: confirmedOrder,
    traceId: statusData.fonepayTraceId,
  };
};

// ── 3. Poll status — fallback if WebSocket doesn't fire ──────────────────────
const checkAndFinalizeIfPaid = async (orderId, referenceLabel, user) => {
  const order = await getOwnOrder(orderId, user);

  if (!order.payment)
    throw { statusCode: 400, message: "No payment record for this order." };

  // Already done — return early (idempotent)
  const existing = await Payment.findById(order.payment._id || order.payment);
  if (existing?.status === PAYMENT_STATUS_COMPLETED)
    return { paymentStatus: "success", alreadyFinalized: true };

  const statusData = await fonepayIntentService.checkPaymentStatus({
    referenceLabel,
  });

  if (statusData.paymentStatus?.toLowerCase() === "success") {
    await verifyAndFinalizePayment(orderId, referenceLabel, null, user);
    return { paymentStatus: "success", message: "Payment finalized." };
  }

  return {
    paymentStatus: statusData.paymentStatus || "pending",
    message: statusData.paymentMessage || "Awaiting payment",
  };
};

export default {
  initiateIntentPayment,
  verifyAndFinalizePayment,
  checkAndFinalizeIfPaid,
};
