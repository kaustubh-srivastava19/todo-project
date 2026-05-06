const { body } = require("express-validator");

const signupValidation = [
  body("email")
    .isEmail().withMessage("Invalid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 12 }).withMessage("Password must be at least 12 chars")
    .matches(/[A-Z]/).withMessage("Must include uppercase")
    .matches(/[0-9]/).withMessage("Must include number")
    .matches(/[^A-Za-z0-9]/).withMessage("Must include special char"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = {
  signupValidation,
  loginValidation,
};