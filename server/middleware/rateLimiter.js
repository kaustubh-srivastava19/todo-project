const rateLimit = require("express-rate-limit");

// Limit login attempts
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // max 5 requests per IP
  message: {
    message: "Too many login attempts. Try again after 1 minute."
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  authLimiter
};