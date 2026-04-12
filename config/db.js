import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  try {
    const connectionOptions = {
      retryWrites: true,
      w: "majority",
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    };

    await mongoose.connect(config.MONGODB_URL, connectionOptions);
    console.log(`✓ MongoDB Connected Successfully`);

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠ MongoDB disconnected - reconnecting...");
    });

    mongoose.connection.on("error", (err) => {
      console.error("✗ MongoDB connection error:", err.message);
    });
  } catch (error) {
    console.error("✗ Initial MongoDB connection error:", error.message);
    console.log("⟳ Retrying in 5 seconds...");
    setTimeout(() => connectDB(), 5000);
  }
};

export default connectDB;
