import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import crypto from "crypto";
import payment from "../utils/payment.js";
import { ORDER_STATUS_CONFIRMED } from "../constants/orderStatus.js";
import { PAYMENT_STATUS_COMPLETED } from "../constants/paymentStatuses.js";
import { ADMIN } from "../constants/roles.js";

const getOrders = async () => {
  return await Order.find()
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment")
    .sort({ createdAt: -1 });
};

const getOrdersByUser = async (userId) => {
  return await Order.find({ user: userId })
    .populate("orderItems.product")
    .populate("user", ["name", "email", "phone", "address"])
    .populate("payment")
    .sort({ createdAt: -1 });
};

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
  return await Order.create({
    ...data,
    user: user._id,
    orderNumber,
  });
};

const updateOrder = async (id, data, user) => {
  const order = await getOrderById(id);

  const isOwner = order.user._id.toString() === user._id.toString();
  const isAdmin = user.roles.includes(ADMIN);

  if (!isOwner && !isAdmin)
    throw { statusCode: 403, message: "Access Denied." };

  return await Order.findByIdAndUpdate(
    id,
    { status: data.status },
    { new: true },
  );
};

const deleteOrder = async (id, user) => {
  const order = await getOrderById(id);

  const isOwner = order.user._id.toString() === user._id.toString();
  const isAdmin = user.roles.includes(ADMIN);

  if (!isOwner && !isAdmin)
    throw { statusCode: 403, message: "Access Denied." };

  return await Order.findByIdAndDelete(id);
};

// Khalti payment initiation
const orderPayment = async (id, user) => {
  const order = await getOrderById(id);

  if (order.user._id.toString() !== user._id.toString()) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  const transactionId = crypto.randomUUID();

  const orderPayment = await Payment.create({
    amount: order.totalPrice,
    method: "khalti",
    transactionId,
  });

  await Order.findByIdAndUpdate(id, { payment: orderPayment._id });

  return await payment.payViaKhalti({
    amount: order.totalPrice * 100, // Khalti expects paisa
    purchaseOrderId: order._id.toString(),
    purchaseOrderName: order.orderNumber,
    customer: {
      name:
        order.shippingAddress.firstName + " " + order.shippingAddress.lastName,
      email: order.shippingAddress.email,
      phone: order.shippingAddress.phone,
    },
  });
};

const confirmOrderPayment = async (id, status, user) => {
  const order = await getOrderById(id);

  const isOwner = order.user._id.toString() === user._id.toString();
  const isAdmin = user.roles.includes(ADMIN);

  if (!isOwner && !isAdmin)
    throw { statusCode: 403, message: "Access Denied." };

  if (!status || status.toUpperCase() !== PAYMENT_STATUS_COMPLETED) {
    await Payment.findByIdAndUpdate(order.payment._id, { status: "FAILED" });
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
  confirmOrderPayment,
};
