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
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

// ── REGISTER ──────────────────────────────────────────────────
const register = async (data) => {
  if (!validateEmailFormat(data.email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

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

  const verifyLink = `${config.frontendUrl}/verify-email?token=${verifyToken}&userId=${created._id}`;
  const { subject, html } = templates.welcomeVerification({
    name: created.name,
    verifyLink,
  });

  // Throw error so user knows email failed — don't silently swallow
  try {
    await sendEmail(created.email, { subject, html });
  } catch (emailErr) {
    // Clean up the created user so they can try again
    await User.findByIdAndDelete(created._id);
    console.error("Verification email failed:", emailErr.message || emailErr);
    throw {
      statusCode: 500,
      message:
        "Failed to send verification email. Please check your email address and try again. If the problem persists, please contact support.",
    };
  }

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
  return safeUser(updated);
};

// ── RESEND VERIFICATION ───────────────────────────────────────
const resendVerification = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };
  if (user.isEmailVerified)
    throw { statusCode: 400, message: "Email is already verified." };

  const verifyToken = crypto.randomBytes(32).toString("hex");
  await User.findByIdAndUpdate(user._id, { emailVerifyToken: verifyToken });

  const verifyLink = `${config.appUrl}/verify-email?token=${verifyToken}&userId=${user._id}`;
  const { subject, html } = templates.welcomeVerification({
    name: user.name,
    verifyLink,
  });
  await sendEmail(user.email, { subject, html });
  return { message: "Verification email resent." };
};

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (data) => {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "No account found with this email. Please register first." };

  const isMatch = bcrypt.compareSync(data.password, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Incorrect email or password." };

  if (!user.isEmailVerified)
    throw {
      statusCode: 403,
      message: "Your email is not verified yet. Please check your inbox for the verification link and verify your email before logging in.",
      emailNotVerified: true,
      email: user.email,
    };

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
