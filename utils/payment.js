import axios from "axios";
import config from "../config/config.js";
import crypto from "crypto";

// ── KHALTI ────────────────────────────────────────────────────
// Docs: https://docs.khalti.com/khalti-epayment/
//
// Flow:
// 1. POST /epayment/initiate/ → get { pidx, payment_url }
// 2. Redirect user to payment_url (https://pay.khalti.com/?pidx=...)
// 3. Khalti redirects user back to return_url with:
//    ?pidx=...&purchase_order_id=...&status=Completed&transaction_id=...
// 4. Frontend receives callback, calls your backend verify endpoint
// 5. Backend POST /epayment/lookup/ with { pidx } to confirm status === "Completed"

const payViaKhalti = async (data) => {
  if (!data?.amount) throw { message: "Payment amount is required." };
  if (!data?.purchaseOrderId)
    throw { message: "Purchase order id is required." };
  if (!data?.purchaseOrderName)
    throw { message: "Purchase order name is required." };
  if (!config.khalti.apiKey)
    throw {
      statusCode: 500,
      message:
        "Khalti API key not configured. Please set KHALTI_API_KEY in environment variables.",
    };

  const body = {
    // Per docs: return_url is where Khalti redirects the user's BROWSER after payment
    // Must be the frontend /payment/verify page (not backend)
    return_url: config.khalti.returnUrl,
    // Per docs: website_url is your merchant website (frontend)
    website_url: config.frontendUrl,
    // Per docs: amount MUST be in paisa (NPR × 100)
    amount: Math.round(data.amount), // already in paisa from orderService
    purchase_order_id: data.purchaseOrderId,
    purchase_order_name: data.purchaseOrderName,
    customer_info: {
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
    },
  };

  try {
    const response = await axios.post(
      `${config.khalti.apiUrl}/epayment/initiate/`,
      body,
      {
        headers: {
          // Per docs: Authorization header format is "Key <live_secret_key>"
          Authorization: `Key ${config.khalti.apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    // Returns: { pidx, payment_url, expires_at, expires_in }
    return response.data;
  } catch (err) {
    const msg = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    throw { statusCode: 500, message: `Khalti initiate failed: ${msg}` };
  }
};

// Lookup API — verify payment status after callback
// Per docs: POST /epayment/lookup/ with { pidx }
// Only treat status "Completed" as success
const verifyKhaltiPayment = async (pidx) => {
  if (!config.khalti.apiKey)
    throw {
      statusCode: 500,
      message: "Khalti API key not configured.",
    };

  try {
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
    // status: "Completed" | "Pending" | "Initiated" | "Expired" | "User canceled" | "Refunded"
    return response.data;
  } catch (err) {
    const msg = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    throw { statusCode: 500, message: `Khalti lookup failed: ${msg}` };
  }
};

// ── FONEPAY ───────────────────────────────────────────────────
const generateFonepaySignature = (params) => {
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
  ].join("/");

  const params = {
    PID: config.fonepay.merchantId,
    MD: "P",
    PRN: data.purchaseOrderId,
    AMT: data.amount.toFixed(2),
    CRN: "NPR",
    DT,
    R1: data.purchaseOrderName,
    R2: "NA",
    RU: config.fonepay.returnUrl,
  };

  params.DV = generateFonepaySignature(params);

  const query = new URLSearchParams(params).toString();
  const paymentUrl = `${config.fonepay.apiUrl}?${query}`;

  return { paymentUrl, params };
};

const verifyFonepayPayment = (callbackParams) => {
  const { PRN, BID, AMT, UID, RC, DV } = callbackParams;

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
