const path = require("path");
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";

require("dotenv").config({
  path: path.resolve(__dirname, `../${envFile}`),
});
require("./config/validateEnv"); 

const app = require("./app");
const connectDB = require("./config/db");
const config = require("./config/config");

connectDB();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
