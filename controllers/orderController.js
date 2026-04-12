import orderService from "../services/orderService.js";
import uploadFile from "../utils/file.js";

const getOrders = async (req, res) => {
  try {
    const data = await orderService.getOrders();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    const data = await orderService.getOrdersByUser(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const data = await orderService.getOrderById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const createOrder = async (req, res) => {
  try {
    let {
      orderItems,
      totalPrice,
      shippingAddress,
      paymentMethod,
      orderNotes,
    } = req.body || {};

    if (typeof orderItems === "string") {
      orderItems = JSON.parse(orderItems);
    }

    if (typeof shippingAddress === "string") {
      shippingAddress = JSON.parse(shippingAddress);
    }

    if (!orderItems || !orderItems.length) {
      return res.status(400).json({ message: "Order items are required." });
    }

    if (!totalPrice) {
      return res.status(400).json({ message: "Total price is required." });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required." });
    }

    let designFileUrl = "";

    if (req.file) {
      const uploaded = await uploadFile([req.file]);
      designFileUrl = uploaded[0]?.secure_url || uploaded[0]?.url || "";
    }

    const data = await orderService.createOrder(
      {
        orderItems,
        totalPrice,
        shippingAddress,
        paymentMethod,
        orderNotes,
        designFileUrl,
      },
      req.user
    );

    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    const data = await orderService.updateOrder(
      req.params.id,
      req.body,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id, req.user);
    res.json({ message: "Order deleted successfully." });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// BUG FIX: original exported as orderPaymentViaKhalti but service exported as orderPayment
const orderPaymentViaKhalti = async (req, res) => {
  try {
    const data = await orderService.orderPayment(req.params.id, req.user);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const confirmOrderPayment = async (req, res) => {
  try {
    const data = await orderService.confirmOrderPayment(
      req.params.id,
      req.body.status,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export default {
  getOrders,
  getOrdersByUser,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  orderPaymentViaKhalti,
  confirmOrderPayment,
};
