import { ExtensionStatus, ExtensionType } from "@buildingai/constants/shared/extension.constant";
import fse from "fs-extra";
import * as path from "path";

import { DataSource } from "../../typeorm";
import { Extension } from "./../../entities/extension.entity";
import { BaseSeeder } from "./base.seeder";

/**
 * Application extension configuration data structure
 */
interface ExtensionConfig {
    manifest: {
        identifier: string;
        name: string;
        version: string;
        description: string;
        author: {
            avatar: string;
            name: string;
            homepage: string;
        };
    };
    isLocal: boolean;
    enabled: boolean;
    installedAt: string;
}

/**
 * Extension initialization seeder
 *
 * Responsible for:
 * 1. Initializing PostgreSQL extensions (pgvector, zhparser)
 * 2. Initializing application extensions from configuration file
 */
export class ExtensionSeeder extends BaseSeeder {
    readonly name = "ExtensionSeeder";
    readonly priority = 10;

    async run(dataSource: DataSource): Promise<void> {
        // Only execute when using PostgreSQL
        if (dataSource.options.type !== "postgres") {
            this.logInfo("Non-PostgreSQL database detected, skipping extension initialization");
            return;
        }

        try {
            // Initialize pgvector extension
            await this.initPgvector(dataSource);

            // Initialize zhparser extension and Chinese segmentation configuration
            await this.initZhparser(dataSource);

            this.logSuccess("Database extensions initialized successfully");
        } catch (error) {
            this.logError(`Database extension initialization failed: ${error.message}`);
            throw error;
        }

        // Initialize application extensions
        await this.initApplicationExtensions(dataSource);
    }

    /**
     * Initialize pgvector extension
     */
    private async initPgvector(dataSource: DataSource): Promise<void> {
        try {
            await dataSource.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
            this.logSuccess("pgvector extension initialized");
        } catch (error) {
            this.logError(`pgvector extension initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize zhparser extension and Chinese segmentation configuration
     */
    private async initZhparser(dataSource: DataSource): Promise<void> {
        try {
            // Create zhparser extension
            await dataSource.query(`CREATE EXTENSION IF NOT EXISTS zhparser;`);

            // Create Chinese segmentation configuration
            await dataSource.query(`
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_ts_config WHERE cfgname = 'chinese_zh'
                  ) THEN
                    CREATE TEXT SEARCH CONFIGURATION chinese_zh (PARSER = zhparser);
                    ALTER TEXT SEARCH CONFIGURATION chinese_zh ADD MAPPING FOR n,v,a,i,e,l,j,o,u WITH simple;
                  END IF;
                END $$;
            `);

            // Create full-text index when the table exists
            await dataSource.query(`
                DO $$
                BEGIN
                  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datasets_segments') THEN
                    IF NOT EXISTS (
                      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_segments_content_zh'
                    ) THEN
                      CREATE INDEX idx_segments_content_zh ON datasets_segments USING GIN (to_tsvector('chinese_zh', content));
                    END IF;
                  END IF;
                END $$;
            `);

            this.logSuccess("zhparser segmentation configuration and full-text index initialized");
        } catch (error) {
            this.logError(`zhparser initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load extensions configuration from project root extensions folder
     *
     * @returns Extensions configuration data
     */
    private async loadExtensionsConfig(): Promise<{
        applications: Record<string, ExtensionConfig>;
        functionals: Record<string, ExtensionConfig>;
    }> {
        const possiblePath = path.join(process.cwd(), "../../extensions/extensions.json");

        if (fse.pathExistsSync(possiblePath)) {
            return await fse.readJson(possiblePath);
        }

        throw new Error("Unable to find extensions.json in project root extensions folder");
    }

    /**
     * Initialize application extensions from configuration file
     */
    private async initApplicationExtensions(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(Extension);

        try {
            // Load extensions configuration file from project root extensions folder
            const extensionsData = await this.loadExtensionsConfig();

            let createdCount = 0;
            let updatedCount = 0;

            // Process application extensions
            if (extensionsData.applications) {
                for (const [_key, config] of Object.entries(extensionsData.applications)) {
                    const isNew = await this.processExtension(
                        repository,
                        config,
                        ExtensionType.APPLICATION,
                    );
                    if (isNew) {
                        createdCount++;
                    } else {
                        updatedCount++;
                    }
                }
            }

            // Process functional extensions
            if (extensionsData.functionals) {
                for (const [_key, config] of Object.entries(extensionsData.functionals)) {
                    const isNew = await this.processExtension(
                        repository,
                        config,
                        ExtensionType.FUNCTIONAL,
                    );
                    if (isNew) {
                        createdCount++;
                    } else {
                        updatedCount++;
                    }
                }
            }

            this.logSuccess(
                `Application extensions initialized: created ${createdCount}, updated ${updatedCount}`,
            );
        } catch (error) {
            this.logError(`Application extension initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process a single extension configuration
     *
     * @returns true if a new extension was created, false if updated
     */
    private async processExtension(
        repository: any,
        config: ExtensionConfig,
        type: number,
    ): Promise<boolean> {
        // Check if extension already exists
        let extension = await repository.findOne({
            where: { identifier: config.manifest.identifier },
        });

        // Prepare extension data
        const extensionData = {
            icon: "/static/extensions/default.png",
            name: config.manifest.name,
            identifier: config.manifest.identifier,
            version: config.manifest.version,
            description: config.manifest.description,
            type: type,
            isLocal: config.isLocal,
            status: config.enabled ? ExtensionStatus.ENABLED : ExtensionStatus.DISABLED,
            author: config.manifest.author,
        };

        if (!extension) {
            // Create new extension
            await repository.save(extensionData);
            this.logInfo(`Created application extension: ${config.manifest.name}`);
            return true;
        } else {
            // Update existing extension
            await repository.update(extension.id, extensionData);
            this.logInfo(`Updated application extension: ${config.manifest.name}`);
            return false;
        }
    }
}
