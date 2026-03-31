const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    text: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    completed: {
      type: Boolean,
      default: false
    },
    dueDate: {
      type: Date 
    }
  },
  { timestamps: true } 
);

module.exports = mongoose.model("Todo", todoSchema);