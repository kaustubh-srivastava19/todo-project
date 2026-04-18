const config = {
  port: process.env.PORT || 3000,

  env: process.env.NODE_ENV || "development",

  db: {
    uri: process.env.MONGO_URI
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  },

  cookie: {
    name: process.env.COOKIE_NAME || "token"
  }
};

module.exports = config;