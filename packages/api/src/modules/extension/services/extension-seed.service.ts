import type { ExtensionInfo } from "@buildingai/core/modules";
import { BaseSeeder } from "@buildingai/db";
import { SeedRunner } from "@buildingai/db/seeds";
import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs-extra";
import * as path from "path";

/**
 * Extension seed execution service
 *
 * Handles seed execution for extensions on first installation
 */
@Injectable()
export class ExtensionSeedService {
    private readonly logger = new Logger(ExtensionSeedService.name);
    private readonly rootDir: string;
    private readonly extensionsDir: string;

    constructor(private readonly dataSource: DataSource) {
        this.rootDir = path.join(process.cwd(), "..", "..");
        this.extensionsDir = path.join(this.rootDir, "extensions");
    }

    /**
     * Execute seeds for all newly installed extensions
     *
     * @param extensionList List of enabled extensions
     */
    async executeNewExtensionSeeds(extensionList: ExtensionInfo[]): Promise<void> {
        if (extensionList.length === 0) {
            return;
        }

        this.logger.log("Checking for newly installed extensions...");

        for (const extensionInfo of extensionList) {
            try {
                const isInstalled = await this.isExtensionInstalled(extensionInfo.identifier);

                if (!isInstalled) {
                    this.logger.log(
                        `First time installation detected for ${extensionInfo.identifier}, running seeds...`,
                    );
                    await this.runExtensionSeeds(extensionInfo);
                    await this.markExtensionAsInstalled(
                        extensionInfo.identifier,
                        extensionInfo.version,
                    );
                } else {
                    TerminalLogger.log(
                        "Extension",
                        `Extension ${extensionInfo.identifier} already installed, skipping seeds`,
                    );
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Failed to execute seeds for ${extensionInfo.identifier}: ${errorMessage}`,
                );
                // Don't throw - allow app to continue starting
            }
        }

        this.logger.log("Extension seed check completed");
    }

    /**
     * Check if extension is already installed
     *
     * @param identifier Extension identifier
     * @returns Whether the extension is installed
     * @private
     */
    private async isExtensionInstalled(identifier: string): Promise<boolean> {
        const safeIdentifier = this.toSafeName(identifier);
        const extensionPath = path.join(this.extensionsDir, safeIdentifier);
        const installFilePath = path.join(extensionPath, "data", ".installed");
        return await fs.pathExists(installFilePath);
    }

    /**
     * Run extension seeds
     *
     * @param extensionInfo Extension information
     * @private
     */
    private async runExtensionSeeds(extensionInfo: ExtensionInfo): Promise<void> {
        const safeIdentifier = this.toSafeName(extensionInfo.identifier);
        const extensionPath = path.join(this.extensionsDir, safeIdentifier);
        const seedsIndexPath = path.join(extensionPath, "build", "db", "seeds", "index.js");

        // Check if seeds entry exists
        if (!(await fs.pathExists(seedsIndexPath))) {
            this.logger.log(`Extension ${extensionInfo.identifier} has no seeds, skipping...`);
            return;
        }

        try {
            this.logger.log(`Running seeds for extension: ${extensionInfo.identifier}`);

            // Dynamic require for CommonJS modules

            const seedsModule = require(seedsIndexPath);

            if (!seedsModule.getSeeders) {
                this.logger.warn(
                    `Extension ${extensionInfo.identifier} seeds/index.ts must export getSeeders function`,
                );
                return;
            }

            // Get seeders and run
            const seeders: BaseSeeder[] = await seedsModule.getSeeders();

            if (!Array.isArray(seeders) || seeders.length === 0) {
                this.logger.log(`Extension ${extensionInfo.identifier} has no seeders to run`);
                return;
            }

            const seedRunner = new SeedRunner(this.dataSource);
            await seedRunner.run(seeders);

            this.logger.log(`Extension ${extensionInfo.identifier} seeds executed successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to run extension ${extensionInfo.identifier} seeds: ${errorMessage}`,
            );
            throw error;
        }
    }

    /**
     * Mark extension as installed
     *
     * @param identifier Extension identifier
     * @param version Extension version
     * @private
     */
    private async markExtensionAsInstalled(identifier: string, version: string): Promise<void> {
        try {
            const safeIdentifier = this.toSafeName(identifier);
            const extensionPath = path.join(this.extensionsDir, safeIdentifier);
            const dataDir = path.join(extensionPath, "data");
            await fs.ensureDir(dataDir);

            const installFilePath = path.join(dataDir, ".installed");
            await fs.writeFile(
                installFilePath,
                JSON.stringify(
                    {
                        installed_at: new Date().toISOString(),
                        version: version,
                        identifier: identifier,
                    },
                    null,
                    2,
                ),
            );

            this.logger.log(`Extension ${identifier} marked as installed`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to mark extension ${identifier} as installed: ${errorMessage}`,
            );
            // Don't throw error - this is not critical
        }
    }

    /**
     * Convert identifier to safe directory name
     *
     * @param identifier Extension identifier
     * @returns Safe directory name
     * @private
     */
    private toSafeName(identifier: string): string {
        return identifier.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
    }
}
