const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  text: String,
  userId: mongoose.Schema.Types.ObjectId
});

module.exports = mongoose.model("Todo", todoSchema);
