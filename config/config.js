import dotenv from "dotenv";

dotenv.config();

const appUrl = process.env.APP_URL || "https://radhana-art.onrender.com";
const frontendUrl =
  process.env.FRONTEND_URL || "https://radhanaenterprises.com.np";

const config = {
  appUrl,
  frontendUrl,
  PORT: process.env.PORT || 5000,
  MONGODB_URL:
    process.env.MONGODB_URL ||
    "mongodb://radhanaDB:radhanaDBuser@ac-mowzjya-shard-00-00.rqj0ckw.mongodb.net:27017,ac-mowzjya-shard-00-01.rqj0ckw.mongodb.net:27017,ac-mowzjya-shard-00-02.rqj0ckw.mongodb.net:27017/?ssl=true&replicaSet=atlas-140lv9-shard-0&authSource=admin&appName=Cluster0",
  jwtSecret: process.env.JWT_SECRET || "radhana_secret_key",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "dbzmbhrsc",
    apiKey: process.env.CLOUDINARY_API_KEY || "843111676667755",
    apiSecret:
      process.env.CLOUDINARY_API_SECRET || "ohEBwzyrzDhXE3LPYltExYxlwTc",
  },
  googleClientId:
    process.env.GOOGLE_CLIENT_ID ||
    "699930166750-2ifl12usok3o4munn1vhl5d0udtt75je.apps.googleusercontent.com",
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET || "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",

  khalti: {
    apiKey: process.env.KHALTI_API_KEY || "",
    apiUrl: process.env.KHALTI_API_URL || "https://dev.khalti.com/api/v2",
    returnUrl:
      process.env.KHALTI_RETURN_URL || `${frontendUrl}/#/payment/verify`,
  },

  backendUrl: appUrl,

  fonepay: {
    merchantId: process.env.FONEPAY_MERCHANT_ID || "",
    secretKey: process.env.FONEPAY_SECRET_KEY || "",
    // Web payment portal (NOT the Dynamic QR URL)
    // Sandbox: https://dev-clientapi.fonepay.com
    // Production: https://clientapi.fonepay.com
    pgUrl: process.env.FONEPAY_PG_URL || "https://dev-clientapi.fonepay.com",
    // Must include /#/ for hash routing
    returnUrl:
      process.env.FONEPAY_RETURN_URL ||
      `${frontendUrl}/#/payment/fonepay-verify`,
  },

  // ── Fonepay Intent / Dynamic QR (V1.9) ──────────────────────────────────
  // Different credentials from the old PG redirect flow.
  // Fonepay provides: username, password, terminalId, RSA private key.
  fonepayIntent: {
    username: process.env.FONEPAY_INTENT_USERNAME || "",
    password: process.env.FONEPAY_INTENT_PASSWORD || "",
    terminalId: process.env.FONEPAY_INTENT_TERMINAL_ID || "",
    // RSA private key — paste as-is (multi-line PEM) or set as env var
    // On Render: add as a secret env var, preserve newlines
    privateKey: process.env.FONEPAY_INTENT_PRIVATE_KEY || "",
    // UAT: https://uat-new-merchantapi.fonepay.com
    // Prod: https://new-merchantapi.fonepay.com
    baseUrl:
      process.env.FONEPAY_INTENT_BASE_URL ||
      "https://uat-new-merchantapi.fonepay.com",
    basePath: "/api/merchant/merchantDetailsForThirdParty/v2",
  },

  // ── Fonepay Intent / Dynamic QR (V1.9) ──────────────────────────────────
  // DIFFERENT from the old fonepay PG redirect — these are new credentials.
  // Fonepay will provide: username, password, terminalId, RSA private key.
  fonepayIntent: {
    username: process.env.FONEPAY_INTENT_USERNAME || "",
    password: process.env.FONEPAY_INTENT_PASSWORD || "",
    terminalId: process.env.FONEPAY_INTENT_TERMINAL_ID || "",
    // Full RSA private key PEM — store in Render env var, preserve newlines
    privateKey: process.env.FONEPAY_INTENT_PRIVATE_KEY || "",
    // UAT base URL (from Postman collection — NOTE: different from the PDF URL)
    // UAT  : https://dev-external-gateway-new.fonepay.com/merchantThirdparty
    // Prod : https://merchantapi.fonepay.com/merchantThirdparty  (get from Fonepay)
    baseUrl:
      process.env.FONEPAY_INTENT_BASE_URL ||
      "https://dev-external-gateway-new.fonepay.com/merchantThirdparty",
    basePath: "/api/merchant/third-party/v2",
  },

  emailApiKey: process.env.EMAIL_API_KEY || "",
  adminEmail: process.env.ADMIN_EMAIL || "radhanaart@gmail.com",
};

export default config;
