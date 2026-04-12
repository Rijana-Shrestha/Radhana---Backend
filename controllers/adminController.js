import Order from "../models/Order.js";

const getReportsSummary = async (req, res) => {
  try {
    // Get all orders (no filter for now - adjust if needed)
    const orders = await Order.find();

    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    // Get total number of orders
    const totalOrders = orders.length;

    // Group orders by status and count
    const ordersByStatus = [];
    const statusMap = {};

    orders.forEach((order) => {
      const status = order.status.toLowerCase();
      if (statusMap[status]) {
        statusMap[status]++;
      } else {
        statusMap[status] = 1;
      }
    });

    // Convert map to array format for charts
    Object.keys(statusMap).forEach((status) => {
      ordersByStatus.push({
        _id: status,
        count: statusMap[status],
      });
    });

    res.status(200).json({
      totalRevenue,
      totalOrders,
      ordersByStatus,
    });
  } catch (error) {
    console.error("Error fetching reports summary:", error.message);
    res.status(500).json({
      message: "Failed to fetch reports summary",
      error: error.message,
    });
  }
};

export default {
  getReportsSummary,
};
