import js from "@eslint/js";
import globals from "globals";

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jquery,

        // custom global variables added here:
        Razorpay: "readonly",
        showCustomConfirm: "readonly",
        ClothifyCounterManager: "readonly",
        showPopupMessage: "readonly",

        // Hardened Frontend Library Definitions
        bootstrap: "readonly",
        Bootstrap: "readonly",
        Cropper: "readonly",
        cropper: "readonly",
        Chart: "readonly",
        chart: "readonly",
        select2: "readonly"
      },
    },
    rules: {
      "no-console": "warn",
    },
  },
  {
    ignores: ["**/*.hbs", "node_modules/"],
  }
];
