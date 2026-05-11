/**
 * fonepayIntentService.js
 *
 * Implements the Fonepay Intent / Dynamic QR flow (V1.9 spec).
 *
 * Flow:
 *  1. oAuth login  →  get Bearer token (cached until expiry)
 *  2. Get bank list (optional — cached 30 min)
 *  3. Generate Intent QR  →  get qrMessage + websocketId
 *  4. Front-end opens WebSocket to websocketId and listens
 *  5. On WebSocket payment event  →  call checkPaymentStatus to verify
 *  6. On success  →  call orderService.finalizePayment (reuses existing logic)
 *
 * Signature algorithm: RSA-SHA1, Base64-encoded (per Fonepay PKI spec).
 * All request bodies are JSON-stringified and signed before sending.
 */

import axios from "axios";
import crypto from "crypto";
import config from "../config/config.js";

// ── Token cache (in-memory, one instance per process) ──────────────────────
let _tokenCache = { token: null, expiresAt: 0 };

// ── Bank list cache (30 min) ────────────────────────────────────────────────
let _bankCache = { banks: null, cachedAt: 0 };
const BANK_CACHE_TTL_MS = 30 * 60 * 1000;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the base URL for intent API calls.
 * UAT:  https://uat-new-merchantapi.fonepay.com/api/merchant/merchantDetailsForThirdParty/v2
 * Prod: https://new-merchantapi.fonepay.com/api/merchant/merchantDetailsForThirdParty/v2
 */
const intentBase = () =>
  `${config.fonepayIntent.baseUrl}${config.fonepayIntent.basePath}`;

/**
 * Generate RSA-SHA1 signature over a JSON payload string.
 * Fonepay requires:
 *   - Sign the entire JSON body string
 *   - Use your RSA private key
 *   - Base64-encode the result
 */
const generateSignature = (payloadString) => {
  const rawKey = config.fonepayIntent.privateKey;
  if (!rawKey) throw new Error("FONEPAY_INTENT_PRIVATE_KEY not configured");

  // Strip any PEM headers/footers and all whitespace to get pure Base64
  const stripped = rawKey
    .replace(/-----BEGIN[^-]*-----/g, "")
    .replace(/-----END[^-]*-----/g, "")
    .replace(/[\s]+/g, "")
    .trim();

  // Rebuild into 64-char line PEM chunks
  const lines = stripped.match(/.{1,64}/g) || [];

  // Fonepay sample key is PKCS8 format (BEGIN PRIVATE KEY)
  const pem =
    "-----BEGIN PRIVATE KEY-----\n" +
    lines.join("\n") +
    "\n-----END PRIVATE KEY-----";

  try {
    const signer = crypto.createSign("RSA-SHA1");
    signer.update(payloadString, "utf8");
    return signer.sign({ key: pem, format: "pem", type: "pkcs8" }, "base64");
  } catch (e) {
    // Fallback to PKCS1 format
    const pemPkcs1 =
      "-----BEGIN RSA PRIVATE KEY-----\n" +
      lines.join("\n") +
      "\n-----END RSA PRIVATE KEY-----";
    const signer2 = crypto.createSign("RSA-SHA1");
    signer2.update(payloadString, "utf8");
    return signer2.sign(
      { key: pemPkcs1, format: "pem", type: "pkcs1" },
      "base64",
    );
  }
};
/**
 * Build the Basic Auth header from username + password.
 * Fonepay oAuth uses HTTP Basic Auth on the login endpoint.
 */
const basicAuthHeader = () => {
  const { username, password } = config.fonepayIntent;
  if (!username || !password)
    throw new Error(
      "FONEPAY_INTENT_USERNAME / FONEPAY_INTENT_PASSWORD not configured",
    );
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
};

// ── 1. oAuth Login ───────────────────────────────────────────────────────────
/**
 * Logs in to the Fonepay Intent API and caches the Bearer token.
 * The token is reused until it expires (we assume ~55 min validity;
 * adjust TOKEN_TTL_MS if Fonepay specifies a different window).
 *
 * POST /login
 * Headers: Authorization: Basic <base64(user:pass)>, Signature: <sig>
 * Body: { username, password }
 */
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes

const getAccessToken = async () => {
  // Return cached token if still valid
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const { username, password } = config.fonepayIntent;
  const body = { username, password };
  const payloadString = JSON.stringify(body);
  const signature = generateSignature(payloadString);

  const url = `${intentBase()}/login`;

  const response = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(),
      signature: signature,
    },
    timeout: 15000,
  });

  const accessToken = response.data?.accessToken;
  if (!accessToken)
    throw new Error("Fonepay oAuth: no accessToken in response");

  // Cache it
  _tokenCache = { token: accessToken, expiresAt: Date.now() + TOKEN_TTL_MS };
  console.log("[FonepayIntent] Token refreshed");
  return accessToken;
};

// ── 2. Get Bank List ─────────────────────────────────────────────────────────
/**
 * Returns the list of banks that support Fonepay Intent checkout.
 * Result is cached for 30 minutes — bank list rarely changes.
 *
 * GET /banks/list
 * Headers: Authorization: Bearer <token>, Signature: <sig>, paymentMode: INTENT
 */
const getBankList = async (customerMobile = "") => {
  // Return cached list if fresh
  if (
    _bankCache.banks &&
    Date.now() - _bankCache.cachedAt < BANK_CACHE_TTL_MS
  ) {
    return _bankCache.banks;
  }

  const token = await getAccessToken();

  // Signature for GET: sign an empty JSON object string
  const signature = generateSignature("");

  const url = `${intentBase()}/banks/list`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: token, // already contains "Bearer " prefix from Fonepay response
    signature: signature,
    paymentMode: "INTENT",
  };
  if (customerMobile) headers.mobileNo = customerMobile;

  const response = await axios.get(url, { headers, timeout: 15000 });
  const banks = response.data?.bankDetails || [];

  _bankCache = { banks, cachedAt: Date.now() };
  return banks;
};

// ── 3. Generate Intent QR ────────────────────────────────────────────────────
/**
 * Calls the Fonepay Intent QR generation API.
 * Returns: { qrString, qrMessage, websocketId, prn, terminalId, ... }
 *
 * referenceLabel must be unique per transaction (alphanumeric, max 30 chars).
 *
 * POST /generate-intent-qr
 */
const generateIntentQR = async ({ amount, orderId, orderNumber }) => {
  const token = await getAccessToken();
  const { terminalId } = config.fonepayIntent;

  if (!terminalId) throw new Error("FONEPAY_INTENT_TERMINAL_ID not configured");

  // referenceLabel: alphanumeric only, max 30 chars, must be unique
  // We use orderId (Mongo ObjectId = 24 hex chars) — safe and unique
  const referenceLabel = `FPI${orderId}`.slice(0, 30);

  const body = {
    amount: Number(amount).toFixed(2),
    billId: orderNumber, // shown in banking app
    terminalId,
    paymentMode: "QR",
    referenceLabel,
    qrType: "INTENT_QR",
  };

  const payloadString = JSON.stringify(body);
  const signature = generateSignature(payloadString);

  const url = `${intentBase()}/generate-intent-qr`;

  const response = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      signature: signature,
    },
    timeout: 20000,
  });

  const data = response.data;

  if (data.status !== "Success")
    throw new Error(`Fonepay QR generation failed: ${JSON.stringify(data)}`);

  return {
    qrString: data.qrString,
    qrMessage: data.qrMessage, // same as qrString — use this for deep link
    websocketId: data.websocketId, // ws:// URL — front-end listens here
    prn: data.prn, // == referenceLabel — use for status check
    terminalId: data.fonepayPanNumber || terminalId,
    displayName: data.qrDisplayName,
    referenceLabel,
  };
};

// ── 4. Check Payment Status ──────────────────────────────────────────────────
/**
 * Polls the Fonepay status API for a given transaction.
 * Call this AFTER the WebSocket fires OR as a fallback poll.
 *
 * POST /thirdPartyDynamicQrGetStatus
 * Returns: { paymentStatus: "success"|"pending"|"failed", ... }
 */
const checkPaymentStatus = async ({ referenceLabel, terminalId }) => {
  const token = await getAccessToken();
  const tid = terminalId || config.fonepayIntent.terminalId;

  const body = { terminalId: tid, referenceLabel };
  const payloadString = JSON.stringify(body);
  const signature = generateSignature(payloadString);

  const url = `${intentBase()}/thirdPartyDynamicQrGetStatus`;

  const response = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      signature: signature,
    },
    timeout: 15000,
  });

  return response.data;
  // Shape: { prn, merchantCode, paymentStatus, fonepayTraceId,
  //          requestedAmount, totalTransactionAmount, paymentMessage }
};

// ── 5. Parse WebSocket message ───────────────────────────────────────────────
/**
 * Parses the raw WebSocket JSON message from Fonepay.
 * transactionStatus is a JSON string inside the outer JSON — double-parse it.
 *
 * Returns { isPaymentSuccess, isVerified, raw }
 */
const parseWebSocketMessage = (rawMessage) => {
  try {
    const outer = JSON.parse(rawMessage);
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
    console.error("[FonepayIntent] WebSocket parse error:", e.message);
    return { isPaymentSuccess: false, isVerified: false, raw: {} };
  }
};

// ── Invalidate token cache (call on 401 errors) ──────────────────────────────
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
