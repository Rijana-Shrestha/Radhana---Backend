import Contact from "../models/Contact.js";
import uploadFile from "../utils/file.js";
import sendEmail from "../utils/email.js";
import config from "../config/config.js";

const createMessage = async (data, file) => {
  let attachmentUrl = "";

  if (file) {
    const uploaded = await uploadFile([file]);
    attachmentUrl = uploaded[0]?.secure_url || uploaded[0]?.url || "";
  }

  const message = await Contact.create({ ...data, attachmentUrl });

  // Notify admin by email (non-blocking)
  sendEmail(config.adminEmail, {
    subject: `New Contact Message: ${data.subject}`,
    body: `
      <h3>New message from ${data.name}</h3>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Email:</strong> ${data.email || "N/A"}</p>
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p><strong>Message:</strong><br/>${data.message}</p>
      ${attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${attachmentUrl}">View File</a></p>` : ""}
    `,
  }).catch((err) => console.error("Email notify error:", err));

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
