const { body } = require("express-validator");

exports.signupValidation = [
  body("email")
    .isEmail().withMessage("Valid email is required"),

 body("password")
    .isLength({ min: 12 })
    .withMessage("Password must be at least 12 characters")
    .matches(/[A-Z]/)
    .withMessage("Must include at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Must include at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Must include at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Must include at least one special character")
];

exports.loginValidation = [
  body("email")
    .isEmail().withMessage("Valid email is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
];
