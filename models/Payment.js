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
    enum: ["cash", "cod", "esewa", "khalti", "fonepay", "bank"],
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
  transactionId: { type: String, default: "" },
  // Khalti specific
  pidx: { type: String, default: "" },
  // Fonepay specific
  fonepayRef: { type: String, default: "" },
  // Fraud prevention: exact timestamp payment was confirmed by gateway
  paidAt: { type: Date, default: null },
  // Gateway response snapshot for audit trail
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", paymentSchema);
