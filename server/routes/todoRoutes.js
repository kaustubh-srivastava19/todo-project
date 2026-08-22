const express = require("express");
const router = express.Router();
const { verifyCsrf } = require("../middleware/csrfProtection");

const auth = require("../middleware/authMiddleware");

const {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  toggleTodo,
  reorderTodos,
} = require("../controllers/todoController");

// ✅ Importing Validators
const {
  createTodoValidation,
  updateTodoValidation,
} = require("../validators/todoValidator");

const validate = require("../middleware/validate");

// GET
router.get("/", auth, getTodos);

// REORDER (must be defined before /:todoId to avoid route collision)
router.put("/reorder", auth, verifyCsrf, reorderTodos);

// CREATE
router.post("/", auth, verifyCsrf, createTodoValidation, validate, createTodo);

// UPDATE
router.put("/:todoId", auth, verifyCsrf, updateTodoValidation, validate, updateTodo);

// TOGGLE
router.patch("/:todoId", auth, verifyCsrf, toggleTodo);

// DELETE
router.delete("/:todoId", auth, verifyCsrf, deleteTodo);

module.exports = router;
