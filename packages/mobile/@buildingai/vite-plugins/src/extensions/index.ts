import * as path from "node:path";

import { ExtensionOrchestrator } from "./core/orchestrator.js";
import { ExtensionRegistry } from "./core/registry.js";
import type { PluginOptions } from "./types.js";

export function uniappExtensions(options: PluginOptions = {}) {
    return new ExtensionOrchestrator(options).createPlugin();
}

export async function loadExtensionSubPackages(
    extensionsDir = "../../../extensions",
    options: PluginOptions = {},
): Promise<Array<{ root: string; pages: any[] }>> {
    const resolvedDir = path.resolve(process.cwd(), extensionsDir);
    const extensions = await new ExtensionRegistry(resolvedDir, options).discover();
    return extensions.map((ext) => ({
        root: ext.config.root,
        pages: ext.config.pages,
    }));
}

export type * from "./types.js";
export { defineExtension } from "./types.js";
