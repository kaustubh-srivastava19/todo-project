const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Validation failed", {
      requestId: req.id,
      path: req.originalUrl || req.path,
      errors: errors.array(),
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

module.exports = validate;