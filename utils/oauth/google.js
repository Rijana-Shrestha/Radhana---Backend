import { Google } from "arctic";
import config from "../../config/config.js";

let google;

try {
  if (!config.googleClientId || !config.googleClientSecret) {
    console.warn("WARNING: Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
    google = null;
  } else {
    google = new Google({
      clientId: config.googleClientId, 
      clientSecret: config.googleClientSecret,
      redirectUri: "https://radhana-art.onrender.com/api/auth/google/callback"
    });
  }
} catch (error) {
  console.error("Failed to initialize Google OAuth client:", error);
  google = null;
}

export { google };