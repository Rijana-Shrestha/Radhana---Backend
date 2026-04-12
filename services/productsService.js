import { ADMIN } from "../constants/roles.js";
import Product from "../models/Product.js";
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

  // Category filter (e.g. ?category=wooden or ?type=wooden)
  if (category) filters.category = category;
  if (type) filters.category = type; // frontend uses ?type=

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
  let imageUrls = [];

  if (files && files.length > 0) {
    const uploaded = await uploadFile(files);
    imageUrls = uploaded.map((item) => item?.secure_url || item?.url || "");
  }

  const created = await Product.create({
    ...data,
    createdBy,
    imageUrls,
    price: Number(data.price),
    maxPrice: Number(data.maxPrice) || 0,
    stock: Number(data.stock) || 99,
    popular: data.popular === "true" || data.popular === true,
    inStock: data.inStock !== "false" && data.inStock !== false,
  });

  return created;
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

  if (files && files.length > 0) {
    const uploaded = await uploadFile(files);
    updateData.imageUrls = uploaded.map(
      (item) => item?.secure_url || item?.url || "",
    );
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
