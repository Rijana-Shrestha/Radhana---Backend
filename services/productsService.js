import { ADMIN } from "../constants/roles.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import uploadFile from "../utils/file.js";

const getAllProducts = async (query) => {
  const {
    category,
    cat,
    min,
    max,
    limit = 50,
    offset = 0,
    name,
    type,
    forWho,
    festival,
    occ,
    maxprice,
    q,
  } = query;

  const filters = { isActive: true };

  // Category filter - convert category name to ObjectId
  if (category) {
    const categoryDoc = await Category.findOne({ name: category.toLowerCase() });
    if (categoryDoc) filters.category = categoryDoc._id;
  }
  if (type) {
    const categoryDoc = await Category.findOne({ name: type.toLowerCase() });
    if (categoryDoc) filters.category = categoryDoc._id;
  }

  // Broad catalog filter (personalized / corporate / homedecor)
  if (cat) filters.cat = cat;

  // Price filters
  if (min) filters.price = { $gte: Number(min) };
  if (max) filters.price = { ...filters.price, $lte: Number(max) };
  if (maxprice) filters.price = { ...filters.price, $lte: Number(maxprice) };

  // Name / search
  if (name) filters.name = { $regex: name, $options: "i" };
  if (q) filters.name = { $regex: q, $options: "i" };

  // For whom filter
  if (forWho) filters.forWho = { $in: [forWho] };

  // Festival filter
  if (festival) filters.festival = { $in: [festival] };

  // Occasion filter
  if (occ) filters.occasion = { $in: [occ] };

  const products = await Product.find(filters)
    .sort({ popular: -1, createdAt: -1 })
    .limit(Number(limit))
    .skip(Number(offset));

  return products;
};

const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw { statusCode: 404, message: "Product not found." };
  return product;
};

const createProduct = async (data, files, createdBy) => {
  try {
    // Validate required fields
    if (!data.name || !data.category || !data.price) {
      throw {
        statusCode: 400,
        message: "Missing required fields: name, category, price"
      };
    }

    // Validate category and get its ObjectId
    const categoryDoc = await Category.findOne({ name: data.category.toLowerCase() });
    if (!categoryDoc) {
      const validCategories = await Category.find().distinct('name');
      throw {
        statusCode: 400,
        message: `Invalid category. Must be one of: ${validCategories.join(", ")}`
      };
    }

    let imageUrls = [];

    if (files && Array.isArray(files) && files.length > 0) {
      try {
        const uploaded = await uploadFile(files);
        
        if (!uploaded || uploaded.length === 0) {
          throw {
            statusCode: 400,
            message: "Failed to upload images. Please upload the image and try again"
          };
        }

        imageUrls = uploaded.map((item) => item?.secure_url || item?.url || "");
      } catch (uploadError) {
        // If error already has statusCode, re-throw it
        if (uploadError.statusCode) throw uploadError;
        
        throw {
          statusCode: 400,
          message: uploadError.message || "Failed to upload images"
        };
      }
    }

    const created = await Product.create({
      ...data,
      category: categoryDoc._id,
      createdBy,
      imageUrls,
      price: Number(data.price),
      maxPrice: Number(data.maxPrice) || 0,
      stock: Number(data.stock) || 99,
      popular: data.popular === "true" || data.popular === true,
      inStock: data.inStock !== "false" && data.inStock !== false,
    });

    return created;
  } catch (error) {
    console.error("Error in createProduct service:", error.message || error);
    throw error;
  }
};

const updateProduct = async (id, data, files, user) => {
  const product = await getProductById(id);

  // Only admin can update any product
  if (
    !user.roles.includes(ADMIN) &&
    product.createdBy.toString() !== user._id.toString()
  ) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  const updateData = { ...data };

  // If category is being updated, validate and convert to ObjectId
  if (updateData.category) {
    const categoryDoc = await Category.findOne({ name: updateData.category.toLowerCase() });
    if (!categoryDoc) {
      const validCategories = await Category.find().distinct('name');
      throw {
        statusCode: 400,
        message: `Invalid category. Must be one of: ${validCategories.join(", ")}`
      };
    }
    updateData.category = categoryDoc._id;
  }

  if (files && Array.isArray(files) && files.length > 0) {
    try {
      const uploaded = await uploadFile(files);
      
      if (!uploaded || uploaded.length === 0) {
        throw {
          statusCode: 400,
          message: "Failed to upload images. Please try again"
        };
      }

      updateData.imageUrls = uploaded.map(
        (item) => item?.secure_url || item?.url || "",
      );
    } catch (uploadError) {
      // If error already has statusCode, re-throw it
      if (uploadError.statusCode) throw uploadError;
      
      throw {
        statusCode: 400,
        message: uploadError.message || "Failed to upload images"
      };
    }
  }

  if (updateData.price) updateData.price = Number(updateData.price);
  if (updateData.maxPrice) updateData.maxPrice = Number(updateData.maxPrice);
  if (updateData.stock) updateData.stock = Number(updateData.stock);
  if (updateData.popular !== undefined)
    updateData.popular = updateData.popular === "true" || updateData.popular === true;
  if (updateData.inStock !== undefined)
    updateData.inStock = updateData.inStock !== "false" && updateData.inStock !== false;

  return await Product.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteProduct = async (id, user) => {
  const product = await getProductById(id);

  if (
    !user.roles.includes(ADMIN) &&
    product.createdBy.toString() !== user._id.toString()
  ) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  // Soft delete
  await Product.findByIdAndUpdate(id, { isActive: false });
};

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
