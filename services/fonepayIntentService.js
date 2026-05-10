/**
 * services/fonepayIntentService.js
 *
 * Fonepay Intent / Dynamic QR — V1.9
 *
 * CORRECT URLs (from Postman collection — these differ from the PDF!):
 *   UAT base : https://dev-external-gateway-new.fonepay.com/merchantThirdparty
 *   basePath : /api/merchant/third-party/v2
 *   Login    : POST {base}{path}/login
 *   Banks    : GET  {base}{path}/banks/list
 *   Gen QR   : POST {base}{path}/generate-intent-qr
 *   Status   : POST {base}{path}/thirdPartyDynamicQrGetStatus
 *
 * Signature: RSA-SHA1, sign the raw JSON body string, Base64-encode result.
 */

import axios from "axios";
import crypto from "crypto";
import config from "../config/config.js";

// ── In-memory caches ─────────────────────────────────────────────────────────
let _tokenCache = { token: null, expiresAt: 0 };
let _bankCache = { banks: null, cachedAt: 0 };
const BANK_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 min (refresh before expiry)

// ── Base URL builder ─────────────────────────────────────────────────────────
const base = () =>
  `${config.fonepayIntent.baseUrl}${config.fonepayIntent.basePath}`;

// ── RSA-SHA1 signature ───────────────────────────────────────────────────────
// Sign the entire raw JSON body string.
// PEM newlines may be lost in env vars — restore them if needed.
const sign = (payloadString) => {
  const key = config.fonepayIntent.privateKey;
  if (!key) throw new Error("FONEPAY_INTENT_PRIVATE_KEY is not set");

  // Restore newlines if the key was stored with escaped \n in env
  let pem = key.replace(/\\n/g, "\n");

  // If no PEM header, wrap it
  if (!pem.includes("-----BEGIN")) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
  }

  const signer = crypto.createSign("RSA-SHA1");
  signer.update(payloadString, "utf8");
  return signer.sign(pem, "base64");
};

// ── Basic Auth header for login ──────────────────────────────────────────────
const basicAuth = () => {
  const { username, password } = config.fonepayIntent;
  if (!username || !password)
    throw new Error(
      "FONEPAY_INTENT_USERNAME or FONEPAY_INTENT_PASSWORD not set",
    );
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
};

// ── 1. oAuth Login ────────────────────────────────────────────────────────────
const getAccessToken = async () => {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt)
    return _tokenCache.token;

  const { username, password } = config.fonepayIntent;
  const body = { username, password };
  const payload = JSON.stringify(body);

  const res = await axios.post(`${base()}/login`, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(),
      signature: sign(payload),
    },
    timeout: 15000,
  });

  const token = res.data?.accessToken;
  if (!token) throw new Error("Fonepay login: no accessToken in response");

  _tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  console.log("[FonepayIntent] Token refreshed");
  return token;
};

// ── 2. Get Bank List ──────────────────────────────────────────────────────────
const getBankList = async (customerMobile = "") => {
  if (_bankCache.banks && Date.now() - _bankCache.cachedAt < BANK_CACHE_TTL_MS)
    return _bankCache.banks;

  const token = await getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    Authorization: token, // Fonepay returns token with "Bearer " prefix already
    signature: sign(""), // GET has no body — sign empty string
    paymentMode: "INTENT",
  };
  if (customerMobile) headers.mobileNo = customerMobile;

  const res = await axios.get(`${base()}/banks/list`, {
    headers,
    timeout: 15000,
  });
  const banks = res.data?.bankDetails || [];
  _bankCache = { banks, cachedAt: Date.now() };
  return banks;
};

// ── 3. Generate Intent QR ─────────────────────────────────────────────────────
const generateIntentQR = async ({ amount, orderId, orderNumber }) => {
  const token = await getAccessToken();
  const terminalId = config.fonepayIntent.terminalId;
  if (!terminalId) throw new Error("FONEPAY_INTENT_TERMINAL_ID not set");

  // referenceLabel: alphanumeric only, max 30 chars, must be unique per transaction
  // "FPI" + 24-char Mongo ObjectId = 27 chars — safe
  const referenceLabel = `FPI${orderId}`.slice(0, 30);

  const body = {
    amount: parseFloat(Number(amount).toFixed(2)),
    billId: orderNumber,
    terminalId,
    paymentMode: "QR",
    referenceLabel,
    qrType: "INTENT_QR",
  };
  const payload = JSON.stringify(body);

  const res = await axios.post(`${base()}/generate-intent-qr`, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      signature: sign(payload),
    },
    timeout: 20000,
  });

  const data = res.data;
  if (data.status !== "Success")
    throw new Error(`Fonepay QR generation failed: ${JSON.stringify(data)}`);

  return {
    qrString: data.qrString,
    qrMessage: data.qrMessage, // render this as QR on frontend
    websocketId: data.websocketId, // ws:// — frontend connects here
    prn: data.prn, // same as referenceLabel
    terminalId: data.fonepayPanNumber || terminalId,
    displayName: data.qrDisplayName,
    referenceLabel,
  };
};

// ── 4. Check Payment Status ───────────────────────────────────────────────────
const checkPaymentStatus = async ({ referenceLabel, terminalId }) => {
  const token = await getAccessToken();
  const tid = terminalId || config.fonepayIntent.terminalId;

  const body = { terminalId: tid, referenceLabel };
  const payload = JSON.stringify(body);

  const res = await axios.post(`${base()}/thirdPartyDynamicQrGetStatus`, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      signature: sign(payload),
    },
    timeout: 15000,
  });

  return res.data;
};

// ── 5. Parse WebSocket message ────────────────────────────────────────────────
// transactionStatus is a JSON string embedded inside the outer JSON object
const parseWebSocketMessage = (raw) => {
  try {
    const outer = JSON.parse(raw);
    const inner =
      typeof outer.transactionStatus === "string"
        ? JSON.parse(outer.transactionStatus)
        : outer.transactionStatus || {};
    return {
      isPaymentSuccess: inner.paymentSuccess === true,
      isVerified: inner.QRVerified === true,
      message: inner.message || "",
      raw: inner,
    };
  } catch (e) {
    console.error("[FonepayIntent] WS parse error:", e.message);
    return { isPaymentSuccess: false, isVerified: false, raw: {} };
  }
};

// ── Invalidate token (call on 401 from Fonepay) ───────────────────────────────
const invalidateToken = () => {
  _tokenCache = { token: null, expiresAt: 0 };
};

export default {
  getAccessToken,
  getBankList,
  generateIntentQR,
  checkPaymentStatus,
  parseWebSocketMessage,
  invalidateToken,
};
