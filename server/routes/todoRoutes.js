const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  toggleTodo
} = require("../controllers/todoController");

router.get("/", auth, getTodos);
router.post("/", auth, createTodo);
router.delete("/:id", auth, deleteTodo);
router.put("/:id", auth, updateTodo);

module.exports = router;