import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  pricePerUnit: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true }, // quantity * pricePerUnit
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["tax_invoice", "quotation"],
    default: "tax_invoice",
  },
  // Linked order (optional — null for manual/offline invoices)
  order: {
    type: mongoose.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  // Bill To
  billTo: {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    pan: { type: String, default: "" }, // PAN of buyer (optional)
  },
  items: {
    type: [invoiceItemSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: "At least one item is required.",
    },
  },
  // Computed totals (stored for quick retrieval)
  subTotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 }, // percentage e.g. 13 for 13% VAT
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 }, // flat discount in Rs
  totalAmount: { type: Number, required: true },
  receivedAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },

  // Payment
  paymentMethod: {
    type: String,
    enum: ["cash", "esewa", "khalti", "bank", "cod", ""],
    default: "",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },

  // Quotation-specific validity date
  validUntil: { type: Date, default: null },

  notes: { type: String, default: "Thank you for doing business with us." },
  termsAndConditions: { type: String, default: "" },

  // Who created
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
