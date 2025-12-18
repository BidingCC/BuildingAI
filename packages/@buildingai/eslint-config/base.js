import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginPrettier from "eslint-plugin-prettier";
import { globalIgnores } from "eslint/config";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ...eslintConfigPrettier,
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,d.ts,vue}"],
    },
    {
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,d.ts,vue}"],
        plugins: {
            prettier: eslintPluginPrettier,
        },
        rules: {
            "prettier/prettier": "error",
        },
    },
    {
        plugins: {
            turbo: turboPlugin,
        },
        rules: {
            "turbo/no-undeclared-env-vars": "warn",
        },
    },
    {
        plugins: {
            onlyWarn,
        },
    },
    {
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,d.ts,vue}"],
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "build/**",
            ".output/**",
            ".turbo/**",
            "packages/eslint-config",
        ],
    },
    {
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,d.ts,vue}"],
        rules: {
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "prefer-const": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_", // 忽略函数参数
                    varsIgnorePattern: "^_", // 忽略局部变量
                    caughtErrorsIgnorePattern: "^_", // 忽略 catch(err) 里的 err
                },
            ],
        },
    },
    globalIgnores(["dist", "templates/**"]),
];
