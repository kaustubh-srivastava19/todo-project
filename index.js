const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());

/* ✅ Serve static frontend files */
app.use(express.static(path.join(__dirname, "public")));

/* ✅ Default route */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.post("/api/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  res.json({ token: "fake-jwt-token" });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  res.json({ token: "fake-jwt-token" });
});

/* ===============================
   TODOS 
   =============================== */

let todos = [];

app.get("/api/todos", (req, res) => {
  res.json(todos);
});

app.post("/api/todos", (req, res) => {
  const todo = {
    id: Date.now(),
    text: req.body.text,
    completed: false
  };
  todos.push(todo);
  res.json(todo);
});

app.delete("/api/todos/:id", (req, res) => {
  todos = todos.filter(t => t.id != req.params.id);
  res.json({ success: true });
});

app.patch("/api/todos/:id", (req, res) => {
  const todo = todos.find(t => t.id == req.params.id);
  if (!todo) return res.status(404).end();

  Object.assign(todo, req.body);
  res.json(todo);
});

/* =============================== */

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
