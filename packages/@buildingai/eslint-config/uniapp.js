import { config as baseConfig } from "@buildingai/eslint-config/base";
import { defineConfig } from "eslint/config";
import { defu } from "defu";
import vuePlugin from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";

/**
 * Custom array merging function for defu
 * Arrays are merged by combining unique values
 */
function arrayFn(objKey, value, srcValue) {
    if (Array.isArray(value) && Array.isArray(srcValue)) {
        return [...new Set([...srcValue, ...value])];
    }
    return undefined;
}

/**
 * Default ESLint configuration preset for Nuxt projects
 */
export const eslintConfigPresets = [
    // Global base configuration
    ...baseConfig,

    // Parser options
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: process.cwd(),
            },
        },
    },

    // TypeScript file configuration
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
    },

    // Vue file configuration
    {
        files: ["**/*.vue"],
        plugins: {
            vue: vuePlugin,
        },
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: [".vue"],
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "vue/no-unused-vars": "off",
            "vue/no-unused-components": "off",
            "vue/require-default-prop": "off",
            "vue/no-v-html": "off",
            "vue/eqeqeq": "off",
            "vue/block-order": [
                "error",
                {
                    order: ["script", "template", "style"],
                },
            ],
        },
    },

    // Global ignores
    {
        ignores: [".output/**", "dist/**", "node_modules/**", "@buildingai/**", ".nuxt/**", ".turbo/**", ".storybook/**"],
    },

    // Global rules (strict mode enabled by default)
    {
        plugins: {
            vue: vuePlugin,
        },
        rules: {
            "no-undef": "off",
            "no-console": "off",
            "no-debugger": "error",
            "no-useless-catch": "off",
            "no-async-promise-executor": "off",
            "turbo/no-undeclared-env-vars": "off",
            "prefer-const": "error",
            // TypeScript rules
            "@typescript-eslint/no-unused-expressions": "error",
            "@typescript-eslint/no-empty-object-type": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/no-non-null-assertion": "warn",
            // Enable strict Vue rules
            "vue/require-default-prop": "off",
            "vue/no-unused-vars": "error",
            "vue/no-unused-components": "error",
        },
    },
    
    // Vue-specific rules (with vue plugin)
    {
        files: ["**/*.vue"],
        plugins: {
            vue: vuePlugin,
        },
        rules: {
            "vue/require-default-prop": "off",
            "vue/no-unused-vars": "error",
            "vue/no-unused-components": "error",
        },
    },
];

/**
 * Creates a Nuxt ESLint configuration with Vue support
 * Similar to defineNuxtConfig, but for ESLint - accepts any ESLint flat config options
 * and merges them with sensible defaults
 * 
 * @param {object} config - Partial ESLint flat config to override/extend defaults
 * @returns {Array} Merged ESLint configuration array
 * 
 * @example
 * ```js
 * import { defineBuildingAIEslintConfig } from "@buildingai/eslint-config/nuxt";
 * 
 * export default defineBuildingAIEslintConfig({
 *   rules: {
 *     '@typescript-eslint/no-explicit-any': 'off'
 *   }
 * });
 * ```
 */
export async function defineBuildingAIEslintConfig(userConfig = {}) {
    const defaultConfig = eslintConfigPresets;
    
    // Try to load Nuxt ESLint config if available
    let nuxtConfig = [];
    try {
        const withNuxt = await import(`${process.cwd()}/.nuxt/eslint.config.mjs`);
        nuxtConfig = await withNuxt.default({
            plugins: {
                vue: vuePlugin,
            },
        }).toConfigs();
    } catch (error) {
        // Nuxt config not available, skip
    }
    
    // Merge user config with default config
    if (typeof userConfig === 'object' && !Array.isArray(userConfig)) {
        // User provided an object, merge all its rules into the global rules section
        const mergedConfig = [...defaultConfig];
        
        // Find the global rules section (last config object with rules)
        const globalRulesIndex = mergedConfig.length - 2; // Second to last before Vue rules
        if (mergedConfig[globalRulesIndex] && mergedConfig[globalRulesIndex].rules) {
            mergedConfig[globalRulesIndex].rules = {
                ...mergedConfig[globalRulesIndex].rules,
                ...userConfig.rules,
            };
        }
        
        return defineConfig([...mergedConfig, ...nuxtConfig]);
    }
    
    // If user provides nothing or an array, just return defaults + nuxt config
    return defineConfig([...defaultConfig, ...nuxtConfig]);
}

