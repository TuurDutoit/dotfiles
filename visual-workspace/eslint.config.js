import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "web/**/*.ts"],
    rules: {
      // TypeScript, not ESLint's scope analysis, owns these runtime globals.
      "no-undef": "off",
    },
  },
);
