import userService from "../services/userService.js";

const createUser = async (req, res) => {
  try {
    const data = await userService.createUser(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const data = await userService.getUsers();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const data = await userService.getUserById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const data = await userService.updateUser(
      req.params.id,
      req.body,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: `User deleted successfully.` });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Image file is required." });
    const data = await userService.updateProfileImage(
      req.params.id,
      req.file,
      req.user,
    );
    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
const getProfile = async (req, res)=>{
  try {
    const data = await userService.getProfile(req.user._id);
    res.json(data);
  }
  catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
}

export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfileImage,
  getProfile

};
