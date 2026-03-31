const Todo = require("../models/Todo");

// GET TODOS
exports.getTodos = async (req, res) => {
  const todos = await Todo.find({ user: req.userId });
  res.json(todos);
};

// ADD TODO
exports.createTodo = async (req, res) => {
  const { text, dueDate } = req.body;

  const todo = await Todo.create({
    text,
    user: req.userId,
    dueDate: dueDate || null
  });

  res.json(todo);
};
// DELETE TODO
exports.deleteTodo = async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// UPDATE TODO
exports.updateTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    // If text is sent → update text
    if (req.body.text !== undefined) {
      todo.text = req.body.text;
    }
    // If toggle is sent → toggle completed
  
    if (req.body.toggle === true) {
      todo.completed = !todo.completed;
    }

    await todo.save();

    res.json(todo);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  
  }
};

