import User from "../models/User.js";
import ResetPassword from "../models/ResetPassword.js";
import bcrypt from "bcryptjs";
import sendEmail, { templates } from "../utils/email.js";
import config from "../config/config.js";
import crypto from "crypto";
import { validateEmailFormat } from "../utils/validateEmail.js";

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  roles: user.roles,
  profileImageUrl: user.profileImageUrl,
  createdAt: user.createdAt,
});

// ── REGISTER — no email verification, log in immediately ──────
const register = async (data) => {
  if (!validateEmailFormat(data.email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing)
    throw { statusCode: 400, message: "User with this email already exists." };

  const hashedPassword = bcrypt.hashSync(data.password, 10);

  const created = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    phone: data.phone,
    address: data.address || { city: "", province: "", country: "Nepal" },
    roles: data.roles || ["USER"],
  });

  // Send welcome email non-blocking — failure does NOT block registration
  const { subject, html } = templates.welcomeEmail({ name: created.name });
  sendEmail(created.email, { subject, html }).catch((err) =>
    console.error("Welcome email error (non-blocking):", err.message),
  );

  return safeUser(created);
};

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (data) => {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user)
    throw {
      statusCode: 404,
      message: "No account found with this email. Please register first.",
    };

  const isMatch = bcrypt.compareSync(data.password, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Incorrect email or password." };

  return safeUser(user);
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (email) => {
  if (!validateEmailFormat(email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const token = crypto.randomUUID();
  await ResetPassword.create({ userId: user._id, token });

  const resetLink = `${config.frontendUrl}/reset-password?token=${token}&userId=${user._id}`;
  const { subject, html } = templates.resetPassword({
    name: user.name,
    resetLink,
  });

  // This one MUST succeed — user needs the link
  try {
    await sendEmail(email, { subject, html });
  } catch (err) {
    console.error("Reset password email error:", err.message);
    throw {
      statusCode: 500,
      message: "Failed to send reset email. Please try again.",
    };
  }

  return { message: "Password reset link sent to your email." };
};

// ── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (userId, token, newPassword) => {
  const record = await ResetPassword.findOne({
    userId,
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  }).sort({ expiresAt: -1 });

  if (!record || record.token !== token)
    throw { statusCode: 400, message: "Invalid or expired reset token." };

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const user = await User.findByIdAndUpdate(userId, {
    password: hashedPassword,
  });
  await ResetPassword.findByIdAndUpdate(record._id, { isUsed: true });

  if (user) {
    const { subject, html } = templates.passwordChanged({ name: user.name });
    sendEmail(user.email, { subject, html }).catch(() => {});
  }

  return { message: "Password reset successfully." };
};

export default {
  register,
  login,
  forgotPassword,
  resetPassword,
};
