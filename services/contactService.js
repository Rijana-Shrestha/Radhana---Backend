import Contact from "../models/Contact.js";
import uploadFile from "../utils/file.js";
import sendEmail, { templates } from "../utils/email.js";
import config from "../config/config.js";

const createMessage = async (data, file) => {
  let attachmentUrl = "";

  if (file) {
    const uploaded = await uploadFile([file]);
    attachmentUrl = uploaded[0]?.secure_url || uploaded[0]?.url || "";
  }

  const message = await Contact.create({ ...data, attachmentUrl });

  // 1. Notify admin (non-blocking)
  const adminTpl = templates.contactNotification({
    name: data.name,
    phone: data.phone,
    email: data.email || "Not provided",
    subject: data.subject,
    message: data.message,
    attachmentUrl,
  });
  sendEmail(config.adminEmail, adminTpl).catch((err) =>
    console.error("Admin notify email error:", err),
  );

  // 2. Auto-reply to user if they provided an email (non-blocking)
  if (data.email) {
    const userTpl = templates.contactAutoReply({
      name: data.name,
      subject: data.subject,
    });
    sendEmail(data.email, userTpl).catch((err) =>
      console.error("Auto-reply email error:", err),
    );
  }

  return message;
};

const getMessages = async () => {
  return await Contact.find().sort({ createdAt: -1 });
};

const markAsRead = async (id) => {
  return await Contact.findByIdAndUpdate(id, { isRead: true }, { new: true });
};

const deleteMessage = async (id) => {
  await Contact.findByIdAndDelete(id);
};

export default { createMessage, getMessages, markAsRead, deleteMessage };
