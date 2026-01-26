import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Injectable, Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";

import { ExtensionVersionManagerService } from "./extension-version-manager.service";

interface ExtensionConfig {
    identifier: string;
    enabled: boolean;
}

/**
 * Extension upgrade orchestrator service
 *
 * Responsible for coordinating upgrades across all enabled extensions
 */
@Injectable()
export class ExtensionUpgradeOrchestratorService {
    private readonly logger = new Logger(ExtensionUpgradeOrchestratorService.name);
    private readonly extensionsConfigPath: string;

    constructor(private readonly dataSource: DataSource) {
        // Navigate up from packages/api to project root
        this.extensionsConfigPath = path.join(
            process.cwd(),
            "..",
            "..",
            "extensions",
            "extensions.json",
        );
    }

    /**
     * Get all enabled extensions from extensions.json
     */
    private async getEnabledExtensions(): Promise<ExtensionConfig[]> {
        try {
            if (!(await fse.pathExists(this.extensionsConfigPath))) {
                this.logger.warn(`Extensions config file not found: ${this.extensionsConfigPath}`);
                return [];
            }

            const config = await fse.readJson(this.extensionsConfigPath);

            const enabledExtensions: ExtensionConfig[] = [];

            // Process applications
            if (config.applications) {
                for (const [identifier, ext] of Object.entries(config.applications) as Array<
                    [string, any]
                >) {
                    if (ext.enabled) {
                        enabledExtensions.push({ identifier, enabled: true });
                    }
                }
            }

            // Process functionals
            if (config.functionals) {
                for (const [identifier, ext] of Object.entries(config.functionals) as Array<
                    [string, any]
                >) {
                    if (ext.enabled) {
                        enabledExtensions.push({ identifier, enabled: true });
                    }
                }
            }

            return enabledExtensions;
        } catch (error) {
            this.logger.error(`Failed to read extensions config: ${error.message}`);
            return [];
        }
    }

    /**
     * Check if extension directory exists and has build output
     */
    private async isExtensionReady(identifier: string): Promise<boolean> {
        // Navigate up from packages/api to project root
        const extensionDir = path.join(process.cwd(), "..", "..", "extensions", identifier);
        const buildDir = path.join(extensionDir, "build");

        const hasExtensionDir = await fse.pathExists(extensionDir);
        const hasBuildDir = await fse.pathExists(buildDir);

        return hasExtensionDir && hasBuildDir;
    }

    /**
     * Check and upgrade all enabled extensions
     */
    async checkAndUpgradeAll(): Promise<void> {
        this.logger.log("🔌 Starting extension upgrade check...");
        TerminalLogger.log("Extension Upgrade", "Starting extension upgrade check...", {
            icon: "⬆",
        });

        try {
            const enabledExtensions = await this.getEnabledExtensions();

            if (enabledExtensions.length === 0) {
                this.logger.log("ℹ  No enabled extensions found");
                TerminalLogger.log("Extension Upgrade", "No enabled extensions found", {
                    icon: "⬆",
                });
                return;
            }

            this.logger.log(
                `Found ${enabledExtensions.length} enabled extension(s): ${enabledExtensions.map((e) => e.identifier).join(", ")}`,
            );

            let upgradedCount = 0;
            let skippedCount = 0;
            let failedCount = 0;

            for (const extension of enabledExtensions) {
                try {
                    // Check if extension is ready (has build output)
                    const isReady = await this.isExtensionReady(extension.identifier);
                    if (!isReady) {
                        this.logger.warn(
                            `Extension ${extension.identifier} build not found, skipping upgrade...`,
                        );
                        TerminalLogger.log(
                            "Extension Upgrade",
                            `[${extension.identifier}] Build not found, skipping...`,
                            {
                                icon: "⬆",
                            },
                        );
                        skippedCount++;
                        continue;
                    }

                    const manager = new ExtensionVersionManagerService(
                        this.dataSource,
                        extension.identifier,
                    );

                    await manager.checkAndUpgrade();
                    upgradedCount++;
                } catch (error) {
                    this.logger.error(
                        `Extension ${extension.identifier} upgrade failed: ${error.message}`,
                    );
                    TerminalLogger.error(
                        "Extension Upgrade",
                        `[${extension.identifier}] Failed: ${error.message}`,
                        {
                            icon: "⬆",
                        },
                    );
                    failedCount++;
                    // Don't throw - continue upgrading other extensions
                }
            }

            this.logger.log(
                `✅ Extension upgrade check completed. Upgraded: ${upgradedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
            );
            TerminalLogger.success(
                "Extension Upgrade",
                `Check completed. Upgraded: ${upgradedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`,
                {
                    icon: "⬆",
                },
            );
        } catch (error) {
            this.logger.error(`Extension upgrade orchestrator failed: ${error.message}`);
            TerminalLogger.error("Extension Upgrade", `Orchestrator failed: ${error.message}`, {
                icon: "⬆",
            });
            throw error;
        }
    }
}
