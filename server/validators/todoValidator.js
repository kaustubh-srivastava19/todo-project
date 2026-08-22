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

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Invalid priority level"),

  body("project")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid project ID format"),

  body("sectionId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid section ID format"),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string"),

  body("recurrence")
    .optional()
    .isIn(["none", "daily", "weekly", "monthly"])
    .withMessage("Invalid recurrence value"),

  body("reminderDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid reminder date format"),

  body("subtasks")
    .optional()
    .isArray()
    .withMessage("Subtasks must be an array"),
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

  body("dueDate").optional().isISO8601().withMessage("Invalid date format"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Invalid priority level"),

  body("project")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid project ID format"),

  body("sectionId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid section ID format"),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string"),

  body("recurrence")
    .optional()
    .isIn(["none", "daily", "weekly", "monthly"])
    .withMessage("Invalid recurrence value"),

  body("reminderDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid reminder date format"),

  body("subtasks")
    .optional()
    .isArray()
    .withMessage("Subtasks must be an array"),
];
