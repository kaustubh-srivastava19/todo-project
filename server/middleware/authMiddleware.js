const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { isBlocked } = require("../utils/tokenBlocklist");
const logger = require("../utils/logger");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    logger.warn("No token", {
      requestId: req.id,
      ip: req.ip,
    });
    return res.status(401).json({ message: "No token" });
  }

  if (isBlocked(token)) {
    logger.warn("Blocked token used", {
      requestId: req.id,
    });
    return res.status(401).json({ message: "Token invalidated" });
  }

 try {
  const decoded = jwt.verify(token, config.jwt.secret);

  const user = await User.findById(decoded.id)
    .select("-password");

  if (!user) {
    return res.status(401).json({
      message: "User not found"
    });
  }

  req.userId = user._id;
  req.user = user;

  next();

  } catch (err) {
    logger.warn("Invalid token", {
      requestId: req.id,
      ip: req.ip,
    });
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;