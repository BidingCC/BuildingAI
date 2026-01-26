import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
    meta: {
        name: "buildingai-extensions-loader",
    },
    setup(options, nuxt) {
        // Only execute in development or production environment
        if (process.env.NODE_ENV === "production") {
            return;
        }

        const extensionsDir = resolve(process.cwd(), "../../../extensions");

        const extensionsDirs = readdirSync(extensionsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .filter((dirent) => !dirent.name.startsWith("."))
            .map((dirent) => dirent.name);
        const availableExtensions: string[] = [];

        for (const extensionsName of extensionsDirs) {
            const extensionsPath = resolve(extensionsDir, extensionsName);
            const outputPath = resolve(extensionsPath, ".output", "public");

            if (existsSync(outputPath)) {
                availableExtensions.push(extensionsName);

                nuxt.hook("nitro:config", (nitroConfig) => {
                    nitroConfig.publicAssets = nitroConfig.publicAssets || [];
                    nitroConfig.publicAssets.push({
                        dir: outputPath,
                        baseURL: `/extensions/${extensionsName}/`,
                    });
                });
            }
        }

        nuxt.options.runtimeConfig.public.extensions = availableExtensions;
    },
});
