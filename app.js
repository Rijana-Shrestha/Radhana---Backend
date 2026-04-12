import express from "express";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/config.js";
import connectDB from "./config/db.js";
import connectCloudinary from "./config/cloudinary.js";
import authRoutes from "./routes/authRoute.js";
import productsRoutes from "./routes/productsRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import userRoutes from "./routes/userRoute.js";
import contactRoutes from "./routes/contactRoute.js";
import galleryRoutes from "./routes/galleryRoute.js";
import invoiceRoutes from "./routes/invoiceRoute.js";
import cartRoutes from "./routes/cartRoute.js";
import adminRoutes from "./routes/adminRoute.js";
import bodyParser from "body-parser";
import logger from "./middlewares/logger.js";
import auth from "./middlewares/auth.js";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Connect to database
connectDB();
connectCloudinary();

// ── CORS ── allow your frontend origin (update in production)
app.use(
  cors({
    origin: config.frontendUrl || "http://localhost:5173", // Live Server default
    credentials: true, // allow cookies
  }),
);

app.use(cookieParser()); // parse cookies properly
// Body parser - skip multipart data (let multer handle it)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(logger);

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/products", upload.array("images", 5), productsRoutes);
app.use("/api/orders", auth, upload.single("designFile"), orderRoutes);
app.use("/api/users", auth, upload.single("image"), userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/invoices", auth, invoiceRoutes);
app.use("/api/cart", auth, cartRoutes);
app.use("/api/admin", auth, adminRoutes);

// Gallery accepts multiple files + text fields (title, category, description, etc.)
app.use(
  "/api/gallery",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "title", maxCount: 1 },
    { name: "category", maxCount: 1 },
    { name: "description", maxCount: 1 },
  ]),
  galleryRoutes,
);

// Graceful error handling for unhandled errors
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(config.PORT, () => {
  console.log(`Server running at port ${config.PORT}...`);
});
