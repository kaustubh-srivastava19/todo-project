const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [100, "Project name is too long (max 100 characters)"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    color: {
      type: String,
      default: "#808080",
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    sections: [
      {
        name: {
          type: String,
          required: [true, "Section name is required"],
          trim: true,
          maxlength: [100, "Section name is too long (max 100 characters)"],
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

projectSchema.index({ user: 1 });

module.exports = mongoose.model("Project", projectSchema);
