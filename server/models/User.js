const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,               
      lowercase: true,             
      trim: true,
      match: [                    
        /^\S+@\S+\.\S+$/,
        "Please use a valid email address"
      ]
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"]
    }
  },
  { timestamps: true }           
);


userSchema.plugin(uniqueValidator, {
  message: "Email already exists"
});
module.exports = mongoose.model("User", userSchema);