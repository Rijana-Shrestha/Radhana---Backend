import { ADMIN } from "../constants/roles.js";
import User from "../models/User.js";
import uploadFile from "../utils/file.js";

const safeUser = (user) => {
  const u = user.toObject ? user.toObject() : user;
  delete u.password;
  return u;
};

const createUser = async (data) => {
  const created = await User.create(data);
  return safeUser(created);
};

const getUsers = async () => {
  return await User.find().select("-password").sort({ createdAt: -1 });
};

const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) throw { statusCode: 404, message: "User not found." };
  return user;
};

const updateUser = async (id, data, authUser) => {
  const user = await getUserById(id);

  // FIX: original had inverted logic. Correct: deny if NOT owner AND NOT admin
  const isOwner = user._id.toString() === authUser._id.toString();
  const isAdmin = authUser.roles.includes(ADMIN);

  if (!isOwner && !isAdmin) {
    throw { statusCode: 403, message: "Access Denied." };
  }

  return await User.findByIdAndUpdate(
    id,
    {
      name: data.name,
      phone: data.phone,
      address: data.address,
    },
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
export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfileImage,
  getProfile
};
