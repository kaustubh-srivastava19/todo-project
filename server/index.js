const Sentry = require("@sentry/node");
const logger = require("./utils/logger");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ,
  tracesSampleRate: 1.0,
});

const path = require("path");

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

require("dotenv").config({
  path: path.resolve(__dirname, `../${envFile}`),
});

require("./config/validateEnv");

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);

  logger.info("Server started successfully");
  logger.error("Test error log");
  console.log("LOGGER EXECUTED");
});