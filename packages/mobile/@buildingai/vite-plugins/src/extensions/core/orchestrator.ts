import * as fs from "node:fs";
import * as path from "node:path";

import glob from "fast-glob";
import type { Plugin } from "vite";

import type { Extension, PluginOptions } from "../types.js";
import { ExtensionLinker } from "./linker.js";
import { ExtensionRegistry } from "./registry.js";

const SUPPORTED_LOCALES = ["zh", "en", "jp"];
const I18N_PLACEHOLDER_PRELOAD = "/* __EXTENSION_I18N_PRELOAD__ */";
const I18N_PLACEHOLDER_NAMESPACES = "/* __EXTENSION_NAMESPACES__ */";
const I18N_INDEX_PATTERNS = ["i18n/index.ts", "i18n/index.js"];

export class ExtensionOrchestrator {
    private registry!: ExtensionRegistry;
    private linker!: ExtensionLinker;
    private extensions: Extension[] = [];

    constructor(private readonly options: PluginOptions = {}) {}

    private async discoverExtensionNamespaces(): Promise<Record<string, string[]>> {
        const result: Record<string, string[]> = {};

        for (const ext of this.extensions) {
            const i18nDir = path.join(ext.root, "i18n");
            if (!fs.existsSync(i18nDir)) continue;

            const pattern = path.join(i18nDir, "*", "*.json");
            const files = await glob(pattern, { absolute: true });

            const namespaces = new Set<string>();
            for (const file of files) {
                namespaces.add(path.basename(file, ".json"));
            }

            if (namespaces.size > 0) {
                result[ext.config.root] = Array.from(namespaces);
            }
        }

        return result;
    }

    private generatePreloadCode(namespaces: Record<string, string[]>): string {
        return Object.entries(namespaces)
            .flatMap(([extensionRoot, nsList]) =>
                SUPPORTED_LOCALES.flatMap((locale) =>
                    nsList.map(
                        (ns) =>
                            `require.async("../extensions/${extensionRoot}/i18n/${locale}/${ns}.json.js").catch(() => {});`,
                    ),
                ),
            )
            .join("\n");
    }

    private generateNamespacesCode(namespaces: Record<string, string[]>): string {
        return Object.entries(namespaces)
            .map(([root, ns]) => `"${root}": ${JSON.stringify(ns)}`)
            .join(",\n        ");
    }

    private shouldTransform(id: string): boolean {
        return I18N_INDEX_PATTERNS.some((pattern) => id.includes(pattern));
    }

    private transformI18nCode(code: string, namespaces: Record<string, string[]>): string {
        let result = code;

        if (result.includes(I18N_PLACEHOLDER_PRELOAD)) {
            result = result.replace(I18N_PLACEHOLDER_PRELOAD, this.generatePreloadCode(namespaces));
        }

        if (result.includes(I18N_PLACEHOLDER_NAMESPACES)) {
            result = result.replace(
                I18N_PLACEHOLDER_NAMESPACES,
                this.generateNamespacesCode(namespaces),
            );
        }

        return result;
    }

    private async bundleExtensionI18n(
        bundle: Record<string, unknown>,
        ext: Extension,
    ): Promise<void> {
        const i18nPattern = path.join(ext.root, "i18n", "**", "*.json");
        const i18nFiles = await glob(i18nPattern, { absolute: true });

        for (const file of i18nFiles) {
            const relPath = path.relative(ext.root, file);
            const outputPath = `extensions/${ext.config.root}/${relPath}.js`;
            const content = fs.readFileSync(file, "utf-8");

            (bundle as Record<string, unknown>)[outputPath] = {
                type: "asset",
                fileName: outputPath,
                source: `module.exports = ${content};`,
            };
        }
    }

    private getServerFsAllowPaths(config: { root?: string }): string[] {
        const rootDir = path.resolve(config.root || process.cwd());
        const extensionsDir = path.resolve(
            rootDir,
            this.options.extensionsDir || "../../../extensions",
        );

        const extensionRoots = this.extensions.map((ext) => ext.root);
        const symlinkPaths = this.extensions.map((ext) =>
            path.join(config.root || process.cwd(), "src", "extensions", ext.config.root),
        );

        return [extensionsDir, ...extensionRoots, ...symlinkPaths];
    }

    private setupCleanupOnExit(): void {
        const cleanup = async () => {
            try {
                await this.linker.unlink(this.extensions);
            } catch {
                // ignore cleanup errors
            }
        };

        process.once("SIGINT", cleanup);
        process.once("SIGTERM", cleanup);
        process.once("exit", cleanup);
    }

    createPlugin(): Plugin {
        let extensionNamespaces: Record<string, string[]> = {};

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

                extensionNamespaces = await this.discoverExtensionNamespaces();
                if (Object.keys(extensionNamespaces).length > 0) {
                    console.log(`[extensions] i18n namespaces:`, extensionNamespaces);
                }

                return {
                    ...config,
                    server: {
                        ...config.server,
                        fs: {
                            ...config.server?.fs,
                            allow: [
                                ...(config.server?.fs?.allow || []),
                                ...this.getServerFsAllowPaths(config),
                            ],
                        },
                    },
                };
            },

            buildStart: async () => {
                console.log(`[extensions] Creating symlinks...`);
                await this.linker.link(this.extensions);
                this.setupCleanupOnExit();
            },

            transform: (code, id) => {
                if (!this.shouldTransform(id)) return code;
                return this.transformI18nCode(code, extensionNamespaces);
            },

            generateBundle: async (_, bundle) => {
                await Promise.all(
                    this.extensions.map((ext) => this.bundleExtensionI18n(bundle, ext)),
                );
            },

            buildEnd: async () => {
                await this.linker.unlink(this.extensions);
            },

            closeBundle: async () => {
                await this.linker.unlink(this.extensions);
            },
        };
    }
}
