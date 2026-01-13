/**
 * @see https://prettier.io/docs/configuration
 */
module.exports = {
    printWidth: 100,
    proseWrap: "always",
    endOfLine: "lf",
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    plugins: ["prettier-plugin-tailwindcss"],
    overrides: [
        {
            files: [
                "packages/client/**/*",
                "packages/web/@buildingai/ui/**/*",
                "packages/web/buildingai-ui/**/*",
            ],
            options: {
                tabWidth: 2,
            },
        },
    ],
};
