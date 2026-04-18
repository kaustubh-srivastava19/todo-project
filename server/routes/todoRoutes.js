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

// ✅ Importing Validators
const {
  createTodoValidation,
  updateTodoValidation
} = require("../validators/todoValidator");

// GET
router.get("/", auth, getTodos);

// VALIDATION
router.post("/", auth, createTodoValidation, createTodo);

// UPDATE
router.put("/:id", auth, updateTodoValidation, updateTodo);

// TOGGLE
router.patch("/:id/toggle", auth, toggleTodo);

// DELETE
router.delete("/:id", auth, deleteTodo);

module.exports = router;