import User from "../models/User.js";
import ResetPassword from "../models/ResetPassword.js";
import bcrypt from "bcryptjs";
import sendEmail, { templates } from "../utils/email.js";
import config from "../config/config.js";
import crypto from "crypto";

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  roles: user.roles,
  profileImageUrl: user.profileImageUrl,
  isEmailVerified: user.isEmailVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  createdAt: user.createdAt,
});

// ── REGISTER ──────────────────────────────────────────────────
const register = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing)
    throw { statusCode: 400, message: "User with this email already exists." };

  const hashedPassword = bcrypt.hashSync(data.password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  const created = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    phone: data.phone,
    address: data.address || { city: "", province: "", country: "Nepal" },
    roles: data.roles || ["USER"],
    isEmailVerified: false,
    emailVerifyToken: verifyToken,
  });

  // Send branded verification email
  const verifyLink = `${config.frontendUrl}/verify-email?token=${verifyToken}&userId=${created._id}`;
  const { subject, html } = templates.welcomeVerification({
    name: created.name,
    verifyLink,
  });
  sendEmail(created.email, { subject, html }).catch((err) =>
    console.error("Welcome email error:", err),
  );

  // Return minimal info — NOT logged in yet
  return {
    emailSent: true,
    email: created.email,
    name: created.name,
    message: "Verification email sent. Please check your inbox.",
  };
};

// ── VERIFY EMAIL ──────────────────────────────────────────────
const verifyEmail = async (userId, token) => {
  const user = await User.findById(userId);
  if (!user) throw { statusCode: 404, message: "User not found." };

  if (user.isEmailVerified)
    throw { statusCode: 400, message: "Email is already verified." };

  if (!user.emailVerifyToken || user.emailVerifyToken !== token)
    throw { statusCode: 400, message: "Invalid or expired verification link." };

  await User.findByIdAndUpdate(userId, {
    isEmailVerified: true,
    emailVerifyToken: "",
  });

  const updated = await User.findById(userId);
  // Return full user — frontend can now log them in
  return safeUser(updated);
};

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (data) => {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const isMatch = bcrypt.compareSync(data.password, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Incorrect email or password." };

  // Block login if email not verified
  if (!user.isEmailVerified) {
    throw {
      statusCode: 403,
      message: "Please verify your email before logging in. Check your inbox.",
      emailNotVerified: true,
      email: user.email,
    };
  }

  return safeUser(user);
};

// ── RESEND VERIFICATION ───────────────────────────────────────
const resendVerification = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };
  if (user.isEmailVerified)
    throw { statusCode: 400, message: "Email is already verified." };

  const verifyToken = crypto.randomBytes(32).toString("hex");
  await User.findByIdAndUpdate(user._id, { emailVerifyToken: verifyToken });

  const verifyLink = `${config.frontendUrl}/verify-email?token=${verifyToken}&userId=${user._id}`;
  const { subject, html } = templates.welcomeVerification({
    name: user.name,
    verifyLink,
  });
  await sendEmail(user.email, { subject, html });

  return { message: "Verification email resent." };
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const token = crypto.randomUUID();
  await ResetPassword.create({ userId: user._id, token });

  const resetLink = `${config.frontendUrl}/reset-password?token=${token}&userId=${user._id}`;
  const { subject, html } = templates.resetPassword({
    name: user.name,
    resetLink,
  });
  await sendEmail(email, { subject, html });

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
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
};
