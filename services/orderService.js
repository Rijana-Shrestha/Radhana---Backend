import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import crypto from "crypto";
import paymentUtil from "../utils/payment.js";
import { ORDER_STATUS_CONFIRMED } from "../constants/orderStatus.js";
import {
  PAYMENT_STATUS_COMPLETED,
  PAYMENT_STATUS_FAILED,
} from "../constants/paymentStatuses.js";
import { ADMIN } from "../constants/roles.js";

const getOrders = async () =>
  Order.find()
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment")
    .sort({ createdAt: -1 });

const getOrdersByUser = async (userId) =>
  Order.find({ user: userId })
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment")
    .sort({ createdAt: -1 });

const getOrderById = async (id) => {
  const order = await Order.findById(id)
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment");
  if (!order) throw { statusCode: 404, message: "Order not found." };
  return order;
};

const createOrder = async (data, user) => {
  const orderNumber =
    "RA-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  return await Order.create({ ...data, user: user._id, orderNumber });
};

const updateOrder = async (id, data, user) => {
  const order = await getOrderById(id);
  if (
    order.user._id.toString() !== user._id.toString() &&
    !user.roles.includes(ADMIN)
  )
    throw { statusCode: 403, message: "Access Denied." };
  return await Order.findByIdAndUpdate(
    id,
    { status: data.status },
    { new: true },
  );
};

const deleteOrder = async (id, user) => {
  const order = await getOrderById(id);
  if (
    order.user._id.toString() !== user._id.toString() &&
    !user.roles.includes(ADMIN)
  )
    throw { statusCode: 403, message: "Access Denied." };
  return await Order.findByIdAndDelete(id);
};

// ── SHARED: runs after ANY successful payment (Khalti or Fonepay) ─────────
// 1. Marks Payment as COMPLETED with paidAt timestamp + gateway response
// 2. Confirms the Order
// 3. Auto-generates an Invoice marked "paid" linked to the order
// 4. Prevents double-payment fraud by checking existing payment status
const finalizePayment = async ({
  order,
  paymentId,
  method,
  transactionId,
  gatewayResponse,
}) => {
  // ── Fraud prevention: block double payment ──────────────────
  const existingPayment = await Payment.findById(paymentId);
  if (existingPayment?.status === PAYMENT_STATUS_COMPLETED) {
    throw {
      statusCode: 409,
      message:
        "This payment has already been processed. Possible duplicate request.",
    };
  }

  const paidAt = new Date();

  // ── 1. Update Payment record ────────────────────────────────
  await Payment.findByIdAndUpdate(paymentId, {
    status: PAYMENT_STATUS_COMPLETED,
    transactionId,
    paidAt,
    gatewayResponse, // full gateway response snapshot for audit
  });

  // ── 2. Confirm Order ────────────────────────────────────────
  const confirmedOrder = await Order.findByIdAndUpdate(
    order._id,
    { status: ORDER_STATUS_CONFIRMED },
    { new: true },
  );

  // ── 3. Auto-generate Invoice marked as paid ─────────────────
  // Only create if order doesn't already have an invoice
  if (!order.isInvoiceGenerated) {
    try {
      const prefix = "INV";
      const count = await Invoice.countDocuments({ type: "tax_invoice" });
      const invoiceNumber = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}-${count + 1}`;

      const items = (order.orderItems || []).map((item) => ({
        itemName: item.product?.name || "Product",
        description: "",
        quantity: item.quantity || 1,
        pricePerUnit: item.price || 0,
        amount: (item.quantity || 1) * (item.price || 0),
      }));

      const subTotal = items.reduce((s, i) => s + i.amount, 0);

      const invoice = await Invoice.create({
        invoiceNumber,
        type: "tax_invoice",
        order: order._id,
        billTo: {
          name: `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
          address:
            `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.trim(),
          phone: order.shippingAddress?.phone || "",
          email: order.shippingAddress?.email || "",
        },
        items,
        subTotal,
        taxRate: 0,
        taxAmount: 0,
        discount: 0,
        totalAmount: order.totalPrice,
        receivedAmount: order.totalPrice,
        balanceAmount: 0,
        paymentMethod: method, // "khalti" or "fonepay"
        paymentStatus: "paid", // ✅ marked paid immediately
        paidAt, // exact payment timestamp
        gatewayTransactionId: transactionId, // for cross-referencing gateway dashboard
        notes: `Payment confirmed via ${method.toUpperCase()}. Transaction ID: ${transactionId}`,
      });

      // Link invoice back to order
      await Order.findByIdAndUpdate(order._id, {
        invoice: invoice._id,
        isInvoiceGenerated: true,
      });
    } catch (invoiceErr) {
      // Invoice creation failure should NOT fail the payment — just log it
      console.error(
        "Auto-invoice creation failed (non-blocking):",
        invoiceErr.message,
      );
    }
  }

  return confirmedOrder;
};

// ── KHALTI: Step 1 — Initiate ─────────────────────────────────
const orderPayment = async (id, user) => {
  const order = await getOrderById(id);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  // Prevent re-initiating if already paid
  if (order.payment) {
    const existingPayment = await Payment.findById(order.payment);
    if (existingPayment?.status === PAYMENT_STATUS_COMPLETED)
      throw { statusCode: 409, message: "This order has already been paid." };
  }

  const transactionId = crypto.randomUUID();
  const orderPaymentDoc = await Payment.create({
    amount: order.totalPrice,
    method: "khalti",
    transactionId,
  });

  await Order.findByIdAndUpdate(id, { payment: orderPaymentDoc._id });

  const khaltiData = await paymentUtil.payViaKhalti({
    amount: order.totalPrice * 100, // paisa
    purchaseOrderId: order._id.toString(),
    purchaseOrderName: order.orderNumber,
    customer: {
      name:
        order.shippingAddress.firstName + " " + order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
    },
  });

  await Payment.findByIdAndUpdate(orderPaymentDoc._id, {
    pidx: khaltiData.pidx,
  });

  return {
    payment_url: khaltiData.payment_url,
    pidx: khaltiData.pidx,
    orderId: id,
  };
};

// ── KHALTI: Step 2 — Verify ───────────────────────────────────
const verifyKhaltiPayment = async (pidx, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  const khaltiResponse = await paymentUtil.verifyKhaltiPayment(pidx);

  if (khaltiResponse.status !== "Completed") {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw {
      statusCode: 400,
      message: `Payment ${khaltiResponse.status}. Please try again.`,
    };
  }

  return await finalizePayment({
    order,
    paymentId: order.payment._id,
    method: "khalti",
    transactionId: khaltiResponse.transaction_id,
    gatewayResponse: khaltiResponse, // full Khalti lookup response saved
  });
};

// ── FONEPAY: Step 1 — Initiate ────────────────────────────────
const orderPaymentFonepay = async (id, user) => {
  const order = await getOrderById(id);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  // Prevent re-initiating if already paid
  if (order.payment) {
    const existingPayment = await Payment.findById(order.payment);
    if (existingPayment?.status === PAYMENT_STATUS_COMPLETED)
      throw { statusCode: 409, message: "This order has already been paid." };
  }

  const transactionId = crypto.randomUUID();
  const orderPaymentDoc = await Payment.create({
    amount: order.totalPrice,
    method: "fonepay",
    transactionId,
  });

  await Order.findByIdAndUpdate(id, { payment: orderPaymentDoc._id });

  const prn = `FP-${id}-${Date.now()}`;
  const { paymentUrl } = paymentUtil.initiateFonepay({
    amount: order.totalPrice,
    purchaseOrderId: prn,
    purchaseOrderName: order.orderNumber,
    remarks1: order.orderNumber,
    remarks2: "Radhana Art",
  });

  await Payment.findByIdAndUpdate(orderPaymentDoc._id, { transactionId: prn });

  return { paymentUrl, prn, orderId: id };
};

// ── FONEPAY: Step 2 — Verify ──────────────────────────────────
const verifyFonepayPayment = async (callbackParams, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  // Validate callback signature
  let isSuccess;
  try {
    isSuccess = paymentUtil.validateFonepayCallback(callbackParams);
  } catch (err) {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw err;
  }

  if (!isSuccess) {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw {
      statusCode: 400,
      message: "Fonepay payment was not successful. RC: " + callbackParams.RC,
    };
  }

  // Final verification via verificationMerchant API
  const verification =
    await paymentUtil.verifyFonepayWebPayment(callbackParams);
  if (!verification.success) {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw {
      statusCode: 400,
      message: "Fonepay payment verification failed: " + verification.message,
    };
  }

  return await finalizePayment({
    order,
    paymentId: order.payment._id,
    method: "fonepay",
    transactionId: callbackParams.UID || callbackParams.PRN,
    gatewayResponse: { ...callbackParams, verification }, // full callback + verification saved
  });
};

const confirmOrderPayment = async (id, status, user) => {
  const order = await getOrderById(id);
  if (
    order.user._id.toString() !== user._id.toString() &&
    !user.roles.includes(ADMIN)
  )
    throw { statusCode: 403, message: "Access Denied." };

  if (!status || status.toUpperCase() !== PAYMENT_STATUS_COMPLETED) {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw { statusCode: 400, message: "Payment failed." };
  }

  await Payment.findByIdAndUpdate(order.payment._id, {
    status: PAYMENT_STATUS_COMPLETED,
  });
  return await Order.findByIdAndUpdate(
    id,
    { status: ORDER_STATUS_CONFIRMED },
    { new: true },
  );
};

export default {
  getOrders,
  getOrdersByUser,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  orderPayment,
  verifyKhaltiPayment,
  orderPaymentFonepay,
  verifyFonepayPayment,
  confirmOrderPayment,
};
