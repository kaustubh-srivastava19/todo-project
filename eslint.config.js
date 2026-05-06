import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

/* eslint-env node */

module.exports = {
  testEnvironment: "node",
  verbose: true,
};

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
]);
