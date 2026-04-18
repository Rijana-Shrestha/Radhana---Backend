import mongoose from "mongoose";

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required."],
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: [true, "Verification token is required."],
  },
  expiresAt: {
    type: Date,
    default: () => Date.now() + 60000, // 1 minute
  },
  verified: {
    type: Boolean,
    default: false,
  },
  userData: {
    name: String,
    phone: String,
    password: String,
    address: Object,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const model = mongoose.model("EmailVerification", emailVerificationSchema);

export default model;
