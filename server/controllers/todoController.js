const { validationResult } = require("express-validator");
const Todo = require("../models/Todo");

const asyncHandler = require("../utils/asyncHandler");
//GET TODO
exports.getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.userId });
  res.json(todos);
});

// ADD TODO
exports.createTodo = asyncHandler(async (req, res) => {
  const { text, dueDate } = req.body;

  const todo = await Todo.create({
    text,
    user: req.userId,
    dueDate: dueDate || null
  });

  res.json(todo);
});
// DELETE TODO
exports.deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndDelete({
    _id: req.params.id,
    user: req.userId
  });

  if (!todo) {
    return res.status(404).json({
      message: "Todo not found or unauthorized"
    });
  }

  res.json({ message: "Deleted successfully" });
});
// UPDATE TODO
exports.updateTodo = asyncHandler(async (req, res) => {
  const updated = await Todo.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { text: req.body.text },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({
      message: "Todo not found or unauthorized"
    });
  }

  res.json(updated);
});

//toggle todo
exports.toggleTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOne({
    _id: req.params.id,
    user: req.userId
  });

  if (!todo) {
    return res.status(404).json({
      message: "Todo not found or unauthorized"
    });
  }

  todo.completed = !todo.completed;
  await todo.save();

  res.json(todo);
});