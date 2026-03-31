const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const todoRoutes = require("./routes/todoRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api", authRoutes);
app.use("/api/todos", todoRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, "../public")));

module.exports = app;