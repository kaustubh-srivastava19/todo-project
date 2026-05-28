const crypto = require("crypto");

const generateToken = () => crypto.randomBytes(24).toString("hex");

const setCsrfToken = (req, res, next) => {
  // ✅ Skip in test environment
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const token = generateToken();

  res.cookie("csrfToken", token, {
  httpOnly: false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
});

  next();
};

const verifyCsrf = (req, res, next) => {
  // To Skip CSRF check in tests
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
};

module.exports = {
  setCsrfToken,
  verifyCsrf,
};