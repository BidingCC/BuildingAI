import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Injectable, Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";

/**
 * Upgrade script interface
 */
export interface UpgradeScript {
    /** Script version */
    version: string;
    /** Execute upgrade logic */
    execute(context: UpgradeContext): Promise<void>;
}

/**
 * Upgrade context
 *
 * Provides necessary dependencies for upgrade scripts
 */
export interface UpgradeContext {
    /** Database connection */
    dataSource: DataSource;
    /** Any additional services can be added here */
    [key: string]: any;
}

/**
 * Upgrade service
 *
 * Responsible for executing upgrade scripts from @buildingai/upgrade package
 * Handles complex business logic during version upgrades
 */
@Injectable()
export class UpgradeService {
    private readonly logger = new Logger(UpgradeService.name);
    private readonly upgradePackagePath: string;

    constructor(private readonly dataSource: DataSource) {
        try {
            // Get upgrade package path
            this.upgradePackagePath = require.resolve("@buildingai/upgrade");
        } catch (error) {
            console.error(error);
            this.logger.warn("@buildingai/upgrade package not found");
            this.upgradePackagePath = "";
        }
    }

    /**
     * Check if upgrade script exists for version
     *
     * Supports two formats:
     * 1. Directory format: scripts/{version}/index.js (recommended)
     * 2. Single file format: scripts/{version}.js (legacy)
     */
    async hasUpgradeScript(version: string): Promise<boolean> {
        if (!this.upgradePackagePath) {
            return false;
        }

        try {
            const upgradeDistPath = path.dirname(this.upgradePackagePath);

            // Check directory format first (recommended)
            const versionDirPath = path.join(upgradeDistPath, "scripts", version, "index.js");
            if (await fse.pathExists(versionDirPath)) {
                return true;
            }

            // Fallback to single file format (legacy)
            const versionFilePath = path.join(upgradeDistPath, "scripts", `${version}.js`);
            return fse.pathExists(versionFilePath);
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    /**
     * Load upgrade script for version
     *
     * Supports two formats:
     * 1. Directory format: scripts/{version}/index.js (recommended)
     * 2. Single file format: scripts/{version}.js (legacy)
     */
    private async loadUpgradeScript(version: string): Promise<UpgradeScript | null> {
        try {
            const upgradeDistPath = path.dirname(this.upgradePackagePath);

            // Try directory format first (recommended)
            let versionScriptPath = path.join(upgradeDistPath, "scripts", version, "index.js");
            let scriptFormat = "directory";

            if (!(await fse.pathExists(versionScriptPath))) {
                // Fallback to single file format (legacy)
                versionScriptPath = path.join(upgradeDistPath, "scripts", `${version}.js`);
                scriptFormat = "file";

                if (!(await fse.pathExists(versionScriptPath))) {
                    return null;
                }
            }

            this.logger.log(`Loading upgrade script for ${version} (${scriptFormat} format)`);

            // Use require for CommonJS modules to avoid import() issues

            const scriptModule = require(versionScriptPath);

            // Check if script exports default or named export
            const UpgradeClass = scriptModule.default || scriptModule.Upgrade;

            if (!UpgradeClass) {
                this.logger.warn(`No upgrade class found in ${versionScriptPath}`);
                return null;
            }

            // Verify it's a constructor function
            if (typeof UpgradeClass !== "function") {
                this.logger.warn(
                    `Upgrade class is not a constructor in ${versionScriptPath}, type: ${typeof UpgradeClass}`,
                );
                return null;
            }

            // Create instance
            const instance = new UpgradeClass();

            // Validate interface
            if (typeof instance.execute !== "function") {
                this.logger.warn(`Upgrade script ${version} does not have execute method`);
                return null;
            }

            return {
                version,
                execute: instance.execute.bind(instance),
            };
        } catch (error) {
            this.logger.error(`Failed to load upgrade script for ${version}: ${error.message}`);
            return null;
        }
    }

    /**
     * Execute upgrade script for a specific version
     *
     * @param version Version to upgrade to
     * @param context Upgrade context with dependencies
     */
    async executeUpgradeScript(version: string, context: UpgradeContext): Promise<void> {
        try {
            const hasScript = await this.hasUpgradeScript(version);

            if (!hasScript) {
                this.logger.log(`No upgrade script found for version ${version}`);
                return;
            }

            this.logger.log(`Loading upgrade script for version ${version}`);
            TerminalLogger.log("Upgrade Script", `Loading for version ${version}`);

            const script = await this.loadUpgradeScript(version);

            if (!script) {
                this.logger.warn(`Failed to load upgrade script for version ${version}`);
                return;
            }

            this.logger.log(`Executing upgrade script for version ${version}`);
            TerminalLogger.log("Upgrade Script", `Executing for version ${version}`);

            await script.execute(context);

            this.logger.log(`Upgrade script completed for version ${version}`);
            TerminalLogger.success("Upgrade Script", `Completed for version ${version}`);
        } catch (error) {
            this.logger.error(`Upgrade script failed for ${version}: ${error.message}`);
            TerminalLogger.error("Upgrade Script", `Failed for ${version}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute upgrade scripts for multiple versions
     *
     * @param versions Array of versions to upgrade through
     * @param context Upgrade context with dependencies
     */
    async executeUpgradeScripts(versions: string[], context: UpgradeContext): Promise<void> {
        if (versions.length === 0) {
            return;
        }

        this.logger.log(`Executing upgrade scripts for versions: ${versions.join(", ")}`);
        TerminalLogger.log("Upgrade Script", `Processing versions: ${versions.join(", ")}`);

        for (const version of versions) {
            await this.executeUpgradeScript(version, context);
        }

        this.logger.log("All upgrade scripts completed");
        TerminalLogger.success("Upgrade Script", "All scripts completed");
    }

    /**
     * Create upgrade context
     *
     * @param additionalServices Additional services to include in context
     */
    createContext(additionalServices: Record<string, any> = {}): UpgradeContext {
        return {
            dataSource: this.dataSource,
            ...additionalServices,
        };
    }
}
