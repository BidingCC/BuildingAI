import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";

/**
 * Extension upgrade service
 *
 * Responsible for executing version-specific upgrade scripts for extensions
 */
export class ExtensionUpgradeService {
    private readonly logger = new Logger(ExtensionUpgradeService.name);
    private readonly extensionDir: string;
    private readonly upgradeDir: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly extensionIdentifier: string,
    ) {
        // Navigate up from packages/api to project root
        this.extensionDir = path.join(process.cwd(), "..", "..", "extensions", extensionIdentifier);
        // Upgrade scripts are in build/upgrade (not build/db/upgrade)
        this.upgradeDir = path.join(this.extensionDir, "build", "upgrade");
    }

    /**
     * Execute upgrade script for a specific version
     */
    async executeUpgrade(version: string): Promise<void> {
        try {
            const versionDir = path.join(this.upgradeDir, version);
            const indexPath = path.join(versionDir, "index.js");

            // Check if upgrade script exists
            if (!(await fse.pathExists(indexPath))) {
                this.logger.log(
                    `[${this.extensionIdentifier}] No upgrade script found for version: ${version}`,
                );
                return;
            }

            this.logger.log(
                `[${this.extensionIdentifier}] Executing upgrade script for version: ${version}`,
            );
            TerminalLogger.log(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] Executing for version ${version}`,
                {
                    icon: "⬆",
                },
            );

            // Dynamically import upgrade module
            const upgradeModule = await import(indexPath);

            if (upgradeModule.Upgrade) {
                const upgradeInstance = new upgradeModule.Upgrade(this.dataSource);

                if (typeof upgradeInstance.execute === "function") {
                    await upgradeInstance.execute();
                    this.logger.log(
                        `[${this.extensionIdentifier}] Upgrade script completed for version: ${version}`,
                    );
                    TerminalLogger.success(
                        "Extension Upgrade",
                        `[${this.extensionIdentifier}] Completed for version ${version}`,
                        {
                            icon: "⬆",
                        },
                    );
                } else {
                    this.logger.warn(
                        `[${this.extensionIdentifier}] Upgrade class does not have execute method for version: ${version}`,
                    );
                }
            } else {
                this.logger.warn(
                    `[${this.extensionIdentifier}] No Upgrade class found in upgrade module for version: ${version}`,
                );
            }
        } catch (error) {
            this.logger.error(
                `[${this.extensionIdentifier}] Upgrade script failed for version ${version}: ${error.message}`,
            );
            TerminalLogger.error(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] Failed for version ${version}: ${error.message}`,
                {
                    icon: "⬆",
                },
            );
            throw error;
        }
    }

    /**
     * Execute upgrade scripts for multiple versions
     */
    async executeUpgrades(versions: string[]): Promise<void> {
        this.logger.log(
            `[${this.extensionIdentifier}] Processing upgrade scripts for versions: ${versions.join(", ")}`,
        );
        TerminalLogger.log(
            "Extension Upgrade",
            `[${this.extensionIdentifier}] Processing versions: ${versions.join(", ")}`,
            {
                icon: "⬆",
            },
        );

        for (const version of versions) {
            await this.executeUpgrade(version);
        }

        this.logger.log(`[${this.extensionIdentifier}] All upgrade scripts completed`);
        TerminalLogger.success(
            "Extension Upgrade",
            `[${this.extensionIdentifier}] All scripts completed`,
            {
                icon: "⬆",
            },
        );
    }
}
