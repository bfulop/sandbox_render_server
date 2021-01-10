const { join } = require("path");
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2019,
    project: join(__dirname, "./tsconfig.json"),
    sourceType: "module"
  },
  extends: ["plugin:rxjs/recommended", "plugin:fp-ts/all"],
  plugins: ["fp-ts"],
  rules: {
    "fp-ts/no-lib-imports": "error",
    "fp-ts/no-pipeable": "error",
    "fp-ts/prefer-traverse": "error",
    "fp-ts/no-redundant-flow": "error",
    "fp-ts/prefer-chain": "error",
    "fp-ts/no-module-imports": "error",
  }
};
