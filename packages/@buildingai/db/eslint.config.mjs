import { config as baseConfig } from "@buildingai/eslint-config/base";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
    baseConfig,
    {
        files: ["scripts/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-undef": "off",
        },
    },
]);
