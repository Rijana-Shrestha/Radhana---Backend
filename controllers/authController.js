import authService from "../services/authService.js";
import { createJWT } from "../utils/jwt.js";

const cookieOptions = {
  httpOnly: true,
  maxAge: 86400 * 1000, // 1 day
  sameSite: "None", // Required for cross-domain cookie sharing
  secure: true, // Must be true when sameSite is "None"
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!password)
      return res.status(400).json({ message: "Password is required." });

    const data = await authService.login({ email, password });

    // 2FA pending — don't set cookie yet
    if (data.twoFactorRequired) {
      return res.json(data);
    }

    const authToken = createJWT(data);
    res.cookie("authToken", authToken, cookieOptions);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// POST /api/auth/verify-2fa
const verifyTwoFactor = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code)
      return res.status(400).json({ message: "userId and code are required." });

    const data = await authService.verifyTwoFactor(userId, code);
    const authToken = createJWT(data);
    res.cookie("authToken", authToken, cookieOptions);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// PATCH /api/auth/toggle-2fa  (auth required)
const toggleTwoFactor = async (req, res) => {
  try {
    const { enable } = req.body;
    if (typeof enable !== "boolean")
      return res
        .status(400)
        .json({ message: "'enable' (boolean) is required." });

    const data = await authService.toggleTwoFactor(req.user._id, enable);
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
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

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

const getMe = async (req, res) => {
  res.json(req.user);
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email)
      return res.status(400).json({ message: "Token and email are required." });

    const user = await authService.verifyEmail(token, email);
    const authToken = createJWT(user);
    res.cookie("authToken", authToken, cookieOptions);
    res.json({ message: "Email verified successfully.", user });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// GET /api/auth/check-verification?email=...
const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res.status(400).json({ message: "Email is required." });

    const status = await authService.checkVerificationStatus(email);
    res.json(status);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  verifyEmail,
  checkVerificationStatus,
  verifyTwoFactor,
  toggleTwoFactor,
};

