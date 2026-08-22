const Project = require("../models/Project");
const Todo = require("../models/Todo");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

// GET ALL PROJECTS
exports.getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ user: req.userId });

  res.json({
    success: true,
    data: projects,
  });
});

// CREATE NEW PROJECT
exports.createProject = asyncHandler(async (req, res) => {
  const { name, color } = req.body;

  const project = await Project.create({
    name,
    color: color || "#808080",
    user: req.userId,
  });

  logger.info("Project created", {
    requestId: req.id,
    projectId: project._id,
  });

  res.status(201).json({
    success: true,
    data: project,
  });
});

// UPDATE PROJECT
exports.updateProject = asyncHandler(async (req, res) => {
  const { name, color, isFavorite, isArchived } = req.body;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (color !== undefined) updateFields.color = color;
  if (isFavorite !== undefined) updateFields.isFavorite = isFavorite;
  if (isArchived !== undefined) updateFields.isArchived = isArchived;

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    updateFields,
    { new: true }
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found or unauthorized",
    });
  }

  logger.info("Project updated", {
    requestId: req.id,
    projectId: project._id,
  });

  res.json({
    success: true,
    data: project,
  });
});

// DUPLICATE PROJECT
exports.duplicateProject = asyncHandler(async (req, res) => {
  const originalProject = await Project.findOne({ _id: req.params.id, user: req.userId });

  if (!originalProject) {
    return res.status(404).json({
      success: false,
      message: "Project not found or unauthorized",
    });
  }

  // Create cloned project
  const newProject = await Project.create({
    name: `${originalProject.name} (Copy)`,
    color: originalProject.color,
    user: req.userId,
    isFavorite: originalProject.isFavorite,
    sections: originalProject.sections,
  });

  // Find all todos under original project
  const originalTodos = await Todo.find({ project: originalProject._id, user: req.userId });

  // Clone todos
  if (originalTodos.length > 0) {
    const todosToCreate = originalTodos.map(todo => ({
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      priority: todo.priority,
      dueDate: todo.dueDate,
      user: req.userId,
      project: newProject._id,
    }));
    await Todo.insertMany(todosToCreate);
  }

  logger.info("Project duplicated", {
    requestId: req.id,
    originalId: originalProject._id,
    newId: newProject._id,
  });

  res.status(201).json({
    success: true,
    data: newProject,
  });
});

// DELETE PROJECT
exports.deleteProject = asyncHandler(async (req, res) => {
  // First find the project to ensure authorization
  const project = await Project.findOne({ _id: req.params.id, user: req.userId });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found or unauthorized",
    });
  }

  // Delete all todos associated with the project
  const deleteTodosResult = await Todo.deleteMany({ project: project._id, user: req.userId });

  // Delete the project
  await Project.deleteOne({ _id: project._id });

  logger.info("Project deleted and associated todos cleaned up", {
    requestId: req.id,
    projectId: project._id,
    deletedTodosCount: deleteTodosResult.deletedCount,
  });

  res.json({
    success: true,
    data: {
      message: "Project and associated tasks deleted successfully",
      deletedTodosCount: deleteTodosResult.deletedCount,
    },
  });
});

// CREATE SECTION
exports.createSection = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const project = await Project.findOne({ _id: req.params.id, user: req.userId });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
  }

  const order = project.sections.length;
  project.sections.push({ name, order });
  await project.save();

  const newSection = project.sections[project.sections.length - 1];

  logger.info("Section created", { requestId: req.id, projectId: project._id, sectionId: newSection._id });

  res.status(201).json({ success: true, data: newSection });
});

// UPDATE SECTION
exports.updateSection = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const project = await Project.findOne({ _id: req.params.id, user: req.userId });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
  }

  const section = project.sections.id(req.params.sectionId);
  if (!section) {
    return res.status(404).json({ success: false, message: "Section not found" });
  }

  if (name !== undefined) section.name = name;
  await project.save();

  logger.info("Section updated", { requestId: req.id, projectId: project._id, sectionId: section._id });

  res.json({ success: true, data: section });
});

// DELETE SECTION
exports.deleteSection = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, user: req.userId });

  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
  }

  const section = project.sections.id(req.params.sectionId);
  if (!section) {
    return res.status(404).json({ success: false, message: "Section not found" });
  }

  // Cascade-delete all todos that belong to this section
  const deleteTodosResult = await Todo.deleteMany({
    user: req.userId,
    project: project._id,
    sectionId: req.params.sectionId,
  });

  section.deleteOne();
  await project.save();

  logger.info("Section deleted", {
    requestId: req.id,
    projectId: project._id,
    sectionId: req.params.sectionId,
    deletedTodosCount: deleteTodosResult.deletedCount,
  });

  res.json({
    success: true,
    data: {
      message: "Section and associated tasks deleted successfully",
      deletedTodosCount: deleteTodosResult.deletedCount,
    },
  });
});
