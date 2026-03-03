const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const path = require("path");

const User = require("./models/User");
const Todo = require("./models/Todo");

const app = express();

app.use(express.json());
app.use(cookieParser());


mongoose.connect("mongodb://127.0.0.1:27017/todoApp");


const JWT_SECRET = "supersecretkey";

// ---------------- AUTH MIDDLEWARE ----------------
function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.get("/", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect("/auth.html");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return res.redirect("/index.html");
  } catch {
    return res.redirect("/auth.html");
  }
});

app.use(express.static(path.join(__dirname, "public")));


// ---------------- SIGNUP ----------------
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    email,
    password: hashedPassword
  });

  res.json({ message: "User created successfully" });
});

// ---------------- LOGIN ----------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, {
    expiresIn: "1d"
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, 
    sameSite: "lax"
  });

  res.json({ message: "Login successful" });
});

// ---------------- LOGOUT ----------------
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// ---------------- GET TODOS ----------------
app.get("/api/todos", authMiddleware, async (req, res) => {
  const todos = await Todo.find({ user: req.userId });
  res.json(todos);
});

// ---------------- ADD TODO ----------------
app.post("/api/todos", authMiddleware, async (req, res) => {
  const { text } = req.body;

  const todo = await Todo.create({
    text,
    user: req.userId
  });

  res.json(todo);
});

// ---------------- UPDATE TODO ----------------
app.put("/api/todos/:id", authMiddleware, async (req, res) => {
  const { text } = req.body;

  const updated = await Todo.findByIdAndUpdate(
    req.params.id,
    { text },
    { new: true }
  );

  res.json(updated);
});


// ---------------- DELETE TODO ----------------
app.delete("/api/todos/:id", authMiddleware, async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});