const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Todo text is required"],
      trim: true,
      maxlength: [200, "Text too long"],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    reminderDate: {
      type: Date,
      default: null,
    },
    subtasks: [
      {
        text: {
          type: String,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true },
);

todoSchema.index({ user: 1 });
todoSchema.index({ user: 1, completed: 1 });
todoSchema.index({ user: 1, dueDate: 1 });
todoSchema.index({ user: 1, project: 1 });
todoSchema.index({ user: 1, project: 1, sectionId: 1 });

module.exports = mongoose.model("Todo", todoSchema);
