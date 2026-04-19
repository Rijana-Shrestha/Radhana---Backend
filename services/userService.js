import { ADMIN } from "../constants/roles.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import uploadFile from "../utils/file.js";
import bcrypt from "bcryptjs";

const safeUser = (user) => {
  const u = user.toObject ? user.toObject() : user;
  delete u.password;
  return u;
};

const createUser = async (data) => {
  const created = await User.create(data);
  return safeUser(created);
};

// ── Get all users WITH order stats (totalOrders + totalSpent) ─
// Uses aggregation to join orders — fixes the "0 orders / Rs. 0" bug
const getUsers = async () => {
  // Step 1: Get all users
  const users = await User.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  // Step 2: Aggregate orders grouped by user
  const orderStats = await Order.aggregate([
    {
      $group: {
        _id: "$user",
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalPrice" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  // Step 3: Build a lookup map for fast access
  const statsMap = {};
  orderStats.forEach((s) => {
    statsMap[s._id.toString()] = {
      totalOrders: s.totalOrders,
      totalSpent: s.totalSpent,
      lastOrderAt: s.lastOrderAt,
    };
  });

  // Step 4: Merge stats into each user
  return users.map((u) => {
    const stats = statsMap[u._id.toString()] || {
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
    };
    return {
      ...u,
      totalOrders: stats.totalOrders,
      totalSpent: stats.totalSpent,
      lastOrderAt: stats.lastOrderAt,
    };
  });
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) throw { statusCode: 404, message: "User not found." };
  return user;
};

const updateUser = async (id, data, authUser) => {
  const user = await getUserById(id);

  const isOwner = user._id.toString() === authUser._id.toString();
  const isAdmin = authUser.roles.includes(ADMIN);

  if (!isOwner && !isAdmin) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  return await User.findByIdAndUpdate(
    id,
    { name: data.name, phone: data.phone, address: data.address },
    { new: true },
  ).select("-password");
};

const deleteUser = async (id) => {
  await User.findByIdAndDelete(id);
};

const updateProfileImage = async (id, file, authUser) => {
  const user = await getUserById(id);

  const isOwner = user._id.toString() === authUser._id.toString();
  const isAdmin = authUser.roles.includes(ADMIN);

  if (!isOwner && !isAdmin) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  const uploadedFiles = await uploadFile([file]);
  return await User.findByIdAndUpdate(
    id,
    { profileImageUrl: uploadedFiles[0]?.secure_url || uploadedFiles[0]?.url },
    { new: true },
  ).select("-password");
};

const getProfile = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) throw { statusCode: 404, message: "User not found." };
  return user;
};

const changePassword = async (
  id,
  { currentPassword, newPassword, confirmPassword },
  authUser,
) => {
  const isOwner = id === authUser._id.toString();
  const isAdmin = authUser.roles.includes(ADMIN);
  if (!isOwner && !isAdmin)
    throw { statusCode: 403, message: "Access Denied." };

  if (!newPassword || newPassword.length < 6)
    throw {
      statusCode: 400,
      message: "New password must be at least 6 characters.",
    };
  if (newPassword !== confirmPassword)
    throw { statusCode: 400, message: "New passwords do not match." };

  const user = await User.findById(id);
  if (!user) throw { statusCode: 404, message: "User not found." };

  const isMatch = bcrypt.compareSync(currentPassword, user.password);
  if (!isMatch)
    throw { statusCode: 400, message: "Current password is incorrect." };

  const hashed = bcrypt.hashSync(newPassword, 10);
  await User.findByIdAndUpdate(id, { password: hashed });
  return { message: "Password changed successfully." };
};

export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfileImage,
  getProfile,
  changePassword,
};
