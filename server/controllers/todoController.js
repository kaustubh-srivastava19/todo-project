const Todo = require("../models/Todo");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

// GET TODOS
exports.getTodos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, filter, project } = req.query;

  const query = { user: req.userId };

  if (project) {
    query.project = project;
  }

  if (search) {
    query.text = { $regex: search, $options: "i" };
  }

  if (filter === "completed") {
    query.completed = true;
  } else if (filter === "pending") {
    query.completed = false;
  } else if (filter === "today") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: startOfDay, $lte: endOfDay };
    query.completed = false;
  } else if (filter === "upcoming") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: startOfDay, $lte: nextWeek };
    query.completed = false;
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Todo.countDocuments(query);
  const todos = await Todo.find(query)
    .populate({
      path: "project",
      select: "name color",
    })
    .sort({
      completed: 1,
      order: 1,
      dueDate: 1,
      createdAt: -1
    })
    .skip(skip)
    .limit(limitNum);
  res.json({
    success: true,
    data: todos,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      limit: limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1,
    },
  });
});


// CREATE TODO
exports.createTodo = asyncHandler(async (req, res) => {
  const {
    text,
    dueDate,
    priority,
    project,
    sectionId,
    description,
    subtasks,
    recurrence,
    reminderDate,
  } = req.body;

  let todo = await Todo.create({
    text,
    user: req.userId,
    dueDate: dueDate || null,
    priority: priority || "medium",
    project: project || null,
    sectionId: sectionId || null,
    description: description || "",
    recurrence: recurrence || "none",
    reminderDate: reminderDate || null,
    subtasks: subtasks || [],
  });

  if (todo.project) {
    todo = await todo.populate({
      path: "project",
      select: "name color",
    });
  }

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
  const todo = await Todo.findOneAndDelete({ _id: req.params.todoId, user: req.userId });

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
  const {
    text,
    dueDate,
    priority,
    project,
    sectionId,
    description,
    subtasks,
    recurrence,
    reminderDate,
  } = req.body;

  const updateFields = {};
  if (text !== undefined) updateFields.text = text;
  if (dueDate !== undefined) updateFields.dueDate = dueDate;
  if (priority !== undefined) updateFields.priority = priority;
  if (project !== undefined) updateFields.project = project || null;
  if (sectionId !== undefined) updateFields.sectionId = sectionId || null;
  if (description !== undefined) updateFields.description = description;
  if (recurrence !== undefined) updateFields.recurrence = recurrence || "none";
  if (reminderDate !== undefined) updateFields.reminderDate = reminderDate || null;
  if (subtasks !== undefined) updateFields.subtasks = subtasks;

  const todo = await Todo.findOneAndUpdate(
    { _id: req.params.todoId, user: req.userId },
    updateFields,
    { new: true }
  ).populate({
    path: "project",
    select: "name color",
  });

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
    _id: req.params.todoId,
    user: req.userId,
  });

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  const wasCompleted = todo.completed;
  todo.completed = !todo.completed;
  await todo.save();

  if (!wasCompleted && todo.recurrence && todo.recurrence !== "none") {
    const baseDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
    const nextDueDate = new Date(baseDate);

    if (todo.recurrence === "daily") {
      nextDueDate.setDate(nextDueDate.getDate() + 1);
    } else if (todo.recurrence === "weekly") {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else if (todo.recurrence === "monthly") {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    const nextReminderDate = todo.reminderDate ? new Date(todo.reminderDate) : null;
    if (nextReminderDate) {
      if (todo.recurrence === "daily") {
        nextReminderDate.setDate(nextReminderDate.getDate() + 1);
      } else if (todo.recurrence === "weekly") {
        nextReminderDate.setDate(nextReminderDate.getDate() + 7);
      } else if (todo.recurrence === "monthly") {
        nextReminderDate.setMonth(nextReminderDate.getMonth() + 1);
      }
    }

    const existingNext = await Todo.findOne({
      user: todo.user,
      text: todo.text,
      completed: false,
      recurrence: todo.recurrence,
      dueDate: nextDueDate,
    });

    if (!existingNext) {
      await Todo.create({
        text: todo.text,
        user: todo.user,
        dueDate: nextDueDate,
        priority: todo.priority,
        project: todo.project,
        sectionId: todo.sectionId,
        description: todo.description,
        recurrence: todo.recurrence,
        reminderDate: nextReminderDate || null,
        subtasks: Array.isArray(todo.subtasks)
          ? todo.subtasks.map((subtask) => ({ text: subtask.text, completed: false }))
          : [],
      });
    }

    todo.recurrence = "none";
    await todo.save();
  }

  res.json({
    success: true,
    data: todo,
  });
});

// REORDER TODOS — batch-update task order and optional sectionId
exports.reorderTodos = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "items must be an array" });
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, user: req.userId },
      update: {
        $set: {
          order: typeof item.order === "number" ? item.order : 0,
          ...(item.sectionId !== undefined ? { sectionId: item.sectionId || null } : {}),
        },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Todo.bulkWrite(bulkOps);
  }

  res.status(200).json({
    success: true,
    data: { message: "Todos reordered successfully" },
  });
});