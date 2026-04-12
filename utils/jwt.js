import jwt from "jsonwebtoken";
import config from "../config/config.js";

function createJWT(data) {
  return jwt.sign(data, config.jwtSecret, { expiresIn: "1d" });
}

async function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwtSecret, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

export { createJWT, verifyJWT };
