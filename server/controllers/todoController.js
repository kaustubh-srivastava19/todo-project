const Todo = require("../models/Todo");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

// GET TODOS
exports.getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.userId });

  res.json({
    success: true,
    data: todos,
  });
});

// CREATE TODO
exports.createTodo = asyncHandler(async (req, res) => {
  const { text, dueDate, priority } = req.body;

  const todo = await Todo.create({
    text,
    user: req.userId,
    dueDate: dueDate || null,
    priority: priority || "medium",
  });

  logger.info("Todo created", {
    requestId: req.id,
    todoId: todo._id,
  });

  res.status(201).json({
    success: true,
    data: todo,
  });
});

// DELETE TODO
exports.deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.userId });

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found or unauthorized",
    });
  }

  res.json({
    success: true,
    data: { message: "Deleted successfully" },
  });
});

// UPDATE TODO
exports.updateTodo = asyncHandler(async (req, res) => {
  const { text, dueDate, priority } = req.body;

  const updateFields = {};
  if (text !== undefined) updateFields.text = text;
  if (dueDate !== undefined) updateFields.dueDate = dueDate;
  if (priority !== undefined) updateFields.priority = priority;

  const todo = await Todo.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    updateFields,
    { new: true }
  );

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  res.json({
    success: true,
    data: todo,
  });
});

// TOGGLE TODO
exports.toggleTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOne({
    _id: req.params.id,
    user: req.userId,
  });

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  todo.completed = !todo.completed;
  await todo.save();

  res.json({
    success: true,
    data: todo,
  });
});