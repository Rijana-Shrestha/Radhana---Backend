import mongoose from "mongoose";
import {
  PAYMENT_STATUS_COMPLETED,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
} from "../constants/paymentStatuses.js";

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, "Amount is required."],
  },
  method: {
    type: String,
    required: [true, "Payment method is required."],
    enum: ["cash", "cod", "esewa", "khalti", "bank"],
  },
  status: {
    type: String,
    default: PAYMENT_STATUS_PENDING,
    enum: [
      PAYMENT_STATUS_PENDING,
      PAYMENT_STATUS_COMPLETED,
      PAYMENT_STATUS_FAILED,
    ],
  },
  transactionId: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const model = mongoose.model("Payment", paymentSchema);

export default model;
