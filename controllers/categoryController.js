import Category from "../models/Category.js";

// GET all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST create a new category
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required." });
    }
    const existing = await Category.findOne({
      name: name.trim().toLowerCase(),
    });
    if (existing) {
      return res.status(409).json({ message: "Category already exists." });
    }
    const category = await Category.create({ name: name.trim().toLowerCase() });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE a category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }
    res.json({ message: "Category deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default { getCategories, createCategory, deleteCategory };
