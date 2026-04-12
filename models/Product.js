import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required."],
    trim: true,
  },
  // Radhana Art categories: wooden, qr, keyring, award, numberplate, signboard, neon, mug, leafart
  category: {
    type: String,
    required: [true, "Product category is required."],
    enum: [
      "wooden",
      "qr",
      "keyring",
      "award",
      "numberplate",
      "signboard",
      "neon",
      "mug",
      "leafart",
    ],
  },
  // Broader catalog grouping
  cat: {
    type: String,
    enum: ["personalized", "corporate", "homedecor"],
    default: "personalized",
  },
  description: {
    type: String,
    default: "",
  },
  price: {
    type: Number,
    required: [true, "Starting price is required."],
    min: [1, "Price must be positive."],
  },
  maxPrice: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 99,
    max: [100000, "Stock must not exceed 100,000"],
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  imageUrls: {
    type: [String],
    default: [],
  },
  badge: {
    type: String,
    default: "",
    enum: [
      "",
      "Popular",
      "New",
      "Trending",
      "Hot",
      "Sale",
      "Premium",
      "Unique",
    ],
  },
  stars: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  popular: {
    type: Boolean,
    default: false,
  },
  // Who is this gift for (for filtering)
  forWho: {
    type: [String],
    default: [],
  },
  // Festivals this product suits
  festival: {
    type: [String],
    default: [],
  },
  // Occasions
  occasion: {
    type: [String],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Created by user id is required."],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const model = mongoose.model("Product", productSchema);

export default model;
