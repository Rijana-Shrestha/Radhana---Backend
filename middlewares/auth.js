import { verifyJWT } from "../utils/jwt.js";

// Extracts JWT from cookie and attaches user data to req.user
const auth = async (req, res, next) => {
  // cookie-parser populates req.cookies automatically
  const authToken = req.cookies?.authToken;

  if (!authToken) {
    return res.status(401).json({ message: "User not authenticated." });
  }

  try {
    const data = await verifyJWT(authToken);
    req.user = data;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired auth token." });
  }
};

export default auth;
