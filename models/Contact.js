import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required."],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, "Phone is required."],
  },
  email: {
    type: String,
    default: "",
    lowercase: true,
    trim: true,
  },
  subject: {
    type: String,
    required: [true, "Subject is required."],
  },
  message: {
    type: String,
    required: [true, "Message is required."],
  },
  attachmentUrl: {
    type: String,
    default: "",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const model = mongoose.model("Contact", contactSchema);

export default model;
