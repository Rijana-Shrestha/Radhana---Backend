import User from "../models/User.js";
import ResetPassword from "../models/ResetPassword.js";
import OauthAccount from "../models/OauthAccount.js";
import bcrypt from "bcryptjs";
import sendEmail, { templates } from "../utils/email.js";
import config from "../config/config.js";
import crypto from "crypto";

// Return safe user object (no password, no sensitive fields)
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  roles: user.roles,
  profileImageUrl: user.profileImageUrl,
  twoFactorEnabled: user.twoFactorEnabled,
  createdAt: user.createdAt,
});

// Generate a 6-digit numeric OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (data) => {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const isMatch = bcrypt.compareSync(data.password, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Incorrect email or password." };

  // If 2FA is enabled, send OTP instead of logging in immediately
  if (user.twoFactorEnabled) {
    const otp = generateOTP();
    await OTP.deleteMany({ userId: user._id, isUsed: false }); // clear old OTPs
    await OTP.create({ userId: user._id, code: otp });

    const { subject, html } = templates.twoFactorOTP({ name: user.name, otp });
    await sendEmail(user.email, { subject, html });

    // Return a pending state — frontend must submit OTP to complete login
    return {
      twoFactorRequired: true,
      userId: user._id,
      message: "OTP sent to your registered email address.",
    };
  }

  return safeUser(user);
};

// ── VERIFY 2FA OTP ────────────────────────────────────────────
const verifyTwoFactor = async (userId, code) => {
  const record = await OTP.findOne({
    userId,
    isUsed: false,
    expiresAt: { $gt: Date.now() },
  }).sort({ expiresAt: -1 });

  if (!record || record.code !== code) {
    throw { statusCode: 400, message: "Invalid or expired OTP." };
  }

  await OTP.findByIdAndUpdate(record._id, { isUsed: true });

  const user = await User.findById(userId);
  if (!user) throw { statusCode: 404, message: "User not found." };

  return safeUser(user);
};

// ── TOGGLE 2FA ────────────────────────────────────────────────
const toggleTwoFactor = async (userId, enable) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { twoFactorEnabled: enable },
    { new: true },
  );
  if (!user) throw { statusCode: 404, message: "User not found." };
  return { twoFactorEnabled: user.twoFactorEnabled };
};

// ── REGISTER ──────────────────────────────────────────────────
const register = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing)
    throw { statusCode: 400, message: "User with this email already exists." };

  const hashedPassword = bcrypt.hashSync(data.password, 10);

  const created = await User.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    phone: data.phone,
    address: data.address || { city: "", province: "", country: "Nepal" },
    roles: data.roles || ["USER"],
  });

  // Send welcome email (non-blocking)
  const { subject, html } = templates.welcomeVerification({
    name: created.name,
    verifyLink: `${config.frontendUrl}/verify-email`,
  });
  sendEmail(created.email, { subject, html }).catch((err) =>
    console.error("Welcome email error:", err),
  );

  return safeUser(created);
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

  if (!record || record.token !== token) {
    throw { statusCode: 400, message: "Invalid or expired reset token." };
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const user = await User.findByIdAndUpdate(userId, {
    password: hashedPassword,
  });
  await ResetPassword.findByIdAndUpdate(record._id, { isUsed: true });

  // Notify user that password was changed
  if (user) {
    const { subject, html } = templates.passwordChanged({ name: user.name });
    sendEmail(user.email, { subject, html }).catch((err) =>
      console.error("Password changed email error:", err),
    );
  }

  return { message: "Password reset successfully." };
};

const oauthLogin = async (provider, providerAccountId, profile) => {
  // Check if OAuth account exists
  let oauthAccount = await OauthAccount.findOne({
    provider,
    providerAccountId,
  });

  let user;

  if (oauthAccount) {
    // User already linked with this OAuth provider
    user = await User.findById(oauthAccount.userId);
  } else {
    // Check if user exists by email
    user = await User.findOne({ email: profile.email.toLowerCase() });

    if (!user) {
      // Create new user for OAuth
      const generatedPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = bcrypt.hashSync(generatedPassword, 10);

      user = await User.create({
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        password: hashedPassword,
        phone: profile.phone || "",
        address: { city: "", province: "", country: "Nepal" },
        roles: ["USER"],
        profileImageUrl: profile.picture || "",
      });
    }

    // Link OAuth account to user
    await OauthAccount.create({
      provider,
      providerAccountId,
      userId: user._id,
    });
  }

  if (!user) {
    throw { statusCode: 404, message: "User not found." };
  }

  return safeUser(user);
};

export default { register, login, forgotPassword, resetPassword, oauthLogin };
