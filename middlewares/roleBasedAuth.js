const roleBasedAuth = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated." });
    }
    if (req.user.roles.includes(role)) return next();
    res.status(403).json({ message: "Access Denied." });
  };
};

export default roleBasedAuth;
