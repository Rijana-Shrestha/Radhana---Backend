import cartService from "../services/cartService.js";

// Get user's cart
const getCart = async (req, res) => {
  try {
    const data = await cartService.getCart(req.user._id);
    res.json(data);
  } catch (error) {
    console.error('Error in getCart controller:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { product, quantity = 1, price, name } = req.body;

    if (!product || !price || !name) {
      return res
        .status(400)
        .json({
          message: "Product ID, price, and name are required",
        });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const data = await cartService.addToCart(req.user._id, {
      product,
      quantity,
      price,
      name,
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error in addToCart controller:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Product ID and quantity are required" });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const data = await cartService.updateCartItem(req.user._id, productId, quantity);

    res.json(data);
  } catch (error) {
    console.error('Error in updateCartItem controller:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const data = await cartService.removeFromCart(req.user._id, productId);

    res.json(data);
  } catch (error) {
    console.error('Error in removeFromCart controller:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Clear entire cart
const clearCart = async (req, res) => {
  try {
    const data = await cartService.clearCart(req.user._id);

    res.json(data);
  } catch (error) {
    console.error('Error in clearCart controller:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
