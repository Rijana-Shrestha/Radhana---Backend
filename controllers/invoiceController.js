import invoiceService from "../services/invoiceService.js";

const getInvoices = async (req, res) => {
  try {
    const { type } = req.query; // optional ?type=tax_invoice or ?type=quotation
    const data = await invoiceService.getInvoices({ type });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const data = await invoiceService.getInvoiceById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * GET /api/invoices/draft/:orderId
 * Returns prefilled invoice data from an order — not saved to DB.
 */
const getInvoiceDraftFromOrder = async (req, res) => {
  try {
    const data = await invoiceService.getInvoiceDraftFromOrder(
      req.params.orderId,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const data = await invoiceService.createInvoice(req.body, req.user);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const data = await invoiceService.updateInvoice(
      req.params.id,
      req.body,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    await invoiceService.deleteInvoice(req.params.id);
    res.json({ message: "Invoice deleted successfully." });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export default {
  getInvoices,
  getInvoiceById,
  getInvoiceDraftFromOrder,
  createInvoice,
  updateInvoice,
  deleteInvoice,
};
