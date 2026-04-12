import Gallery from "../models/Gallery.js";
import uploadFile from "../utils/file.js";

const getGallery = async (cat) => {
  const filters = { isActive: true };
  if (cat && cat !== "all") filters.cat = cat;
  return await Gallery.find(filters).sort({ createdAt: -1 });
};

const createGalleryItem = async (data, files, userId) => {
  if (!files || files.length === 0) {
    throw { statusCode: 400, message: "At least one image is required." };
  }

  const uploaded = await uploadFile(files);
  const imageUrls = uploaded.map((f) => f?.secure_url || f?.url || "");

  return await Gallery.create({
    ...data,
    imageUrls,
    createdBy: userId,
  });
};

const updateGalleryItem = async (id, data, files) => {
  const updateData = { ...data };

  if (files && files.length > 0) {
    const uploaded = await uploadFile(files);
    updateData.imageUrls = uploaded.map((f) => f?.secure_url || f?.url || "");
  }

  return await Gallery.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteGalleryItem = async (id) => {
  await Gallery.findByIdAndUpdate(id, { isActive: false });
};

export default {
  getGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
};
