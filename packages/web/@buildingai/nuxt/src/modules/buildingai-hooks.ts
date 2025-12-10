import { resolve } from "node:path";

import { addImportsDir, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
    meta: {
        name: "buildingai-hooks",
        configKey: "buildingaiHooks",
    },
    setup(options, nuxt) {
        const hooksPath = resolve(nuxt.options.rootDir, "node_modules/@buildingai/hooks/src");
        addImportsDir(hooksPath);

        const httpSrcPath = resolve(
            nuxt.options.rootDir,
            "node_modules/@buildingai/http/src/hooks",
        );
        addImportsDir(httpSrcPath);
    },
});
