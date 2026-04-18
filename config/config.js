import dotenv from "dotenv";

dotenv.config();

const appUrl = process.env.APP_URL || "https://radhana-art.onrender.com";
const frontendUrl =
  process.env.FRONTEND_URL || "https://radhanaenterprises.com.np/#";

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
      process.env.KHALTI_RETURN_URL || `${appUrl}/api/orders/confirm-payment`,
  },

  backendUrl: appUrl,

  fonepay: {
    merchantId: process.env.FONEPAY_MERCHANT_ID || "",
    secretKey: process.env.FONEPAY_SECRET_KEY || "",
    // Sandbox: https://dev.fonepay.com/api/merchant/merchantDetailsForThirdParty
    // Production: https://fonepay.com/api/merchant/merchantDetailsForThirdParty
    apiUrl:
      process.env.FONEPAY_API_URL ||
      "https://dev.fonepay.com/api/merchant/merchantDetailsForThirdParty",
    returnUrl:
      process.env.FONEPAY_RETURN_URL || `${frontendUrl}payment/fonepay-verify`,
  },

  emailApiKey: process.env.EMAIL_API_KEY || "",
  adminEmail: process.env.ADMIN_EMAIL || "radhanaart@gmail.com",
};

export default config;
