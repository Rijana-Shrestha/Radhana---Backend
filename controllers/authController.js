import authService from "../services/authService.js";
import { createJWT } from "../utils/jwt.js";

const cookieOptions = {
  httpOnly: true,
<<<<<<< HEAD
  maxAge: 86400 * 1000, // 1 day
  sameSite: "None", // Required for cross-domain cookie sharing
  secure: true, // Must be true when sameSite is "None"
};

// POST /api/auth/register
=======
  maxAge: 86400 * 1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
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
<<<<<<< HEAD
    // Do NOT set cookie — user must verify email first
    res.status(201).json(data);
=======
    res.status(201).json(data); // no cookie — must verify email first
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

<<<<<<< HEAD
// POST /api/auth/resend-verification
=======
const verifyEmail = async (req, res) => {
  try {
    const { token, userId } = req.query;
    if (!token || !userId)
      return res
        .status(400)
        .json({ message: "Token and userId are required." });
    const user = await authService.verifyEmail(userId, token);
    const authToken = createJWT(user);
    res.cookie("authToken", authToken, cookieOptions);
    res.json({ ...user, verified: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
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

<<<<<<< HEAD
// POST /api/auth/login
=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!password)
      return res.status(400).json({ message: "Password is required." });
<<<<<<< HEAD

=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
    const data = await authService.login({ email, password });
    const authToken = createJWT(data);
    res.cookie("authToken", authToken, cookieOptions);
    res.json(data);
  } catch (error) {
<<<<<<< HEAD
    // Pass emailNotVerified flag to frontend so it can show resend option
=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
    res.status(error.statusCode || 500).json({
      message: error.message,
      emailNotVerified: error.emailNotVerified || false,
      email: error.email || "",
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

<<<<<<< HEAD
// GET /api/auth/verify-email?token=...&userId=...
const verifyEmail = async (req, res) => {
  try {
    const { token, userId } = req.query;
    if (!token || !userId)
      return res
        .status(400)
        .json({ message: "Token and userId are required." });

    const user = await authService.verifyEmail(userId, token);
    // Now log them in — set cookie
    const authToken = createJWT(user);
    res.cookie("authToken", authToken, cookieOptions);
    res.json({ ...user, verified: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// GET /api/auth/check-verification?email=...
const checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const status = await authService.checkVerificationStatus(email);
    res.json(status);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
export default {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
<<<<<<< HEAD
  checkVerificationStatus,
=======
>>>>>>> 0986126f1f835e8954c621e25c09c0e7b485218c
};
