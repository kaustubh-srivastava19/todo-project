require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const morgan = require("morgan");

const logger = require("./utils/logger");
const requestId = require("./middleware/requestId");
const rateLimiter = require("./middleware/rateLimiter");
const app = express();
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  integrations: [],
  tracesSampleRate: 1.0,
});

// Compression
app.use(compression());

// Security headers
app.use(helmet());

// Request ID 
app.use(requestId);
// Morgan token to include requestId
morgan.token("id", (req) => req.id);

// Morgan → Winston integration 
app.use(
  morgan(
    ":id :method :url :status :res[content-length] - :response-time ms",
    {
      stream: {
        write: (message) => {
          logger.http(message.trim());
        },
      },
    }
  )
);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

//Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.originalUrl,
  });

  next();
});

// Body parser
app.use(express.json());

app.use(rateLimiter);
// Cookies
app.use(cookieParser());

app.get("/health", (req, res) => {
  logger.info("Health check hit", {
    requestId: req.id,
  });

  res.json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/debug-sentry", (req, res) => {
  throw new Error("Sentry test error");
});

// Prevent html files caching
app.use((req, res, next) => {
  if (req.path.endsWith(".html")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
});


// ✅ STATIC FILES
app.use(express.static(path.join(__dirname, "../public")));

// ✅ ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/todos", require("./routes/todoRoutes"));

// ✅ 404 HANDLER
app.use((req, res) => {
  logger.warn("Route not found", {
    requestId: req.id,
    url: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});


// ✅ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";

  // ✅ SEND ERROR TO SENTRY
  Sentry.captureException(err);

  logger.error("Unhandled error", {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : "Internal Server Error",
    ...(err.errors && { errors: err.errors }),
  });
});

module.exports = app;