const rateLimit = require("express-rate-limit");

// Limit login attempts
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // max 5 requests per IP
  message: {
    message: "Too many login attempts. Try again after 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
const createRateLimiter = (options) =>
  rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    message: options.message || {
      message: "Too many requests"
    },
    standardHeaders: true,
    legacyHeaders: false
  });

module.exports = {
  authLimiter,
  createRateLimiter
};
