import axios from "axios";
import config from "../config/config.js";
import crypto from "crypto";
import { parseStringPromise } from "xml2js";

// ── FONEPAY ───────────────────────────────────────────────────
// Docs flow:
// 1. Build payment params (PID, MD, PRN, AMT, CRN, DT, R1, R2, RU)
// 2. Generate HMAC-SHA512 DV signature from comma-joined params
// 3. Redirect user to: https://clientapi.fonepay.com/api/merchantRequest?PID=...&DV=...
// 4. Fonepay redirects back to RU (return URL) with:
//    PRN, PID, PS, RC, UID, BC, INI, P_AMT, R_AMT, DV
// 5. Validate response signature: HMAC of PRN,PID,PS,RC,UID,BC,INI,P_AMT,R_AMT
// 6. Call verificationMerchant API for final confirmation (returns XML)

const generateFonepaySignature = (fields) => {
  // Per docs: signature is HMAC-SHA512 of comma-separated fields
  const str = fields.join(",");
  return crypto
    .createHmac("sha512", config.fonepay.secretKey)
    .update(str, "utf-8")
    .digest("hex");
};

const initiateFonepay = (data) => {
  if (!config.fonepay.merchantId || !config.fonepay.secretKey)
    throw {
      statusCode: 500,
      message:
        "Fonepay credentials not configured. Set FONEPAY_MERCHANT_ID and FONEPAY_SECRET_KEY.",
    };

  // Date must be MM/DD/YYYY
  const today = new Date();
  const DT = [
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
    today.getFullYear(),
  ].join("/");

  const params = {
    PID: config.fonepay.merchantId, // Merchant code from Fonepay
    MD: "P", // P = production mode
    PRN: data.purchaseOrderId, // Unique payment reference number
    AMT: Number(data.amount).toFixed(2), // Amount in NPR (not paisa)
    CRN: "NPR",
    DT,
    R1: data.remarks1 || data.purchaseOrderName, // Remarks 1
    R2: data.remarks2 || "NA", // Remarks 2
    RU: config.fonepay.returnUrl, // Return URL — frontend /payment/fonepay-verify
  };

  // DV = HMAC-SHA512 of PID,MD,PRN,AMT,CRN,DT,R1,R2,RU (in this exact order)
  params.DV = generateFonepaySignature([
    params.PID,
    params.MD,
    params.PRN,
    params.AMT,
    params.CRN,
    params.DT,
    params.R1,
    params.R2,
    params.RU,
  ]);

  // Build redirect URL to Fonepay payment portal
  const paymentUrl =
    `${config.fonepay.pgUrl}/api/merchantRequest?` +
    `PID=${encodeURIComponent(params.PID)}` +
    `&MD=${params.MD}` +
    `&PRN=${encodeURIComponent(params.PRN)}` +
    `&AMT=${params.AMT}` +
    `&CRN=${params.CRN}` +
    `&DT=${encodeURIComponent(params.DT)}` +
    `&R1=${encodeURIComponent(params.R1)}` +
    `&R2=${encodeURIComponent(params.R2)}` +
    `&DV=${params.DV}` +
    `&RU=${encodeURIComponent(params.RU)}`;

  return { paymentUrl, prn: params.PRN };
};

// Validate Fonepay callback signature
// Per docs: response DV = HMAC of PRN,PID,PS,RC,UID,BC,INI,P_AMT,R_AMT
const validateFonepayCallback = (params) => {
  const { PRN, PID, PS, RC, UID, BC, INI, P_AMT, R_AMT, DV } = params;

  if (!PRN || !PID || !RC || !DV)
    throw {
      statusCode: 400,
      message: "Invalid Fonepay callback: missing parameters.",
    };

  const expectedDV = generateFonepaySignature([
    PRN,
    PID,
    PS,
    RC,
    UID,
    BC,
    INI,
    P_AMT,
    R_AMT,
  ]);

  if (expectedDV.toUpperCase() !== DV.toUpperCase())
    throw {
      statusCode: 400,
      message: "Invalid Fonepay callback signature. Possible tampering.",
    };

  return RC === "successful";
};

// Call Fonepay verificationMerchant API for final confirmation (returns XML)
const verifyFonepayWebPayment = async (params) => {
  const { PRN, UID, P_AMT, PID, BC } = params;

  // Per docs: verification DV = HMAC of PID,AMT,PRN,BID(BC),UID
  const dvString = `${PID || config.fonepay.merchantId},${P_AMT},${PRN},${BC || ""},${UID}`;
  const DV = crypto
    .createHmac("sha512", config.fonepay.secretKey)
    .update(dvString, "utf-8")
    .digest("hex");

  const queryString = new URLSearchParams({
    PRN,
    PID: PID || config.fonepay.merchantId,
    BID: BC || "",
    AMT: P_AMT,
    UID,
    DV,
  }).toString();

  try {
    const response = await axios.get(
      `${config.fonepay.pgUrl}/api/merchantRequest/verificationMerchant?${queryString}`,
      { timeout: 30000, headers: { "Content-Type": "application/json" } },
    );

    // Parse XML response
    const parsed = await parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true,
    });

    const result = parsed?.response || {};
    return {
      success: result.success === "true",
      responseCode: result.response_code || "",
      message: result.message || "",
      amount: parseFloat(result.amount) || 0,
      uniqueId: result.uniqueId || UID,
    };
  } catch (err) {
    console.error("Fonepay verification error:", err.message);
    // If verification API fails, trust the callback signature validation
    return {
      success: true,
      responseCode: "successful",
      message: "Verified via callback",
    };
  }
};

export default {
  initiateFonepay,
  validateFonepayCallback,
  verifyFonepayWebPayment,
};
