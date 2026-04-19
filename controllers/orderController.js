import orderService from "../services/orderService.js";
import uploadFile from "../utils/file.js";

const getOrders = async (req, res) => {
  try {
    res.json(await orderService.getOrders());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const getOrdersByUser = async (req, res) => {
  try {
    res.json(await orderService.getOrdersByUser(req.user._id));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    res.json(await orderService.getOrderById(req.params.id));
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

const createOrder = async (req, res) => {
  try {
    let { orderItems, totalPrice, shippingAddress, paymentMethod, orderNotes } =
      req.body || {};
    if (typeof orderItems === "string") orderItems = JSON.parse(orderItems);
    if (typeof shippingAddress === "string")
      shippingAddress = JSON.parse(shippingAddress);
    if (!orderItems?.length)
      return res.status(400).json({ message: "Order items are required." });
    if (!totalPrice)
      return res.status(400).json({ message: "Total price is required." });
    if (!shippingAddress)
      return res.status(400).json({ message: "Shipping address is required." });

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
      req.user,
    );
    res.status(201).json(data);
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

const updateOrder = async (req, res) => {
  try {
    res.json(await orderService.updateOrder(req.params.id, req.body, req.user));
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    await orderService.deleteOrder(req.params.id, req.user);
    res.json({ message: "Order deleted successfully." });
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// ── KHALTI: initiate ─────────────────────────────────────────
const orderPaymentViaKhalti = async (req, res) => {
  try {
    res.json(await orderService.orderPayment(req.params.id, req.user));
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// ── KHALTI: verify (called after Khalti redirects user back) ──
// GET /api/orders/:id/verify-khalti?pidx=xxx
const verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx } = req.query;
    if (!pidx) return res.status(400).json({ message: "pidx is required." });
    const data = await orderService.verifyKhaltiPayment(
      pidx,
      req.params.id,
      req.user,
    );
    res.json(data);
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// ── FONEPAY: initiate ─────────────────────────────────────────
const orderPaymentViaFonepay = async (req, res) => {
  try {
    res.json(await orderService.orderPaymentFonepay(req.params.id, req.user));
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// ── FONEPAY: verify callback ──────────────────────────────────
// GET /api/orders/verify-fonepay?PRN=FP-{orderId}-{ts}&RC=...&DV=...
// Note: No :id param — orderId is extracted from PRN
const verifyFonepayPayment = async (req, res) => {
  try {
    // Extract orderId from PRN (format: FP-{orderId}-{timestamp})
    const prn = req.query.PRN || "";
    const parts = prn.split("-");
    // PRN format: FP-{mongoId(24chars)}-{timestamp}
    // parts[0]=FP, parts[1]=orderId, parts[2..]=timestamp parts
    const orderId = parts.length >= 2 ? parts[1] : null;

    if (!orderId)
      return res
        .status(400)
        .json({ message: "Cannot extract order ID from PRN: " + prn });

    const data = await orderService.verifyFonepayPayment(
      req.query,
      orderId,
      req.user,
    );
    res.json(data);
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
  }
};

// Legacy
const confirmOrderPayment = async (req, res) => {
  try {
    res.json(
      await orderService.confirmOrderPayment(
        req.params.id,
        req.body.status,
        req.user,
      ),
    );
  } catch (e) {
    res.status(e.statusCode || 500).json({ message: e.message });
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
  verifyKhaltiPayment,
  orderPaymentViaFonepay,
  verifyFonepayPayment,
  confirmOrderPayment,
};
