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
  // 24 hours (was 1 minute — way too short!)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const model = mongoose.model("EmailVerification", emailVerificationSchema);
export default model;
