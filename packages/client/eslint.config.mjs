import { config as baseConfig } from "@buildingai/eslint-config/base";
import { defineConfig } from "eslint/config";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
export default defineConfig([
  ...baseConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
