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
                if (await pathExists(linkPath)) {
                    console.log(`[extensions] Removing existing: ${linkPath}`);
                    await unlink(linkPath);
                }
                console.log(`[extensions] Creating symlink: ${linkPath} -> ${ext.root}`);
                await symlink(ext.root, linkPath, "dir");
                console.log(`[extensions] ✓ Linked: ${ext.config.name || ext.config.root}`);
            } catch (error) {
                console.error(
                    `[extensions] ✗ Failed to link ${ext.config.name || ext.config.root}:`,
                    error,
                );
            }
        }
    }

    async unlink(extensions: Extension[]): Promise<void> {
        for (const ext of extensions) {
            const linkPath = path.join(this.targetDir, "src", ext.config.root);
            try {
                if (await pathExists(linkPath)) {
                    await unlink(linkPath);
                    console.log(`[extensions] ✓ Unlinked: ${ext.config.name || ext.config.root}`);
                }
            } catch (error) {
                console.error(
                    `[extensions] ✗ Failed to unlink ${ext.config.name || ext.config.root}:`,
                    error,
                );
            }
        }
    }
}
