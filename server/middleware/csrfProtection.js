const crypto = require("crypto");

const generateToken = () => crypto.randomBytes(24).toString("hex");

const setCsrfToken = (req, res, next) => {
  const token = generateToken();

  res.cookie("csrfToken", token, {
    httpOnly: false, // must be readable by frontend JS
    sameSite: "strict",
    secure: false // set true in HTTPS/prod
  });

  next();
};

const verifyCsrf = (req, res, next) => {
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
};

module.exports = {
  setCsrfToken,
  verifyCsrf
};