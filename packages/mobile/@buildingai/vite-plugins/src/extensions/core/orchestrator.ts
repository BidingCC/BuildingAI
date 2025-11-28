import * as path from "node:path";

import type { Plugin } from "vite";

import type { Extension, PluginOptions } from "../types.js";
import { ExtensionLinker } from "./linker.js";
import { ExtensionRegistry } from "./registry.js";

export class ExtensionOrchestrator {
    private registry!: ExtensionRegistry;
    private linker!: ExtensionLinker;
    private extensions: Extension[] = [];

    constructor(private readonly options: PluginOptions = {}) {}

    createPlugin(): Plugin {
        return {
            name: "vite:uniapp-extensions",
            enforce: "pre",

            config: async (config) => {
                const rootDir = path.resolve(config.root || process.cwd());
                const extensionsDir = path.resolve(
                    rootDir,
                    this.options.extensionsDir || "../../../extensions",
                );

                this.registry = new ExtensionRegistry(extensionsDir, this.options);
                this.linker = new ExtensionLinker(rootDir);
                this.extensions = await this.registry.discover();

                console.log(`[extensions] ${this.extensions.length} loaded`);

                // 配置 Vite 监听扩展目录
                const extensionRoots = this.extensions.map((ext) => ext.root);
                const symlinkPaths = this.extensions.map((ext) =>
                    path.join(config.root || process.cwd(), "src", ext.config.root),
                );

                return {
                    ...config,
                    server: {
                        ...config.server,
                        fs: {
                            ...config.server?.fs,
                            allow: [
                                ...(config.server?.fs?.allow || []),
                                extensionsDir,
                                ...extensionRoots,
                                ...symlinkPaths,
                            ],
                        },
                    },
                };
            },

            buildStart: async () => {
                console.log(`[extensions] Creating symlinks...`);
                await this.linker.link(this.extensions);
            },

            closeBundle: async () => {
                // 运行完成后删除软链接
                await this.linker.unlink(this.extensions);
            },
        };
    }
}
