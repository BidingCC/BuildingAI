import * as path from "node:path";

import glob from "fast-glob";
import fsExtra from "fs-extra";

import type { Extension, ExtensionConfig, PluginOptions } from "../types.js";

const { pathExists } = fsExtra;

export class ExtensionRegistry {
    constructor(
        private readonly rootDir: string,
        private readonly options: PluginOptions = {},
    ) {}

    async discover(): Promise<Extension[]> {
        const { include = ["*/src/uniapp"], exclude = [] } = this.options;
        const patterns = include.map((p) => path.join(this.rootDir, p, "uniapp.config.ts"));
        const configPaths = await glob(patterns, {
            absolute: true,
            ignore: exclude.map((p) => path.join(this.rootDir, p)),
        });

        const extensions: Extension[] = [];
        for (const configPath of configPaths) {
            const ext = await this.resolve(configPath);
            if (ext) extensions.push(ext);
        }
        return extensions;
    }

    private async resolve(configPath: string): Promise<Extension | null> {
        try {
            const module = await import(`${configPath}?t=${Date.now()}`);
            const config: ExtensionConfig = module.default;

            if (!this.isValid(config) || config.enabled === false) return null;

            const root = path.dirname(configPath);

            if (!config.name) {
                const extensionRoot = path.dirname(path.dirname(root));
                config.name = path.basename(extensionRoot);
            }

            for (const page of config.pages) {
                if (!(await pathExists(path.join(root, `${page.path}.vue`)))) return null;
            }

            return { config, root, configPath };
        } catch {
            return null;
        }
    }

    private isValid(config: any): config is ExtensionConfig {
        return (
            config &&
            typeof config.root === "string" &&
            Array.isArray(config.pages) &&
            config.pages.length > 0
        );
    }
}
