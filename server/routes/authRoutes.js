const express = require("express");
const router = express.Router();

const { signup, login, logout } = require("../controllers/authController");


const {
  signupValidation,
  loginValidation,
} = require("../validators/authValidator");

const validate = require("../middleware/validate");

router.post(
  "/signup",
  signupValidation,
  validate,
  signup
);

router.post(
  "/login",
  loginValidation,
  validate,
  login
);

router.post("/logout", logout);

module.exports = router;