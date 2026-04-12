import productsService from "../services/productsService.js";

const getProducts = async (req, res) => {
  try {
    const products = await productsService.getAllProducts(req.query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  // BUG FIX: original had try/catch with error reference outside catch block
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const data = await productsService.createProduct(
      req.body,
      req.files,
      req.user._id,
    );
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const data = await productsService.updateProduct(
      req.params.id,
      req.body,
      req.files,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productsService.deleteProduct(req.params.id, req.user);
    res.json({ message: `Product deleted successfully.` });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
