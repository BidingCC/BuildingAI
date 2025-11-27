import { symlink, unlink } from "node:fs/promises";
import * as path from "node:path";

import fsExtra from "fs-extra";

import type { Extension } from "../types.js";

const { pathExists } = fsExtra;

export class ExtensionLinker {
    constructor(private readonly targetDir: string) {}

    async link(extensions: Extension[]): Promise<void> {
        for (const ext of extensions) {
            const linkPath = path.join(this.targetDir, "src", ext.config.root);
            try {
                if (await pathExists(linkPath)) await unlink(linkPath);
                await symlink(ext.root, linkPath, "dir");
            } catch {
                console.error(
                    `[extensions] Failed to link extension ${ext.config.name}: ${linkPath}`,
                );
            }
        }
    }

    async unlink(extensions: Extension[]): Promise<void> {
        for (const ext of extensions) {
            const linkPath = path.join(this.targetDir, "src", ext.config.root);
            try {
                if (await pathExists(linkPath)) await unlink(linkPath);
            } catch {
                console.error(
                    `[extensions] Failed to unlink extension ${ext.config.name}: ${linkPath}`,
                );
            }
        }
    }
}
