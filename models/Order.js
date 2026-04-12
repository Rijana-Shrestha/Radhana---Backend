import mongoose from "mongoose";
import {
  ORDER_STATUS_CONFIRMED,
  ORDER_STATUS_DELIVERED,
  ORDER_STATUS_PENDING,
  ORDER_STATUS_SHIPPED,
} from "../constants/orderStatus.js";

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: [true, "Order tracking number is required."],
    unique: true,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "User id is required."],
  },
  orderItems: [
    {
      product: {
        type: mongoose.Types.ObjectId,
        ref: "Product",
        required: [true, "Product id is required."],
      },
      quantity: { type: Number, default: 1 },
      price: { type: Number, required: true }, // price snapshot at order time
    },
  ],
  status: {
    type: String,
    default: ORDER_STATUS_PENDING,
    enum: [
      ORDER_STATUS_PENDING,
      ORDER_STATUS_CONFIRMED,
      ORDER_STATUS_SHIPPED,
      ORDER_STATUS_DELIVERED,
    ],
  },
  totalPrice: {
    type: Number,
    required: [true, "Total price is required."],
  },
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    landmark: { type: String, default: "" },
    country: { type: String, default: "Nepal" },
  },
  // Radhana Art specific — design file uploaded by customer
  designFileUrl: {
    type: String,
    default: "",
  },
  // Customer notes / special instructions
  orderNotes: {
    type: String,
    default: "",
  },
  // Payment method chosen at checkout
  paymentMethod: {
    type: String,
    enum: ["esewa", "khalti", "bank", "cod", "cash"],
    default: "cod",
  },
  payment: {
    type: mongoose.Types.ObjectId,
    ref: "Payment",
  },
  invoice: {
  type: mongoose.Types.ObjectId,
  ref: "Invoice",
  default: null,
},
  isInvoiceGenerated: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const model = mongoose.model("Order", orderSchema);

export default model;
