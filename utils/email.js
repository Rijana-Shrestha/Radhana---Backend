import { Resend } from "resend";
import config from "../config/config.js";

const resend = new Resend(config.emailApiKey);

// ── Brand tokens ──────────────────────────────────────────────
const BRAND = {
  primary: "#145faf",
  secondary: "#D93A6A",
  dark: "#1a1a2e",
  light: "#f8f9ff",
  name: "Radhana Art",
  tagline: "Laser Engraving · Kathmandu, Nepal",
  phone: "+977 9823939106",
  email: "info@radhanaenterprises.com.np",
  address: "Sitapaila, Kathmandu, Nepal",
  website: "https://radhanaenterprises.com.np",
  logo_emoji: "🪷",
};

// ── Shared HTML shell ─────────────────────────────────────────
const shell = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${BRAND.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f2f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    a { color: ${BRAND.primary}; }
    .wrapper { max-width: 620px; margin: 32px auto; padding: 0 16px 40px; }

    /* Header */
    .header {
      background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 100%);
      border-radius: 16px 16px 0 0;
      padding: 32px 40px 28px;
      text-align: center;
    }
    .header-logo { font-size: 40px; line-height: 1; margin-bottom: 8px; }
    .header-name {
      color: #fff;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      font-family: Georgia, serif;
    }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 4px; }

    /* Card body */
    .card {
      background: #ffffff;
      padding: 40px;
      border-left: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
    }
    .card h2 {
      color: ${BRAND.dark};
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 16px;
      font-family: Georgia, serif;
    }
    .card p { color: #4b5563; font-size: 15px; line-height: 1.7; margin-bottom: 14px; }
    .card p strong { color: ${BRAND.dark}; }

    /* CTA button */
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary});
      color: #ffffff !important;
      text-decoration: none;
      padding: 15px 36px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.3px;
    }

    /* OTP box */
    .otp-box {
      background: linear-gradient(135deg, ${BRAND.light}, #eef2ff);
      border: 2px dashed ${BRAND.primary};
      border-radius: 14px;
      text-align: center;
      padding: 24px 20px;
      margin: 24px 0;
    }
    .otp-label { color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .otp-code { color: ${BRAND.primary}; font-size: 42px; font-weight: 800; letter-spacing: 12px; font-family: 'Courier New', monospace; }
    .otp-expiry { color: #9ca3af; font-size: 12px; margin-top: 10px; }

    /* Info row */
    .info-row {
      background: #f9fafb;
      border-left: 4px solid ${BRAND.primary};
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 14px;
      color: #374151;
    }
    .info-row span { display: block; margin-bottom: 6px; }
    .info-row span:last-child { margin-bottom: 0; }

    /* Divider */
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }

    /* Warning box */
    .warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #92400e;
      margin: 16px 0;
    }

    /* Footer */
    .footer {
      background: ${BRAND.dark};
      border-radius: 0 0 16px 16px;
      padding: 28px 40px;
      text-align: center;
    }
    .footer p { color: rgba(255,255,255,0.55); font-size: 12px; line-height: 1.8; margin: 0; }
    .footer a { color: rgba(255,255,255,0.75); text-decoration: none; }
    .footer .footer-brand { color: #ffffff; font-weight: 700; font-size: 14px; margin-bottom: 8px; font-family: Georgia, serif; }
    .social-links { margin: 14px 0 0; }
    .social-links a {
      display: inline-block;
      background: rgba(255,255,255,0.1);
      color: #fff !important;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">${BRAND.logo_emoji}</div>
      <div class="header-name">${BRAND.name}</div>
      <div class="header-tagline">${BRAND.tagline}</div>
    </div>

    <!-- Card -->
    <div class="card">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">${BRAND.logo_emoji} ${BRAND.name}</div>
      <p>
        ${BRAND.address}<br/>
        <a href="tel:${BRAND.phone}">${BRAND.phone}</a> &nbsp;·&nbsp;
        <a href="mailto:${BRAND.email}">${BRAND.email}</a>
      </p>
      <div class="social-links">
        <a href="${BRAND.website}">🌐 Website</a>
        <a href="https://wa.me/9779823939106">💬 WhatsApp</a>
      </div>
      <p style="margin-top:14px;font-size:11px;">
        © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.<br/>
        This email was sent because of activity on your account.
      </p>
    </div>
  </div>
</body>
</html>`;

// ══════════════════════════════════════════════
// EMAIL TEMPLATE BUILDERS
// ══════════════════════════════════════════════

export const templates = {
  // 1. Forgot password / reset link
  resetPassword: ({ name, resetLink }) => ({
    subject: "Reset Your Radhana Art Password 🔐",
    html: shell(`
      <h2>Reset Your Password</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset the password for your Radhana Art account. Click the button below to set a new password:</p>
      <div class="btn-wrap">
        <a href="${resetLink}" class="btn">🔐 Reset My Password</a>
      </div>
      <div class="warning">
        ⏰ This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.
      </div>
      <hr class="divider"/>
      <p style="font-size:13px;color:#9ca3af;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetLink}" style="word-break:break-all;font-size:12px;">${resetLink}</a>
      </p>
    `),
  }),

  // 2. Two-factor authentication OTP
  twoFactorOTP: ({ name, otp }) => ({
    subject: `${otp} — Your Radhana Art Login Code`,
    html: shell(`
      <h2>Login Verification Code</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Use the code below to complete your login to Radhana Art. This code is valid for <strong>10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-label">Your One-Time Password</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏰ Expires in 10 minutes</div>
      </div>
      <div class="warning">
        🔒 Never share this code with anyone. Radhana Art will <strong>never</strong> ask for your OTP via phone, WhatsApp, or any other channel.
      </div>
      <p>If you did not attempt to log in, please <a href="mailto:${BRAND.email}">contact us immediately</a> and change your password.</p>
    `),
  }),

  // 3. Contact form notification to admin
  contactNotification: ({
    name,
    phone,
    email,
    subject,
    message,
    attachmentUrl,
  }) => ({
    subject: `📩 New Contact Message: ${subject}`,
    html: shell(`
      <h2>New Customer Message</h2>
      <p>You have received a new message through the Radhana Art contact form.</p>
      <div class="info-row">
        <span>👤 <strong>Name:</strong> ${name}</span>
        <span>📞 <strong>Phone:</strong> ${phone}</span>
        <span>📧 <strong>Email:</strong> ${email || "Not provided"}</span>
        <span>📌 <strong>Subject:</strong> ${subject}</span>
      </div>
      <p><strong>Message:</strong></p>
      <div class="info-row" style="border-left-color:${BRAND.secondary};">
        <span style="white-space:pre-wrap;line-height:1.6;">${message}</span>
      </div>
      ${
        attachmentUrl
          ? `
      <p><strong>Attachment:</strong></p>
      <div class="btn-wrap">
        <a href="${attachmentUrl}" class="btn">📎 View Attachment</a>
      </div>`
          : ""
      }
      <hr class="divider"/>
      <p style="font-size:13px;color:#6b7280;">Reply directly to the customer at <a href="mailto:${email}">${email}</a> or call <a href="tel:${phone}">${phone}</a>.</p>
    `),
  }),

  // 4. Contact form auto-reply to user
  contactAutoReply: ({ name, subject }) => ({
    subject: `We received your message — ${BRAND.name}`,
    html: shell(`
      <h2>Thank You for Reaching Out! 🙏</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We have received your message regarding <strong>"${subject}"</strong> and our team will get back to you within <strong>24 hours</strong>.</p>
      <div class="info-row">
        <span>📞 Need urgent help? Call us at <strong>${BRAND.phone}</strong></span>
        <span>💬 Or message us on <strong>WhatsApp</strong> for a faster response</span>
      </div>
      <div class="btn-wrap">
        <a href="https://wa.me/9779823939106?text=Hi%2C%20I%20sent%20a%20message%20about%20${encodeURIComponent(subject)}" class="btn">💬 Chat on WhatsApp</a>
      </div>
      <p>While you wait, feel free to browse our products:</p>
      <div class="btn-wrap">
        <a href="${BRAND.website}/products" class="btn" style="background:linear-gradient(135deg,${BRAND.secondary},${BRAND.primary});">🛍️ Explore Products</a>
      </div>
    `),
  }),

  // 5. Welcome / email verification after register
  welcomeVerification: ({ name, verifyLink }) => ({
    subject: `Welcome to Radhana Art, ${name}! 🪷 Verify Your Email`,
    html: shell(`
      <h2>Welcome to Radhana Art! 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for creating your account. We're excited to help you create something beautiful!</p>
      <p>Please verify your email address to activate your account:</p>
      <div class="btn-wrap">
        <a href="${verifyLink}" class="btn">✅ Verify My Email</a>
      </div>
      <div class="warning">
        ⏰ This verification link expires in <strong>24 hours</strong>.
      </div>
      <hr class="divider"/>
      <p><strong>What you can do with your account:</strong></p>
      <div class="info-row">
        <span>🛒 Track your orders in real time</span>
        <span>🎁 Save your custom design preferences</span>
        <span>📦 Get exclusive member-only offers</span>
      </div>
    `),
  }),

  // 6. Password changed confirmation
  passwordChanged: ({ name }) => ({
    subject: `Your Radhana Art Password Was Changed`,
    html: shell(`
      <h2>Password Changed Successfully 🔒</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your Radhana Art account password was just changed successfully.</p>
      <div class="warning">
        ⚠️ If you did NOT make this change, please <a href="mailto:${BRAND.email}"><strong>contact us immediately</strong></a> or reset your password using the link below.
      </div>
      <div class="btn-wrap">
        <a href="${BRAND.website}/forgot-password" class="btn">🔐 Reset My Password</a>
      </div>
    `),
  }),
};

// ══════════════════════════════════════════════
// CORE SEND FUNCTION
// ══════════════════════════════════════════════
async function sendEmail(recipient, { subject, html, body }) {
  const { data, error } = await resend.emails.send({
    from: `${BRAND.name} <noreply@radhanaenterprises.com.np>`,
    to: [recipient],
    subject,
    html: html || body, // support both new `html` key and old `body` key
  });

  if (error) {
    console.error("Resend error:", error);
    throw error;
  }
  return data;
}

export default sendEmail;
