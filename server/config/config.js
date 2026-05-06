module.exports = {
  port: process.env.PORT || 5000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  db: {
    uri: process.env.MONGO_URI,
  },
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
  },
};