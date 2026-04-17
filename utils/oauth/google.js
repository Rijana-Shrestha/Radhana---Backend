import { Google } from "arctic";
import config from "../../config/config.js";

export const google = new Google({
    clientId: config.googleClientId, 
    clientSecret: config.googleClientSecret,
    redirectUri: "https://radhana-art.onrender.com/api/auth/google/callback"
});