import User from "../models/User.js";
import ResetPassword from "../models/ResetPassword.js";
import EmailVerification from "../models/EmailVerification.js";
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
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

// ── REGISTER — saves user unverified, sends verification email ─
const register = async (data) => {
  if (!validateEmailFormat(data.email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    // If already registered but not verified, resend the email
    if (!existing.isVerified) {
      await sendVerificationEmail(existing);
      throw {
        statusCode: 400,
        message:
          "This email is already registered but not verified. We've resent the verification email — please check your inbox.",
      };
    }
    throw { statusCode: 400, message: "User with this email already exists." };
  }

  const hashedPassword = bcrypt.hashSync(data.password, 10);

  // Create user with isVerified: false — cannot login until verified
  const created = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    phone: data.phone,
    address: data.address || { city: "", province: "", country: "Nepal" },
    roles: data.roles || ["USER"],
    isVerified: false,
  });

  // Send verification email — failure rolls back user creation
  try {
    await sendVerificationEmail(created);
  } catch (err) {
    // Delete the user so they can try again
    await User.findByIdAndDelete(created._id);
    throw {
      statusCode: 500,
      message: "Failed to send verification email. Please try again.",
    };
  }

  return {
    message:
      "Registration successful! Please check your email to verify your account.",
  };
};

// Helper: create token and send verification email
const sendVerificationEmail = async (user) => {
  // Delete any old unused tokens for this user
  await EmailVerification.deleteMany({ email: user.email.toLowerCase() });

  const token = crypto.randomUUID();

  await EmailVerification.create({
    email: user.email.toLowerCase(),
    token,
    // Expires in 24 hours
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const verifyLink = `${config.frontendUrl}/#/verify-email?token=${token}&userId=${user._id}`;
  const { subject, html } = templates.verifyEmail({
    name: user.name,
    verifyLink,
  });
  await sendEmail(user.email, { subject, html });
};

// ── VERIFY EMAIL — called when user clicks link in email ───────
const verifyEmail = async (userId, token) => {
  const record = await EmailVerification.findOne({
    expiresAt: { $gt: Date.now() },
  });

  // Find by userId match manually (token stored separately)
  const user = await User.findById(userId);
  if (!user) throw { statusCode: 404, message: "User not found." };

  if (user.isVerified)
    throw {
      statusCode: 400,
      message: "Email is already verified. Please login.",
    };

  const verRecord = await EmailVerification.findOne({
    email: user.email,
    token,
    expiresAt: { $gt: Date.now() },
  });

  if (!verRecord)
    throw {
      statusCode: 400,
      message:
        "Verification link is invalid or has expired. Please register again.",
    };

  // Mark user as verified
  await User.findByIdAndUpdate(userId, { isVerified: true });
  await EmailVerification.deleteMany({ email: user.email });

  return safeUser({ ...user.toObject(), isVerified: true });
};

// ── LOGIN — blocks unverified users ───────────────────────────
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

  // Block login if email not verified
  if (!user.isVerified)
    throw {
      statusCode: 403,
      message: "Please verify your email before logging in. Check your inbox.",
      notVerified: true,
    };

  return safeUser(user);
};

// ── RESEND VERIFICATION EMAIL ─────────────────────────────────
const resendVerification = async (email) => {
  if (!validateEmailFormat(email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user)
    throw { statusCode: 404, message: "No account found with this email." };
  if (user.isVerified)
    throw {
      statusCode: 400,
      message: "This email is already verified. Please login.",
    };

  await sendVerificationEmail(user);
  return { message: "Verification email resent. Please check your inbox." };
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (email) => {
  if (!validateEmailFormat(email))
    throw { statusCode: 400, message: "Please enter a valid email address." };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const token = crypto.randomUUID();
  await ResetPassword.create({ userId: user._id, token });

  const resetLink = `${config.frontendUrl}/#/reset-password?token=${token}&userId=${user._id}`;
  const { subject, html } = templates.resetPassword({
    name: user.name,
    resetLink,
  });

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
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
};
