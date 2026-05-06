const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { isBlocked } = require("../utils/tokenBlocklist");
const logger = require("../utils/logger");

const auth = (req, res, next) => {
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
    req.userId = decoded.id;
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