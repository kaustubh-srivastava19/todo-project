const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",

  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,   
    debug: 4,
  },

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),

  transports: [
    new winston.transports.Console()
  ],
});

module.exports = logger;