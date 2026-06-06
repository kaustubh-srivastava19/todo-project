const express = require("express");
const router = express.Router();

const { signup, login, logout, checkAuth } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");
const { getCurrentUser } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

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

router.get("/check", auth, checkAuth);

router.get(
  "/me",
  authMiddleware,
  getCurrentUser
);

module.exports = router;