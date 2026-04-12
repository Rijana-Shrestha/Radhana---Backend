import authService from "../services/authService.js";
import { createJWT } from "../utils/jwt.js";

const cookieOptions = {
  httpOnly: true, // JS can't read it (XSS protection)
  maxAge: 86400 * 1000, // 1 day in ms
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
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

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
};
