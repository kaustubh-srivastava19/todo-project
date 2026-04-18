const mongoose = require("mongoose");
const config = require("./config");

const MAX_RETRIES = 5;
let retries = 0;

const connectDB = async () => {
  try {
    mongoose.connect(config.db.uri, {
  autoIndex: config.env !== "production"
});

    console.log(" MongoDB Connected");

  } catch (err) {
    console.error(" MongoDB connection failed:", err.message);

    if (retries < MAX_RETRIES) {
      retries++;
      console.log(` Retrying connection (${retries}/${MAX_RETRIES})...`);

      setTimeout(connectDB, 5000); // retry after 5 sec
    } else {
      console.error(" Max retries reached. Running without DB...");
    }
  }
};

// MONITORING EVENTS
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected");
});

module.exports = connectDB;