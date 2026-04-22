import { Resend } from "resend";
import config from "../config/config.js";
const logo = "https://radhana.com.np/assets/radhanalogo.png";

const resend = new Resend(config.emailApiKey);

const BRAND = {
  primary: "#145faf",
  secondary: "#D93A6A",
  dark: "#1a1a2e",
  name: "Radhana Art",
  tagline: "Laser Engraving · Kathmandu, Nepal",
  phone: "+977 9823939106",
  email: "info@radhana.com.np",
  address: "Sitapaila, Kathmandu, Nepal",
  website: "https://radhana.com.np",
  emoji: "logo",
};

const shell = (body) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0f2f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
a{color:${BRAND.primary};}
.wrap{max-width:620px;margin:32px auto;padding:0 16px 40px;}
.hdr{background:linear-gradient(135deg,${BRAND.primary},${BRAND.secondary});border-radius:16px 16px 0 0;padding:32px 40px 28px;text-align:center;}
.hdr-name{color:#fff;font-size:26px;font-weight:700;font-family:Georgia,serif;}
.hdr-tag{color:rgba(255,255,255,.75);font-size:12px;margin-top:4px;}
.card{background:#fff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;}
.card h2{color:${BRAND.dark};font-size:22px;font-weight:700;margin-bottom:16px;font-family:Georgia,serif;}
.card p{color:#4b5563;font-size:15px;line-height:1.7;margin-bottom:14px;}
.card p strong{color:${BRAND.dark};}
.btn-wrap{text-align:center;margin:28px 0;}
.btn{display:inline-block;background:linear-gradient(135deg,${BRAND.primary},${BRAND.secondary});color:#fff!important;text-decoration:none;padding:15px 36px;border-radius:12px;font-weight:700;font-size:15px;}
.otp-box{background:linear-gradient(135deg,#f8f9ff,#eef2ff);border:2px dashed ${BRAND.primary};border-radius:14px;text-align:center;padding:24px 20px;margin:24px 0;}
.otp-label{color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.otp-code{color:${BRAND.primary};font-size:42px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;}
.otp-exp{color:#9ca3af;font-size:12px;margin-top:10px;}
.info{background:#f9fafb;border-left:4px solid ${BRAND.primary};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;font-size:14px;color:#374151;}
.info span{display:block;margin-bottom:6px;}
.warn{background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e;margin:16px 0;}
.divider{border:none;border-top:1px solid #e5e7eb;margin:24px 0;}
.ftr{background:${BRAND.dark};border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;}
.ftr p{color:rgba(255,255,255,.55);font-size:12px;line-height:1.8;margin:0;}
.ftr a{color:rgba(255,255,255,.75);text-decoration:none;}
.ftr-brand{color:#fff;font-weight:700;font-size:14px;margin-bottom:8px;font-family:Georgia,serif;}
.social a{display:inline-block;background:rgba(255,255,255,.1);color:#fff!important;text-decoration:none;padding:6px 14px;border-radius:20px;font-size:12px;margin:0 4px;}
</style></head><body>
<div class="wrap">
<div class="hdr">
  <div style="font-size:40px;line-height:1;margin-bottom:8px;">${BRAND.emoji}</div>
  <div class="hdr-name">${BRAND.name}</div>
  <div class="hdr-tag">${BRAND.tagline}</div>
</div>
<div class="card">${body}</div>
<div class="ftr">
  <div class="ftr-brand">${BRAND.emoji} ${BRAND.name}</div>
  <p>${BRAND.address}<br/>
  <a href="tel:${BRAND.phone}">${BRAND.phone}</a> &nbsp;·&nbsp;
  <a href="mailto:${BRAND.email}">${BRAND.email}</a></p>
  <div class="social" style="margin:14px 0;">
    <a href="${BRAND.website}">🌐 Website</a>
    <a href="https://wa.me/9779823939106">💬 WhatsApp</a>
  </div>
  <p style="margin-top:14px;font-size:11px;">© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
</div>
</div></body></html>`;

export const templates = {
  // Simple welcome email — no verification link needed
  welcomeEmail: ({ name }) => ({
    subject: `Welcome to Radhana Art, ${name}! 🪷`,
    html: shell(`
      <h2>Welcome to Radhana Art! 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for creating your account. You can now shop our full collection of custom laser-engraved products!</p>
      <div class="btn-wrap"><a href="${BRAND.website}/products" class="btn">🛍️ Explore Products</a></div>
      <div class="info">
        <span>🛒 Track your orders in real time</span>
        <span>🎁 Save your custom design preferences</span>
        <span>📦 Get exclusive member-only offers</span>
        <span>💬 WhatsApp us anytime for help</span>
      </div>
      <div class="btn-wrap">
        <a href="https://wa.me/9779823939106" class="btn" style="background:linear-gradient(135deg,#25d366,#128c7e);">💬 Chat on WhatsApp</a>
      </div>
    `),
  }),

  verifyEmail: ({ name, verifyLink }) => ({
    subject: `Verify your Radhana Art email address 🪷`,
    html: shell(`
      <h2>Verify Your Email Address</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with Radhana Art! Please verify your email address to activate your account and start shopping.</p>
      <div class="btn-wrap"><a href="${verifyLink}" class="btn">✅ Verify My Email</a></div>
      <div class="warn">⏰ This link expires in <strong>24 hours</strong>. If you did not create an account, ignore this email.</div>
      <hr class="divider"/>
      <p style="font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link:<br/>
      <a href="${verifyLink}" style="word-break:break-all;font-size:12px;">${verifyLink}</a></p>
    `),
  }),

  resetPassword: ({ name, resetLink }) => ({
    subject: "Reset Your Radhana Art Password 🔐",
    html: shell(`
      <h2>Reset Your Password</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your Radhana Art password. Click below to set a new one:</p>
      <div class="btn-wrap"><a href="${resetLink}" class="btn">🔐 Reset My Password</a></div>
      <div class="warn">⏰ This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</div>
      <hr class="divider"/>
      <p style="font-size:13px;color:#9ca3af;">If the button doesn't work:<br/>
      <a href="${resetLink}" style="word-break:break-all;font-size:12px;">${resetLink}</a></p>
    `),
  }),

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
      <p>You have received a new message through the contact form.</p>
      <div class="info">
        <span>👤 <strong>Name:</strong> ${name}</span>
        <span>📞 <strong>Phone:</strong> ${phone}</span>
        <span>📧 <strong>Email:</strong> ${email || "Not provided"}</span>
        <span>📌 <strong>Subject:</strong> ${subject}</span>
      </div>
      <p><strong>Message:</strong></p>
      <div class="info" style="border-left-color:${BRAND.secondary};">
        <span style="white-space:pre-wrap;">${message}</span>
      </div>
      ${attachmentUrl ? `<div class="btn-wrap"><a href="${attachmentUrl}" class="btn">📎 View Attachment</a></div>` : ""}
      <hr class="divider"/>
      <p style="font-size:13px;color:#6b7280;">Reply at <a href="mailto:${email}">${email}</a> or call <a href="tel:${phone}">${phone}</a>.</p>
    `),
  }),

  contactAutoReply: ({ name, subject }) => ({
    subject: `We received your message — ${BRAND.name}`,
    html: shell(`
      <h2>Thank You for Reaching Out! 🙏</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We have received your message about <strong>"${subject}"</strong> and will reply within <strong>24 hours</strong>.</p>
      <div class="info">
        <span>📞 Urgent? Call <strong>${BRAND.phone}</strong></span>
        <span>💬 Or WhatsApp us for a faster response</span>
      </div>
      <div class="btn-wrap">
        <a href="https://wa.me/9779823939106?text=Hi%2C%20I%20sent%20a%20message%20about%20${encodeURIComponent(subject)}" class="btn">💬 Chat on WhatsApp</a>
      </div>
    `),
  }),

  passwordChanged: ({ name }) => ({
    subject: "Your Radhana Art Password Was Changed",
    html: shell(`
      <h2>Password Changed Successfully 🔒</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account password was just changed successfully.</p>
      <div class="warn">⚠️ If you did NOT make this change, <a href="mailto:${BRAND.email}"><strong>contact us immediately</strong></a> or reset your password below.</div>
      <div class="btn-wrap"><a href="${BRAND.website}/forgot-password" class="btn">🔐 Reset My Password</a></div>
    `),
  }),
};

// Core send function — supports both old { body } and new { html }
async function sendEmail(recipient, { subject, html, body }) {
  if (!config.emailApiKey) {
    throw new Error(
      "EMAIL_API_KEY is not set. Add it to your .env file:\nEMAIL_API_KEY=re_xxxxxxxxx",
    );
  }
  const { data, error } = await resend.emails.send({
    from: `${BRAND.name} <info@radhana.com.np>`,
    to: [recipient],
    subject,
    html: html || body,
  });
  if (error) {
    console.error("Resend error:", error);
    throw error;
  }
  return data;
}

export default sendEmail;
