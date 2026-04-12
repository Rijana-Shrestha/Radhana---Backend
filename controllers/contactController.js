import contactService from "../services/contactService.js";

const createMessage = async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required." });
    if (!phone) return res.status(400).json({ message: "Phone is required." });
    if (!subject)
      return res.status(400).json({ message: "Subject is required." });
    if (!message)
      return res.status(400).json({ message: "Message is required." });

    const data = await contactService.createMessage(req.body, req.file);
    res.status(201).json({ message: "Message sent successfully.", data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const data = await contactService.getMessages();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const data = await contactService.markAsRead(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    await contactService.deleteMessage(req.params.id);
    res.json({ message: "Message deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default { createMessage, getMessages, markAsRead, deleteMessage };
