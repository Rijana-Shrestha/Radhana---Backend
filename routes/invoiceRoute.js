import express from "express";
import invoiceController from "../controllers/invoiceController.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";

const router = express.Router();

// All routes already have auth applied globally in app.js

// Admin: get all invoices (optionally filter ?type=tax_invoice|quotation)
router.get("/", roleBasedAuth(ADMIN), invoiceController.getInvoices);

// Admin: get prefilled draft from order (not saved)
router.get(
  "/draft/:orderId",
  roleBasedAuth(ADMIN),
  invoiceController.getInvoiceDraftFromOrder,
);

// Admin: get single invoice
router.get("/:id", roleBasedAuth(ADMIN), invoiceController.getInvoiceById);

// Admin: create invoice or quotation
router.post("/", roleBasedAuth(ADMIN), invoiceController.createInvoice);

// Admin: update invoice
router.patch("/:id", roleBasedAuth(ADMIN), invoiceController.updateInvoice);

// Admin: delete invoice
router.delete("/:id", roleBasedAuth(ADMIN), invoiceController.deleteInvoice);

export default router;
