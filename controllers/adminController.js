import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Product from "../models/Product.js";

const getReportsSummary = async (req, res) => {
  try {
    const [orders, payments, users, products] = await Promise.all([
      Order.find()
        .populate("orderItems.product", "name price category")
        .populate("payment"),
      Payment.find({ status: "COMPLETED" }),
      User.find({ roles: { $in: ["USER"] } }),
      (async () => {
        try {
          const P = (await import("../models/Product.js")).default;
          return P.find();
        } catch {
          return [];
        }
      })(),
    ]);

    // ── Basic KPIs ───────────────────────────────────────────
    const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const totalOrders = orders.length;
    const paidRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCustomers = users.length;
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // ── Orders by status ─────────────────────────────────────
    const statusMap = {};
    orders.forEach((o) => {
      const s = (o.status || "unknown").toLowerCase();
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const ordersByStatus = Object.entries(statusMap).map(([_id, count]) => ({
      _id,
      count,
    }));

    // ── Orders by payment method ─────────────────────────────
    const methodMap = {};
    orders.forEach((o) => {
      const m = o.paymentMethod || "unknown";
      methodMap[m] = (methodMap[m] || 0) + 1;
    });
    const ordersByPaymentMethod = Object.entries(methodMap).map(
      ([_id, count]) => ({ _id, count }),
    );

    // ── Revenue by payment method ────────────────────────────
    const methodRevMap = {};
    orders.forEach((o) => {
      const m = o.paymentMethod || "unknown";
      methodRevMap[m] = (methodRevMap[m] || 0) + (o.totalPrice || 0);
    });
    const revenueByPaymentMethod = Object.entries(methodRevMap).map(
      ([_id, revenue]) => ({ _id, revenue }),
    );

    // ── Monthly revenue & orders (last 12 months) ────────────
    const now = new Date();
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
    }
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalPrice || 0;
        monthlyMap[key].orders += 1;
      }
    });
    const monthlyRevenue = Object.values(monthlyMap);

    // ── Daily orders (last 30 days) ──────────────────────────
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { date: key, orders: 0, revenue: 0 };
    }
    orders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().split("T")[0];
      if (dailyMap[key]) {
        dailyMap[key].orders += 1;
        dailyMap[key].revenue += o.totalPrice || 0;
      }
    });
    const dailyOrders = Object.values(dailyMap);

    // ── Top products by revenue ──────────────────────────────
    const productMap = {};
    orders.forEach((o) => {
      (o.orderItems || []).forEach((item) => {
        const name = item.product?.name || "Unknown";
        if (!productMap[name])
          productMap[name] = { name, revenue: 0, quantity: 0 };
        productMap[name].revenue += (item.price || 0) * (item.quantity || 1);
        productMap[name].quantity += item.quantity || 1;
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── New customers per month (last 6 months) ──────────────
    const custMonthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      custMonthMap[key] = { month: key, customers: 0 };
    }
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (custMonthMap[key]) custMonthMap[key].customers += 1;
    });
    const newCustomersPerMonth = Object.values(custMonthMap);

    // ── Conversion: pending vs confirmed vs delivered ─────────
    const pendingCount = statusMap["pending"] || 0;
    const confirmedCount = statusMap["confirmed"] || 0;
    const shippedCount = statusMap["shipped"] || 0;
    const deliveredCount = statusMap["delivered"] || 0;

    res.status(200).json({
      // KPIs
      totalRevenue,
      paidRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      deliveredCount,
      pendingCount,
      confirmedCount,
      shippedCount,
      // Charts
      ordersByStatus,
      ordersByPaymentMethod,
      revenueByPaymentMethod,
      monthlyRevenue,
      dailyOrders,
      topProducts,
      newCustomersPerMonth,
    });
  } catch (error) {
    console.error("Error fetching reports summary:", error.message);
    res
      .status(500)
      .json({
        message: "Failed to fetch reports summary",
        error: error.message,
      });
  }
};

export default { getReportsSummary };
