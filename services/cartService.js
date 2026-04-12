import Cart from "../models/Cart.js";
import mongoose from "mongoose";

class CartService {
  async getCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.product"
      );
      if (!cart) {
        return { user: userId, items: [] };
      }
      return cart;
    } catch (error) {
      console.error('Error in getCart:', error);
      throw error;
    }
  }

  async addToCart(userId, { product, quantity, price, name }) {
    try {
      // Validate product ID
      if (!mongoose.Types.ObjectId.isValid(product)) {
        const error = new Error("Invalid product ID format");
        error.statusCode = 400;
        throw error;
      }

      let cart = await Cart.findOne({ user: userId });

      if (!cart) {
        // Create new cart
        cart = new Cart({
          user: userId,
          items: [{ 
            product: new mongoose.Types.ObjectId(product), 
            quantity, 
            price, 
            name 
          }],
        });
      } else {
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
          (item) => item.product.toString() === product.toString()
        );

        if (existingItemIndex > -1) {
          // Update quantity if product exists
          cart.items[existingItemIndex].quantity += quantity;
        } else {
          // Add new item if it doesn't exist
          cart.items.push({ 
            product: new mongoose.Types.ObjectId(product), 
            quantity, 
            price, 
            name 
          });
        }
      }

      await cart.save();
      return await Cart.findOne({ user: userId }).populate("items.product");
    } catch (error) {
      console.error('Error in addToCart:', error);
      error.statusCode = error.statusCode || 500;
      throw error;
    }
  }

  async updateCartItem(userId, productId, quantity) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId.toString()
      );

      if (itemIndex === -1) {
        const error = new Error("Product not found in cart");
        error.statusCode = 404;
        throw error;
      }

      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }

      await cart.save();
      return await Cart.findOne({ user: userId }).populate("items.product");
    } catch (error) {
      console.error('Error in updateCartItem:', error);
      error.statusCode = error.statusCode || 500;
      throw error;
    }
  }

  async removeFromCart(userId, productId) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
      }

      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId.toString()
      );

      await cart.save();
      return await Cart.findOne({ user: userId }).populate("items.product");
    } catch (error) {
      console.error('Error in removeFromCart:', error);
      error.statusCode = error.statusCode || 500;
      throw error;
    }
  }

  async clearCart(userId) {
    try {
      const cart = await Cart.findOneAndUpdate(
        { user: userId },
        { items: [] },
        { new: true }
      );

      if (!cart) {
        return { user: userId, items: [] };
      }

      return cart;
    } catch (error) {
      console.error('Error in clearCart:', error);
      throw error;
    }
  }
}

export default new CartService();
