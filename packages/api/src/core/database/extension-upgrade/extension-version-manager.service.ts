import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";

import { ExtensionMigrationRunner } from "./extension-migration-runner";
import { ExtensionUpgradeService } from "./extension-upgrade.service";
import { ExtensionVersionDetector, ExtensionVersionInfo } from "./extension-version-detector";

/**
 * Extension version manager service
 *
 * Manages the complete upgrade process for a single extension
 */
export class ExtensionVersionManagerService {
    private readonly logger = new Logger(ExtensionVersionManagerService.name);
    private readonly extensionDir: string;
    private readonly versionsDir: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly extensionIdentifier: string,
    ) {
        // Navigate up from packages/api to project root
        this.extensionDir = path.join(process.cwd(), "..", "..", "extensions", extensionIdentifier);
        this.versionsDir = path.join(this.extensionDir, "data", "versions");
    }

    /**
     * Check and upgrade extension if needed
     */
    async checkAndUpgrade(): Promise<void> {
        try {
            const detector = new ExtensionVersionDetector(this.extensionIdentifier);
            const versionInfo = await detector.detect();

            if (!versionInfo.needsUpgrade) {
                this.logger.log(
                    `Extension ${this.extensionIdentifier} is up to date: ${versionInfo.current}`,
                );
                return;
            }

            this.logger.log(
                `Extension ${this.extensionIdentifier} upgrade needed: ${versionInfo.installed || "initial"} -> ${versionInfo.current}`,
            );
            TerminalLogger.warn(
                "Extension Check",
                `[${this.extensionIdentifier}] Upgrade needed: ${versionInfo.installed || "initial"} -> ${versionInfo.current}`,
                { icon: "ℹ" },
            );

            await this.executeUpgrade(versionInfo);
        } catch (error) {
            this.logger.error(
                `Extension ${this.extensionIdentifier} version check and upgrade failed: ${error.message}`,
            );
            TerminalLogger.error(
                "Extension Check",
                `[${this.extensionIdentifier}] Failed: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Execute upgrade process
     *
     * Upgrades are executed version by version:
     * For each version: migration → upgrade script → write version file
     * This ensures that if upgrade fails, we can resume from the failed version
     */
    private async executeUpgrade(versionInfo: ExtensionVersionInfo): Promise<void> {
        try {
            this.logger.log(`[${this.extensionIdentifier}] Starting upgrade process...`);
            this.logger.log(
                `[${this.extensionIdentifier}] Upgrade path: ${versionInfo.upgradeVersions.join(" → ")}`,
            );
            TerminalLogger.log(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] Starting upgrade process...`,
                {
                    icon: "⬆",
                },
            );

            // Track the previous version for migration range calculation
            let previousVersion = versionInfo.installed;

            // Execute upgrade for each version sequentially
            for (const version of versionInfo.upgradeVersions) {
                await this.executeVersionUpgrade(version, previousVersion);
                previousVersion = version;
            }

            this.logger.log(
                `[${this.extensionIdentifier}] Upgrade completed: ${versionInfo.current}`,
            );
            TerminalLogger.success(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] Completed: ${versionInfo.current}`,
                {
                    icon: "⬆",
                },
            );
        } catch (error) {
            this.logger.error(`[${this.extensionIdentifier}] Upgrade failed: ${error.message}`);
            TerminalLogger.error(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] Failed: ${error.message}`,
                {
                    icon: "⬆",
                },
            );
            throw error;
        }
    }

    /**
     * Execute upgrade for a single version
     *
     * @param version Target version to upgrade to
     * @param fromVersion Previous version (null for initial installation)
     */
    private async executeVersionUpgrade(
        version: string,
        fromVersion: string | null,
    ): Promise<void> {
        this.logger.log(`[${this.extensionIdentifier}] Upgrading to ${version}...`);
        TerminalLogger.log(
            "Extension Upgrade",
            `[${this.extensionIdentifier}] Upgrading to ${version}...`,
            {
                icon: "⬆",
            },
        );

        try {
            // Step 1: Run migrations
            const migrationRunner = new ExtensionMigrationRunner(
                this.dataSource,
                this.extensionIdentifier,
            );
            await migrationRunner.runVersionMigrations(fromVersion, version);

            // Step 2: Run upgrade script
            const upgradeService = new ExtensionUpgradeService(
                this.dataSource,
                this.extensionIdentifier,
            );
            await upgradeService.executeUpgrades([version]);

            // Step 3: Write version file
            await this.writeVersionFile(version);

            this.logger.log(`[${this.extensionIdentifier}] Version ${version} upgrade completed`);
            TerminalLogger.success(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] ${version} completed`,
                {
                    icon: "⬆",
                },
            );
        } catch (error) {
            this.logger.error(
                `[${this.extensionIdentifier}] Version ${version} upgrade failed: ${error.message}`,
            );
            TerminalLogger.error(
                "Extension Upgrade",
                `[${this.extensionIdentifier}] ${version} failed: ${error.message}`,
                {
                    icon: "⬆",
                },
            );
            throw error;
        }
    }

    /**
     * Write version file to mark upgrade completion
     */
    private async writeVersionFile(version: string): Promise<void> {
        try {
            await fse.ensureDir(this.versionsDir);
            const versionFile = path.join(this.versionsDir, version);
            await fse.writeFile(versionFile, new Date().toISOString());
            this.logger.log(`[${this.extensionIdentifier}] Version file written: ${versionFile}`);
        } catch (error) {
            this.logger.error(
                `[${this.extensionIdentifier}] Failed to write version file for ${version}: ${error.message}`,
            );
            throw error;
        }
    }
}
