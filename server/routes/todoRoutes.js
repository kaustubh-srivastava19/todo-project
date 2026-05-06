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
} = require("../controllers/todoController");

// ✅ Importing Validators
const {
  createTodoValidation,
  updateTodoValidation,
} = require("../validators/todoValidator");

// GET
router.get("/", auth,  getTodos);

// VALIDATION
router.post("/", auth,  verifyCsrf, createTodoValidation, createTodo);

// UPDATE
router.put("/:id", auth, verifyCsrf,updateTodoValidation, updateTodo);

// TOGGLE
router.patch("/:id/toggle", auth, verifyCsrf,toggleTodo);

// DELETE
router.delete("/:id", auth, verifyCsrf,deleteTodo);

module.exports = router;
