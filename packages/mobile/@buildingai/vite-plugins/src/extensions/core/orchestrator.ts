import * as path from "node:path";

import type { Plugin } from "vite";

import type { Extension, PluginOptions } from "../types.js";
import { ExtensionLinker } from "./linker.js";
import { ExtensionRegistry } from "./registry.js";

export class ExtensionOrchestrator {
    private registry!: ExtensionRegistry;
    private linker!: ExtensionLinker;
    private extensions: Extension[] = [];
    private watcher?: any;

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

                // 立即创建软链接
                await this.linker.link(this.extensions);

                console.log(`[extensions] ${this.extensions.length} loaded`);

                // 配置 Vite 监听扩展目录
                const extensionRoots = this.extensions.map((ext) => ext.root);
                return {
                    ...config,
                    server: {
                        ...config.server,
                        watch: {
                            ...config.server?.watch,
                            ignored: config.server?.watch?.ignored,
                        },
                        fs: {
                            ...config.server?.fs,
                            allow: [...(config.server?.fs?.allow || []), extensionsDir, ...extensionRoots],
                        },
                    },
                };
            },

            configureServer: async (server) => {
                if (this.options.enableHmr === false) return;

                // 监听配置文件变化
                const chokidar = await import("chokidar");
                this.watcher = chokidar.watch(`${this.registry["rootDir"]}/**/uniapp.config.ts`, {
                    ignoreInitial: true,
                });

                this.watcher.on("change", async () => {
                    console.log("[extensions] Config changed, reloading...");
                    this.extensions = await this.registry.discover();
                    await this.linker.unlink(this.extensions);
                    await this.linker.link(this.extensions);
                    server.ws.send({ type: "full-reload", path: "*" });
                });

                // 监听扩展目录文件变化（.vue, .ts 等）
                const extensionRoots = this.extensions.map((ext) => `${ext.root}/**/*.{vue,ts,js,json}`);
                const fileWatcher = chokidar.watch(extensionRoots, {
                    ignoreInitial: true,
                });

                fileWatcher.on("change", (filePath) => {
                    console.log(`[extensions] File changed: ${filePath}`);
                    // Vite 会自动处理热更新，我们只需要确保文件被监听到
                });
            },

            closeBundle: async () => {
                await this.linker.unlink(this.extensions);
                if (this.watcher) await this.watcher.close();
            },
        };
    }
}
