import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required."],
    trim: true,
    lowercase: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const Category = mongoose.model("Category", categorySchema);
export default Category;
