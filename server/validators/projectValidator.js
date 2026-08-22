const { body } = require("express-validator");

// CREATE PROJECT VALIDATION
exports.createProjectValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ max: 100 })
    .withMessage("Project name too long (max 100 chars)")
    .escape(),

  body("color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Invalid color format (must be hex like #ffffff)"),
];

// UPDATE PROJECT VALIDATION
exports.updateProjectValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Project name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Project name too long (max 100 chars)")
    .escape(),

  body("color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Invalid color format (must be hex like #ffffff)"),

  body("isFavorite")
    .optional()
    .isBoolean()
    .withMessage("isFavorite must be a boolean"),

  body("isArchived")
    .optional()
    .isBoolean()
    .withMessage("isArchived must be a boolean"),
];

// SECTION VALIDATION
exports.sectionValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Section name is required")
    .isLength({ max: 100 })
    .withMessage("Section name too long (max 100 chars)")
    .escape(),
];
