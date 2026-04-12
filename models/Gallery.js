import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Gallery item title is required."],
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  // Category matches product categories for filtering
  cat: {
    type: String,
    required: [true, "Category is required."],
    enum: [
      "wooden",
      "qr",
      "keyring",
      "award",
      "numberplate",
      "signboard",
      "mug",
      "leafart",
      "neon",
    ],
  },
  imageUrls: {
    type: [String],
    required: [true, "At least one image is required."],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const model = mongoose.model("Gallery", gallerySchema);

export default model;
