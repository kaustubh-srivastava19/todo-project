const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB connected", {
      requestId: "SYSTEM",
    });

  } catch (err) {
    logger.error("DB connection failed", {
      requestId: "SYSTEM",
      message: err.message,
    });
    process.exit(1);
  }
};

module.exports = connectDB;