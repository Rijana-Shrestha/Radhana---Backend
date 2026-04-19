import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
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

// ── KHALTI: Step 1 — Initiate payment ────────────────────────
// Per Khalti docs:
// - POST to /epayment/initiate/ with amount in PAISA
// - Returns { pidx, payment_url } → redirect user to payment_url
// - Khalti redirects user back to return_url with pidx, purchase_order_id, status
const orderPayment = async (id, user) => {
  const order = await getOrderById(id);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  const transactionId = crypto.randomUUID();

  const orderPaymentDoc = await Payment.create({
    amount: order.totalPrice,
    method: "khalti",
    transactionId,
  });

  await Order.findByIdAndUpdate(id, { payment: orderPaymentDoc._id });

  // amount * 100 converts NPR to paisa as required by Khalti docs
  const khaltiData = await paymentUtil.payViaKhalti({
    amount: order.totalPrice * 100,
    purchaseOrderId: order._id.toString(),
    purchaseOrderName: order.orderNumber,
    customer: {
      name:
        order.shippingAddress.firstName + " " + order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
    },
  });

  // Save pidx for later lookup verification
  await Payment.findByIdAndUpdate(orderPaymentDoc._id, {
    pidx: khaltiData.pidx,
  });

  return {
    payment_url: khaltiData.payment_url, // frontend redirects user here
    pidx: khaltiData.pidx,
    orderId: id,
  };
};

// ── KHALTI: Step 2 — Verify payment via Lookup API ───────────
// Per Khalti docs:
// - POST to /epayment/lookup/ with { pidx }
// - ONLY status "Completed" means success — all others are failures
// - Called by frontend's /payment/verify page after Khalti callback
const verifyKhaltiPayment = async (pidx, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  const khaltiResponse = await paymentUtil.verifyKhaltiPayment(pidx);

  // Per docs: ONLY "Completed" = success. Pending/Expired/Canceled/Refunded = fail
  if (khaltiResponse.status !== "Completed") {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw {
      statusCode: 400,
      message: `Payment ${khaltiResponse.status}. Please try again.`,
    };
  }

  await Payment.findByIdAndUpdate(order.payment._id, {
    status: PAYMENT_STATUS_COMPLETED,
    transactionId: khaltiResponse.transaction_id,
    pidx,
  });

  return await Order.findByIdAndUpdate(
    orderId,
    { status: ORDER_STATUS_CONFIRMED },
    { new: true },
  );
};

// ── FONEPAY: initiate ─────────────────────────────────────────
// ── FONEPAY: Step 1 — Initiate web payment ───────────────────
// PRN (payment reference number) encodes the orderId so we can look it up
// after Fonepay redirects back. Format: FP-{orderId}-{timestamp}
const orderPaymentFonepay = async (id, user) => {
  const order = await getOrderById(id);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  const transactionId = crypto.randomUUID();

  const orderPaymentDoc = await Payment.create({
    amount: order.totalPrice,
    method: "fonepay",
    transactionId,
  });

  await Order.findByIdAndUpdate(id, { payment: orderPaymentDoc._id });

  // PRN encodes orderId so frontend can retrieve it from Fonepay callback
  const prn = `FP-${id}-${Date.now()}`;

  const { paymentUrl } = paymentUtil.initiateFonepay({
    amount: order.totalPrice, // NPR (not paisa)
    purchaseOrderId: prn,
    purchaseOrderName: order.orderNumber,
    remarks1: order.orderNumber,
    remarks2: "Radhana Art",
  });

  // Save PRN to payment doc so we can match on callback
  await Payment.findByIdAndUpdate(orderPaymentDoc._id, { transactionId: prn });

  return { paymentUrl, prn, orderId: id };
};

// ── FONEPAY: Step 2 — Verify callback ────────────────────────
// Fonepay calls the return URL with: PRN, PID, PS, RC, UID, BC, INI, P_AMT, R_AMT, DV
// 1. Validate response DV signature
// 2. Extract orderId from PRN (format: FP-{orderId}-{timestamp})
// 3. Call verificationMerchant API for final confirmation
const verifyFonepayPayment = async (callbackParams, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  // Step 1: Validate callback signature
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

  // Step 2: Call verificationMerchant API for final confirmation
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

  // Step 3: Mark payment and order as completed
  await Payment.findByIdAndUpdate(order.payment._id, {
    status: PAYMENT_STATUS_COMPLETED,
    transactionId:
      callbackParams.UID || callbackParams.BID || callbackParams.PRN,
    fonepayRef: callbackParams.UID,
  });

  return await Order.findByIdAndUpdate(
    orderId,
    { status: ORDER_STATUS_CONFIRMED },
    { new: true },
  );
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
