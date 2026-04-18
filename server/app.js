
const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
const morgan = require("morgan");
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/todos", require("./routes/todoRoutes"));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err.stack); 

   if (err.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(err.errors).map(e => e.message)
    });
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;