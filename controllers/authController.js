import authService from "../services/authService.js";
import { createJWT } from "../utils/jwt.js";

// Cross-domain cookie: frontend (.com.np) and backend (.onrender.com) are different domains
const cookieOptions = {
  httpOnly: true,
  maxAge: 86400 * 1000,
  sameSite: "none", // required for cross-domain
  secure: true, // required when sameSite is "none"
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

    // Returns { message } — user must verify email before login
    const data = await authService.register(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Called when user clicks verification link in email
const verifyEmail = async (req, res) => {
  try {
    const { token, userId } = req.query;
    if (!token || !userId)
      return res
        .status(400)
        .json({ message: "Token and userId are required." });

    const user = await authService.verifyEmail(userId, token);

    // Log user in immediately after verification
    const authToken = createJWT(user);
    res.cookie("authToken", authToken, cookieOptions);
    res.json({
      ...user,
      message: "Email verified successfully! You are now logged in.",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    const data = await authService.resendVerification(email);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
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
    res.status(error.statusCode || 500).json({
      message: error.message,
      notVerified: error.notVerified || false,
    });
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

export default {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
