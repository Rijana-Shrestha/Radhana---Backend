import Gallery from "../models/Gallery.js";
import uploadFile from "../utils/file.js";

const getGallery = async (cat) => {
  const filters = { isActive: true };
  if (cat && cat !== "all") filters.cat = cat;
  return await Gallery.find(filters).sort({ createdAt: -1 });
};

const createGalleryItem = async (data, files, userId) => {
  // Validate files array
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw { 
      statusCode: 400, 
      message: "At least one image is required. Please upload the image" 
    };
  }

  try {
    const uploaded = await uploadFile(files);
    
    if (!uploaded || uploaded.length === 0) {
      throw { 
        statusCode: 400, 
        message: "Failed to upload images. Please try again" 
      };
    }

    const imageUrls = uploaded.map((f) => f?.secure_url || f?.url || "");

    return await Gallery.create({
      ...data,
      imageUrls,
      createdBy: userId,
    });
  } catch (error) {
    // If error already has statusCode, re-throw it
    if (error.statusCode) throw error;
    
    throw {
      statusCode: 500,
      message: error.message || "Failed to create gallery item"
    };
  }
};

const updateGalleryItem = async (id, data, files) => {
  const updateData = { ...data };

  if (files && Array.isArray(files) && files.length > 0) {
    try {
      const uploaded = await uploadFile(files);
      updateData.imageUrls = uploaded.map((f) => f?.secure_url || f?.url || "");
    } catch (error) {
      // If error already has statusCode, re-throw it
      if (error.statusCode) throw error;
      
      throw {
        statusCode: 500,
        message: error.message || "Failed to upload images"
      };
    }
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
