const { body } = require("express-validator");

// CREATE TODO VALIDATION
exports.createTodoValidation = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Text is required")
    .isLength({ max: 200 })
    .withMessage("Text too long (max 200 chars)")
    .escape(), // prevents XSS

  body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
];

// UPDATE TODO VALIDATION
exports.updateTodoValidation = [
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Text is required")
    .isLength({ max: 200 })
    .withMessage("Text too long")
    .escape(),
];
