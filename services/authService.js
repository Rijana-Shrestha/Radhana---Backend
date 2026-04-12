import User from "../models/User.js";
import ResetPassword from "../models/ResetPassword.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/email.js";
import config from "../config/config.js";
import crypto from "crypto";

// Return safe user object (no password)
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  roles: user.roles,
  profileImageUrl: user.profileImageUrl,
});

const login = async (data) => {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const isMatch = bcrypt.compareSync(data.password, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Incorrect email or password." };

  return safeUser(user);
};

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

  return safeUser(created);
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw { statusCode: 404, message: "User not found." };

  const token = crypto.randomUUID();

  await ResetPassword.create({ userId: user._id, token });

  const resetLink = `${config.frontendUrl}/reset-password.html?token=${token}&userId=${user._id}`;

  await sendEmail(email, {
    subject: "Reset Your Radhana Art Password",
    body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 40px; border-radius: 12px; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo-box { width: 60px; height: 60px; background: linear-gradient(135deg, #145faf, #D93A6A); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; }
          h2 { color: #145faf; text-align: center; font-family: Georgia, serif; }
          p { color: #555; line-height: 1.6; font-size: 15px; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { background: linear-gradient(135deg, #145faf, #D93A6A); color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 15px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          .expiry { font-size: 13px; color: #888; text-align: center; background: #f8f9fa; padding: 10px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h2>🪷 Radhana Art</h2>
            <p style="color:#888;font-size:12px;margin-top:-10px;">Laser Engraving · Kathmandu</p>
          </div>
          <h2>Reset Your Password</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset the password for your Radhana Art account. Click the button below to set a new password:</p>
          <div class="button-container">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p class="expiry">⏰ This link expires in <strong>1 hour</strong>.</p>
          <p>If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <hr style="border:0;border-top:1px solid #eee;margin:30px 0;">
          <div class="footer">
            © 2025 Radhana Art · Sitapaila, Kathmandu, Nepal<br>
            📞 +977 9823939106 · radhanaart@gmail.com
          </div>
        </div>
      </body>
      </html>
    `,
  });

  return { message: "Reset password link sent to your email." };
};

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

  await User.findByIdAndUpdate(userId, { password: hashedPassword });
  await ResetPassword.findByIdAndUpdate(record._id, { isUsed: true });

  return { message: "Password reset successfully." };
};

export default { register, login, forgotPassword, resetPassword };
