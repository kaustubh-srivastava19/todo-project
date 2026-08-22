const express = require("express");
const router = express.Router();
const { verifyCsrf } = require("../middleware/csrfProtection");
const auth = require("../middleware/authMiddleware");

const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/projectController");

const {
  createProjectValidation,
  updateProjectValidation,
  sectionValidation,
} = require("../validators/projectValidator");

const validate = require("../middleware/validate");

// GET ALL PROJECTS
router.get("/", auth, getProjects);

// CREATE PROJECT
router.post("/", auth, verifyCsrf, createProjectValidation, validate, createProject);

// UPDATE PROJECT
router.put("/:id", auth, verifyCsrf, updateProjectValidation, validate, updateProject);

// DUPLICATE PROJECT
router.post("/:id/duplicate", auth, verifyCsrf, duplicateProject);

// DELETE PROJECT
router.delete("/:id", auth, verifyCsrf, deleteProject);

// ── SECTION ROUTES ──
// CREATE SECTION
router.post("/:id/sections", auth, verifyCsrf, sectionValidation, validate, createSection);

// UPDATE SECTION
router.put("/:id/sections/:sectionId", auth, verifyCsrf, sectionValidation, validate, updateSection);

// DELETE SECTION
router.delete("/:id/sections/:sectionId", auth, verifyCsrf, deleteSection);

module.exports = router;

