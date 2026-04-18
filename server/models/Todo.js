const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Todo text is required"],
      trim: true,
      maxlength: [200, "Text too long"]
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    completed: {
      type: Boolean,
      default: false
    },

    dueDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

todoSchema.index({ user: 1 });

module.exports = mongoose.model("Todo", todoSchema);