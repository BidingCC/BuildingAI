// https://nuxt.com/docs/api/configuration/nuxt-config

import { defineBuildingAIExtensionConfig } from "@buildingai/nuxt";

import packageJson from "./package.json";

export default defineBuildingAIExtensionConfig(packageJson.name, {
    compatibilityDate: "2025-07-15",
    css: ["assets/styles/globals.css"],

    devtools: { enabled: true },
});
