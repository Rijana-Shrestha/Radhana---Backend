import galleryService from "../services/galleryService.js";

const getGallery = async (req, res) => {
  try {
    const { cat } = req.query;
    const data = await galleryService.getGallery(cat);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGalleryItem = async (req, res) => {
  try {
    const imageFiles = req.files?.images || [];
    
    const data = await galleryService.createGalleryItem(
      req.body,
      imageFiles,
      req.user._id,
    );
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateGalleryItem = async (req, res) => {
  try {
    const imageFiles = req.files?.images || [];
    
    const data = await galleryService.updateGalleryItem(
      req.params.id,
      req.body,
      imageFiles,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteGalleryItem = async (req, res) => {
  try {
    await galleryService.deleteGalleryItem(req.params.id);
    res.json({ message: "Gallery item deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  getGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
};
