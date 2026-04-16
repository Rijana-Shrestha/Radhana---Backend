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
    // Validate required fields
    if (!req.body.name || !req.body.category || !req.body.price) {
      return res.status(400).json({ 
        message: "Missing required fields: name, category, price" 
      });
    }

    // Validate user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const data = await productsService.createProduct(
      req.body,
      req.files,
      req.user._id,
    );
    res.status(201).json(data);
  } catch (error) {
    console.error("Error creating product:", error.message || error);
    console.error("Stack trace:", error.stack);
    res.status(error.statusCode || 500).json({ 
      message: error.message || "Failed to create product",
      ...(process.env.NODE_ENV === 'development' && { error: error.toString() })
    });
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
