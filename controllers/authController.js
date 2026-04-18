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
    if (!config.googleClientId || !config.googleClientSecret) {
      return res.status(500).json({
        message: "Google OAuth is not configured."
      });
    }

    if (req.user) {
      return res.redirect('/');
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = google.createAuthorizationURL(
      state,
      codeVerifier,
      ["openid", "profile", "email"]
    );

    res.cookie("oauthState", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 10 * 60 * 1000
    });

    res.cookie("codeVerifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 10 * 60 * 1000
    });

    res.redirect(url.toString());

  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      message: "Failed to initiate Google login: " + error.message
    });
  }
};

const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: "Missing authorization code or state." });
    }

    const storedState = req.cookies.oauthState;
    const codeVerifier = req.cookies.codeVerifier;

    if (!storedState || state !== storedState) {
      return res.status(400).json({ message: "Invalid state parameter." });
    }

    if (!codeVerifier) {
      return res.status(400).json({ message: "Missing code verifier." });
    }

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);

    const googleUserResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!googleUserResponse.ok) {
      throw new Error("Failed to fetch user info from Google.");
    }

    const googleUser = await googleUserResponse.json();

    if (!googleUser.email_verified) {
      throw new Error("Google email not verified.");
    }

    const user = await authService.oauthLogin("google", googleUser.sub, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    const authToken = createJWT(user);

    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });

    res.clearCookie("oauthState", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });

    res.clearCookie("codeVerifier", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });

    res.redirect(config.frontendUrl);

  } catch (error) {
    console.error("Google callback error:", error);

    res.redirect(
      `${config.frontendUrl}/login?error=${encodeURIComponent(
        error.message || "Authentication failed"
      )}`
    );
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
