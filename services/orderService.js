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

// ── KHALTI: initiate ─────────────────────────────────────────
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

  const khaltiData = await paymentUtil.payViaKhalti({
    amount: order.totalPrice * 100, // convert to paisa
    purchaseOrderId: order._id.toString(),
    purchaseOrderName: order.orderNumber,
    customer: {
      name:
        order.shippingAddress.firstName + " " + order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
    },
  });

  // Store pidx so we can verify later
  await Payment.findByIdAndUpdate(orderPaymentDoc._id, {
    pidx: khaltiData.pidx,
  });

  // Return payment_url so frontend can redirect user
  return {
    payment_url: khaltiData.payment_url,
    pidx: khaltiData.pidx,
    orderId: id,
  };
};

// ── KHALTI: verify after return ──────────────────────────────
const verifyKhaltiPayment = async (pidx, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  // Call Khalti lookup API
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

  // Update payment and order
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

  const { paymentUrl, params } = paymentUtil.initiateFonepay({
    amount: order.totalPrice, // NPR (NOT paisa for Fonepay)
    purchaseOrderId: order.orderNumber,
    purchaseOrderName: order.orderNumber,
  });

  return { paymentUrl, params, orderId: id };
};

// ── FONEPAY: verify callback ──────────────────────────────────
const verifyFonepayPayment = async (callbackParams, orderId, user) => {
  const order = await getOrderById(orderId);
  if (order.user._id.toString() !== user._id.toString())
    throw { statusCode: 403, message: "Access Denied." };

  const { isValid, isSuccess, transactionId } =
    paymentUtil.verifyFonepayPayment(callbackParams);

  if (!isValid)
    throw {
      statusCode: 400,
      message: "Invalid payment signature. Possible tampering detected.",
    };

  if (!isSuccess) {
    await Payment.findByIdAndUpdate(order.payment._id, {
      status: PAYMENT_STATUS_FAILED,
    });
    throw { statusCode: 400, message: "Fonepay payment was not successful." };
  }

  await Payment.findByIdAndUpdate(order.payment._id, {
    status: PAYMENT_STATUS_COMPLETED,
    transactionId,
    fonepayRef: callbackParams.BID,
  });

  return await Order.findByIdAndUpdate(
    orderId,
    { status: ORDER_STATUS_CONFIRMED },
    { new: true },
  );
};

// Legacy confirm (kept for backward compat)
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
