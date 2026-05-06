const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const config = require("../config/config");
const { addToBlocklist } = require("../utils/tokenBlocklist");
const { setCsrfToken } = require("../middleware/csrfProtection");
const logger = require("../utils/logger");

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Signup validation failed", {
        requestId: req.id,
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    logger.info("Signup attempt", { requestId: req.id, email });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });

    logger.info("User created", {
      requestId: req.id,
      userId: user._id,
    });

    res.status(201).json({
      success: true,
      data: { message: "User created successfully" },
    });

  } catch (err) {
    logger.error("Signup error", {
      requestId: req.id,
      message: err.message,
    });

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info("Login attempt", { requestId: req.id, email });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, config.jwt.secret);

    res.cookie("token", token, { httpOnly: true });
    setCsrfToken(req, res, () => {});

    logger.info("Login success", {
      requestId: req.id,
      userId: user._id,
    });

    res.json({
      success: true,
      data: { message: "Login successful" },
    });

  } catch (err) {
    logger.error("Login error", {
      requestId: req.id,
      message: err.message,
    });

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  const token = req.cookies.token;

  if (token) addToBlocklist(token, 3600);

  logger.info("Logout", { requestId: req.id, userId: req.userId });

  res.clearCookie("token");

  res.json({
    success: true,
    data: { message: "Logged out successfully" },
  });
};