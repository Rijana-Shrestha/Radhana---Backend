import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";

// ── helpers ──────────────────────────────────────────────────────────────────
const generateInvoiceNumber = async (type) => {
  const prefix = type === "quotation" ? "QT" : "INV";
  const count = await Invoice.countDocuments({ type });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

const computeTotals = (
  items,
  taxRate = 0,
  discount = 0,
  receivedAmount = 0,
) => {
  const subTotal = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  const taxAmount = Math.round((subTotal * taxRate) / 100);
  const totalAmount = subTotal + taxAmount - discount;
  const balanceAmount = totalAmount - receivedAmount;
  return { subTotal, taxAmount, totalAmount, balanceAmount };
};

// ── service methods ───────────────────────────────────────────────────────────

const getInvoices = async ({ type } = {}) => {
  const query = type ? { type } : {};
  return Invoice.find(query)
    .populate("order", "orderNumber totalPrice")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });
};

const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id)
    .populate("order")
    .populate("createdBy", "name email");
  if (!invoice) {
    const err = new Error("Invoice not found.");
    err.statusCode = 404;
    throw err;
  }
  return invoice;
};

/**
 * Prefill invoice data from an existing order.
 * Returns a draft object (not saved) that the frontend can review & submit.
 */
const getInvoiceDraftFromOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate(
    "orderItems.product",
    "name price",
  );
  if (!order) {
    const err = new Error("Order not found.");
    err.statusCode = 404;
    throw err;
  }

  const items = (order.orderItems || []).map((oi) => ({
    itemName: oi.product?.name || "Unknown Product",
    description: "",
    quantity: oi.quantity || 1,
    pricePerUnit: oi.price,
    amount: (oi.quantity || 1) * oi.price,
  }));

  const billTo = {
    name: `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
    address:
      `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`
        .trim()
        .replace(/^,\s*/, ""),
    phone: order.shippingAddress?.phone || "",
    email: order.shippingAddress?.email || "",
    pan: "",
  };

  return {
    order: orderId,
    billTo,
    items,
    paymentMethod: order.paymentMethod || "",
    subTotal: order.totalPrice,
  };
};

const createInvoice = async (data, user) => {
  const {
    type = "tax_invoice",
    orderId,
    billTo,
    items,
    taxRate = 0,
    discount = 0,
    receivedAmount = 0,
    paymentMethod = "",
    validUntil = null,
    notes,
    termsAndConditions,
    invoiceDate,
  } = data;

  // Compute amounts
  const mappedItems = items.map((i) => ({
    ...i,
    amount: i.quantity * i.pricePerUnit,
  }));
  const { subTotal, taxAmount, totalAmount, balanceAmount } = computeTotals(
    mappedItems,
    taxRate,
    discount,
    receivedAmount,
  );

  const paymentStatus =
    receivedAmount <= 0
      ? "unpaid"
      : receivedAmount >= totalAmount
        ? "paid"
        : "partial";

  const invoiceNumber = await generateInvoiceNumber(type);

  const invoice = await Invoice.create({
    invoiceNumber,
    type,
    order: orderId || null,
    billTo,
    items: mappedItems,
    subTotal,
    taxRate,
    taxAmount,
    discount,
    totalAmount,
    receivedAmount,
    balanceAmount,
    paymentMethod,
    paymentStatus,
    validUntil: validUntil || null,
    notes,
    termsAndConditions,
    invoiceDate: invoiceDate || new Date(),
    createdBy: user._id,
  });

  // Update the order's isInvoiceGenerated flag if an orderId was provided
  if (orderId) {
    await Order.findByIdAndUpdate(
      orderId,
      { isInvoiceGenerated: true, invoice: invoice._id },
      { new: true },
    );
  }

  return invoice;
};

const updateInvoice = async (id, data, user) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    const err = new Error("Invoice not found.");
    err.statusCode = 404;
    throw err;
  }

  const {
    items,
    taxRate = invoice.taxRate,
    discount = invoice.discount,
    receivedAmount = invoice.receivedAmount,
  } = data;

  if (items) {
    const mappedItems = items.map((i) => ({
      ...i,
      amount: i.quantity * i.pricePerUnit,
    }));
    const { subTotal, taxAmount, totalAmount, balanceAmount } = computeTotals(
      mappedItems,
      taxRate,
      discount,
      receivedAmount,
    );
    data.items = mappedItems;
    data.subTotal = subTotal;
    data.taxAmount = taxAmount;
    data.totalAmount = totalAmount;
    data.balanceAmount = balanceAmount;
    data.paymentStatus =
      receivedAmount <= 0
        ? "unpaid"
        : receivedAmount >= totalAmount
          ? "paid"
          : "partial";
  }

  Object.assign(invoice, data);
  await invoice.save();
  return invoice;
};

const deleteInvoice = async (id) => {
  const invoice = await Invoice.findByIdAndDelete(id);
  if (!invoice) {
    const err = new Error("Invoice not found.");
    err.statusCode = 404;
    throw err;
  }

  // Reset the order's isInvoiceGenerated flag if this invoice was linked to an order
  if (invoice.order) {
    await Order.findByIdAndUpdate(
      invoice.order,
      { isInvoiceGenerated: false, invoice: null },
      { new: true },
    );
  }

  return invoice;
};

export default {
  getInvoices,
  getInvoiceById,
  getInvoiceDraftFromOrder,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};
