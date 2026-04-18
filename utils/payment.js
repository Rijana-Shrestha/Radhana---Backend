import axios from "axios";
import config from "../config/config.js";
import crypto from "crypto";

// ── KHALTI ────────────────────────────────────────────────────
const payViaKhalti = async (data) => {
  if (!data?.amount) throw { message: "Payment amount is required." };
  if (!data?.purchaseOrderId)
    throw { message: "Purchase order id is required." };
  if (!data?.purchaseOrderName)
    throw { message: "Purchase order name is required." };

  const body = {
    return_url: config.khalti.returnUrl,
    website_url: config.appUrl,
    amount: data.amount, // in paisa
    purchase_order_id: data.purchaseOrderId,
    purchase_order_name: data.purchaseOrderName,
    customer_info: {
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
    },
  };

  const response = await axios.post(
    `${config.khalti.apiUrl}/epayment/initiate/`,
    body,
    {
      headers: {
        Authorization: `Key ${config.khalti.apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  // Returns: { pidx, payment_url, expires_at, expires_in, user_fee }
  return response.data;
};

// Verify a completed Khalti payment (call after user returns)
const verifyKhaltiPayment = async (pidx) => {
  const response = await axios.post(
    `${config.khalti.apiUrl}/epayment/lookup/`,
    { pidx },
    {
      headers: {
        Authorization: `Key ${config.khalti.apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  // Returns: { pidx, total_amount, status, transaction_id, fee, refunded }
  // status: "Completed" | "Pending" | "Expired" | "User canceled"
  return response.data;
};

// ── FONEPAY ───────────────────────────────────────────────────
// Fonepay uses HMAC-SHA512 signed requests
const generateFonepaySignature = (params) => {
  // Fonepay signature fields in exact order from their docs
  const signatureString = [
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU,
  ].join(",");

  return crypto
    .createHmac("sha512", config.fonepay.secretKey)
    .update(signatureString)
    .digest("hex")
    .toUpperCase();
};

const initiateFonepay = (data) => {
  const date = new Date();
  const DT = [
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    date.getFullYear(),
  ].join("/"); // MM/DD/YYYY

  const params = {
    PID: config.fonepay.merchantId, // Merchant ID from Fonepay
    MD: "P", // P = Production, T = Test
    PRN: data.purchaseOrderId, // Unique order reference
    AMT: data.amount.toFixed(2), // Amount in NPR (NOT paisa)
    CRN: "NPR",
    DT,
    R1: data.purchaseOrderName, // Product description
    R2: "NA",
    RU: config.fonepay.returnUrl, // Return URL
  };

  params.DV = generateFonepaySignature(params); // signature

  // Build query string for redirect
  const query = new URLSearchParams(params).toString();
  const paymentUrl = `${config.fonepay.apiUrl}?${query}`;

  return { paymentUrl, params };
};

const verifyFonepayPayment = (callbackParams) => {
  const { PRN, BID, AMT, UID, RC, DV } = callbackParams;

  // Rebuild signature for verification
  const signatureString = [
    config.fonepay.merchantId,
    PRN,
    BID,
    AMT,
    UID,
    RC,
  ].join(",");

  const expectedDV = crypto
    .createHmac("sha512", config.fonepay.secretKey)
    .update(signatureString)
    .digest("hex")
    .toUpperCase();

  const isValid = expectedDV === DV;
  const isSuccess = RC === "successful";

  return { isValid, isSuccess, transactionId: BID, referenceId: UID };
};

export default {
  payViaKhalti,
  verifyKhaltiPayment,
  initiateFonepay,
  verifyFonepayPayment,
};
