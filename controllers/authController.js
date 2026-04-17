import authService from "../services/authService.js";
import { createJWT } from "../utils/jwt.js";
import {generateCodeVerifier, generateState, Google} from "arctic"
import { google } from "../utils/oauth/google.js";
import config from "../config/config.js";
const cookieOptions = {
  httpOnly: true, // JS can't read it (XSS protection)
  maxAge: 86400 * 1000, // 1 day in ms
  sameSite: "None",
  secure: true,
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!password)
      return res.status(400).json({ message: "Password is required." });

    const data = await authService.login({ email, password });
    const authToken = createJWT(data);

    res.cookie("authToken", authToken, cookieOptions);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required." });
    if (!confirmPassword)
      return res.status(400).json({ message: "Confirm password is required." });
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const data = await authService.register(req.body);
    const authToken = createJWT(data);

    res.cookie("authToken", authToken, cookieOptions);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const data = await authService.forgotPassword(email);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, userId } = req.query;
    const { password, confirmPassword } = req.body;

    if (!token || !userId)
      return res
        .status(400)
        .json({ message: "Token and userId are required." });
    if (!password)
      return res.status(400).json({ message: "Password is required." });
    if (!confirmPassword)
      return res.status(400).json({ message: "Confirm password is required." });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    const data = await authService.resetPassword(userId, token, password);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  res.clearCookie("authToken", cookieOptions);
  res.json({ message: "Logged out successfully." });
};

// GET /api/auth/me — returns current logged-in user from cookie
const getMe = async (req, res) => {
  res.json(req.user);
};

const getGoogleLoginPage = async (req, res) => {
  try {
    // Check if Google credentials are configured
    if (!config.googleClientId || !config.googleClientSecret) {
      return res.status(500).json({ 
        message: "Google OAuth is not configured. Please contact the administrator to set up Google OAuth credentials." 
      });
    }

    if(req.user){
      return res.redirect('/');
    }
    const state = generateState();
    const  codeVerifier= generateCodeVerifier();
    const url= google.createAuthorizationUrl(state, codeVerifier,[
      "openid",
      "profile",
      "email"
    ])
    const cookieConfig = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 10 * 60 * 1000, // 10 minutes
    };
    res.cookie("oauthState", state, cookieConfig);
    res.cookie("codeVerifier", codeVerifier, cookieConfig);

    res.redirect(url.toString());
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Failed to initiate Google login: " + error.message });
  }
};

const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ message: "Missing authorization code or state." });
    }

    // Validate state
    const storedState = req.cookies.oauthState;
    if (state !== storedState) {
      return res.status(400).json({ message: "Invalid state parameter." });
    }

    const codeVerifier = req.cookies.codeVerifier;
    if (!codeVerifier) {
      return res.status(400).json({ message: "Missing code verifier." });
    }

    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    
    // Get user info from Google
    const googleUserResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!googleUserResponse.ok) {
      throw { statusCode: 400, message: "Failed to fetch user info from Google." };
    }

    const googleUser = await googleUserResponse.json();

    // Login or create user
    const user = await authService.oauthLogin("google", googleUser.sub, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    // Create auth token
    const authToken = createJWT(user);

    // Set auth cookie
    res.cookie("authToken", authToken, cookieOptions);

    // Clear OAuth cookies
    res.clearCookie("oauthState");
    res.clearCookie("codeVerifier");

    // Redirect to frontend home page
    res.redirect(config.frontendUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${config.frontendUrl}login?error=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
};

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  getGoogleLoginPage,
  googleCallback
};
