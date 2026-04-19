import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  pricePerUnit: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["tax_invoice", "quotation"],
    default: "tax_invoice",
  },
  order: { type: mongoose.Types.ObjectId, ref: "Order", default: null },
  billTo: {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    pan: { type: String, default: "" },
  },
  items: {
    type: [invoiceItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: "At least one item is required.",
    },
  },
  subTotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  receivedAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },

  paymentMethod: {
    type: String,
    // Added fonepay
    enum: ["cash", "esewa", "khalti", "fonepay", "bank", "cod", ""],
    default: "",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },
  // Exact timestamp payment was confirmed — for fraud detection & analytics
  paidAt: { type: Date, default: null },
  // Gateway transaction ID for cross-referencing with Khalti/Fonepay dashboards
  gatewayTransactionId: { type: String, default: "" },

  validUntil: { type: Date, default: null },
  notes: { type: String, default: "Thank you for doing business with us." },
  termsAndConditions: { type: String, default: "" },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  invoiceDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
