import mongoose from "mongoose";
import { USER, ADMIN } from "../constants/roles.js";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required."],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Invalid email address.",
    },
  },
  password: {
    type: String,
    required: [true, "Password is required."],
    minLength: [6, "Password must be at least 6 characters."],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required."],
    unique: true,
    sparse: true,
    validate: {
      validator: function (v) {
        const cleaned = v.replace(/[\s\-]/g, "");
        return /^(\+977|977)?(98|97|96)\d{8}$/.test(cleaned);
      },
      message:
        "Please enter a valid Nepali phone number (e.g. 9812345678 or +9779812345678).",
    },
  },
  address: {
    city: { type: String, default: "" },
    country: { type: String, default: "Nepal" },
    province: { type: String, default: "" },
    street: { type: String, default: "" },
  },
  roles: {
    type: [String],
    default: [USER],
    enum: [USER, ADMIN],
  },
  profileImageUrl: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

// Drop existing indexes before recreating them
userSchema.on("index", function (error) {
  if (error.code === 11000) {
    console.warn("⚠ Duplicate key error - ensure unique email/phone");
  }
});

const model = mongoose.model("User", userSchema);

export default model;
