import { DataSource, QueryRunner } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Logger } from "@nestjs/common";
import fse from "fs-extra";
import path from "path";
import semver from "semver";

interface MigrationFile {
    name: string;
    path: string;
    version: string;
    timestamp: number;
}

interface MigrationConstructor {
    new (...args: any[]): {
        up: (queryRunner: QueryRunner) => Promise<void>;
        down: (queryRunner: QueryRunner) => Promise<void>;
    };
}

/**
 * Extension migration runner
 *
 * Responsible for executing database migrations for a specific extension
 */
export class ExtensionMigrationRunner {
    private readonly logger = new Logger(ExtensionMigrationRunner.name);
    private readonly migrationsDir: string;
    private readonly historyTable: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly extensionIdentifier: string,
    ) {
        // Navigate up from packages/api to project root
        const extensionDir = path.join(
            process.cwd(),
            "..",
            "..",
            "extensions",
            extensionIdentifier,
        );
        this.migrationsDir = path.join(extensionDir, "build", "db", "migrations");
        // Use unified migration history table for all extensions
        this.historyTable = "extensions_migrations_history";
    }

    /**
     * Ensure migration history table exists
     */
    private async ensureMigrationHistoryTable(): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        try {
            await queryRunner.connect();
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "${this.historyTable}" (
                    id SERIAL PRIMARY KEY,
                    extension_identifier VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    version VARCHAR(50) NOT NULL,
                    timestamp BIGINT NOT NULL,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(extension_identifier, name)
                )
            `);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Check if migration has been executed
     */
    private async isMigrationExecuted(migrationName: string): Promise<boolean> {
        const result = await this.dataSource.query(
            `SELECT COUNT(*) as count FROM "${this.historyTable}" WHERE extension_identifier = $1 AND name = $2`,
            [this.extensionIdentifier, migrationName],
        );
        return parseInt(result[0].count, 10) > 0;
    }

    /**
     * Record migration execution
     */
    private async recordMigrationExecution(migration: MigrationFile): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO "${this.historyTable}" (extension_identifier, name, version, timestamp) VALUES ($1, $2, $3, $4)`,
            [this.extensionIdentifier, migration.name, migration.version, migration.timestamp],
        );
    }

    /**
     * Get all migration files
     */
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        try {
            if (!(await fse.pathExists(this.migrationsDir))) {
                this.logger.log(
                    `Migrations directory not found for ${this.extensionIdentifier}: ${this.migrationsDir}`,
                );
                return [];
            }

            const files = await fse.readdir(this.migrationsDir);

            // Expected format: {timestamp}-{version}-{description}.js
            // Example: 1762769127629-0.0.1-add-article-table.js
            const migrationFiles: MigrationFile[] = [];

            for (const file of files) {
                if (!file.match(/\.js$/) || file.startsWith(".")) {
                    continue;
                }

                const match = file.match(/^(\d+)-([^-]+)-(.+)\.js$/);
                if (match) {
                    const [, timestamp, version] = match;
                    migrationFiles.push({
                        name: file,
                        path: path.join(this.migrationsDir, file),
                        version: version,
                        timestamp: parseInt(timestamp, 10),
                    });
                }
            }

            return migrationFiles.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            this.logger.error(
                `Failed to get migration files for ${this.extensionIdentifier}: ${error.message}`,
            );
            return [];
        }
    }

    /**
     * Get migrations to run for version range
     */
    private async getMigrationsToRun(
        fromVersion: string | null,
        toVersion: string,
    ): Promise<MigrationFile[]> {
        const allMigrations = await this.getMigrationFiles();

        return allMigrations.filter((migration) => {
            if (!semver.valid(migration.version)) {
                return false;
            }

            if (!fromVersion) {
                return semver.lte(migration.version, toVersion);
            }

            return (
                semver.gt(migration.version, fromVersion) &&
                semver.lte(migration.version, toVersion)
            );
        });
    }

    /**
     * Execute a single migration
     */
    private async executeMigration(migration: MigrationFile): Promise<void> {
        try {
            const isExecuted = await this.isMigrationExecuted(migration.name);
            if (isExecuted) {
                this.logger.log(
                    `[${this.extensionIdentifier}] Migration already executed, skipping: ${migration.name}`,
                );
                TerminalLogger.log(
                    "Extension Migration",
                    `[${this.extensionIdentifier}] Skipped (already executed): ${migration.name}`,
                );
                return;
            }

            this.logger.log(`[${this.extensionIdentifier}] Executing migration: ${migration.name}`);
            TerminalLogger.log(
                "Extension Migration",
                `[${this.extensionIdentifier}] Executing: ${migration.name}`,
            );

            const migrationModule = await import(migration.path);

            // Try to find TypeORM class-based migration
            const MigrationClass = Object.values(migrationModule).find(
                (value): value is MigrationConstructor =>
                    typeof value === "function" &&
                    value.prototype &&
                    typeof value.prototype.up === "function",
            );

            if (MigrationClass) {
                const instance = new MigrationClass();
                const queryRunner = this.dataSource.createQueryRunner();
                try {
                    await queryRunner.connect();
                    await instance.up(queryRunner);
                } finally {
                    await queryRunner.release();
                }
            } else if (typeof migrationModule.up === "function") {
                // Function-based migration
                await migrationModule.up(this.dataSource);
            } else {
                throw new Error(
                    `Migration ${migration.name} does not export 'up' function or class`,
                );
            }

            await this.recordMigrationExecution(migration);

            this.logger.log(`[${this.extensionIdentifier}] Migration completed: ${migration.name}`);
            TerminalLogger.success(
                "Extension Migration",
                `[${this.extensionIdentifier}] Completed: ${migration.name}`,
            );
        } catch (error) {
            const errorMessage = error.message || "";
            const isIdempotentError =
                errorMessage.includes("already exists") ||
                errorMessage.includes("duplicate key") ||
                errorMessage.includes("already defined") ||
                (error.code && ["42701", "42P07", "23505"].includes(error.code));

            if (isIdempotentError) {
                this.logger.warn(
                    `[${this.extensionIdentifier}] Migration ${migration.name} encountered idempotent error (likely already applied), marking as completed`,
                );
                TerminalLogger.log(
                    "Extension Migration",
                    `[${this.extensionIdentifier}] Skipped (already applied): ${migration.name}`,
                );

                try {
                    await this.recordMigrationExecution(migration);
                } catch (recordError) {
                    if (!recordError.message?.includes("duplicate key")) {
                        throw recordError;
                    }
                }
                return;
            }

            this.logger.error(
                `[${this.extensionIdentifier}] Migration failed: ${migration.name} - ${error.message}`,
            );
            TerminalLogger.error(
                "Extension Migration",
                `[${this.extensionIdentifier}] Failed: ${migration.name} - ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Run migrations for version range
     */
    async runMigrations(fromVersion: string | null, toVersion: string): Promise<void> {
        try {
            await this.ensureMigrationHistoryTable();

            const migrations = await this.getMigrationsToRun(fromVersion, toVersion);

            if (migrations.length === 0) {
                this.logger.log(`[${this.extensionIdentifier}] No migrations to run`);
                return;
            }

            this.logger.log(
                `[${this.extensionIdentifier}] Found ${migrations.length} migration(s) to run from ${fromVersion || "initial"} to ${toVersion}`,
            );
            TerminalLogger.log(
                "Extension Migration",
                `[${this.extensionIdentifier}] Running ${migrations.length} migration(s) from ${fromVersion || "initial"} to ${toVersion}`,
            );

            for (const migration of migrations) {
                await this.executeMigration(migration);
            }

            this.logger.log(`[${this.extensionIdentifier}] All migrations completed successfully`);
            TerminalLogger.success(
                "Extension Migration",
                `[${this.extensionIdentifier}] All migrations completed successfully`,
            );
        } catch (error) {
            this.logger.error(
                `[${this.extensionIdentifier}] Migration process failed: ${error.message}`,
            );
            TerminalLogger.error(
                "Extension Migration",
                `[${this.extensionIdentifier}] Process failed: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Run cross-version migrations
     * @deprecated Use runVersionMigrations instead for better version tracking
     */
    async runCrossVersionMigrations(versions: string[]): Promise<void> {
        this.logger.log(
            `[${this.extensionIdentifier}] Cross-version upgrade: ${versions.join(" -> ")}`,
        );
        TerminalLogger.log(
            "Extension Migration",
            `[${this.extensionIdentifier}] Cross-version upgrade: ${versions.join(" -> ")}`,
        );

        let previousVersion: string | null = null;
        for (const targetVersion of versions) {
            await this.runMigrations(previousVersion, targetVersion);
            previousVersion = targetVersion;
        }
    }

    /**
     * Run migrations for a specific version range
     *
     * @param fromVersion The version to upgrade from (null for initial installation)
     * @param toVersion The target version to upgrade to
     */
    async runVersionMigrations(fromVersion: string | null, toVersion: string): Promise<void> {
        this.logger.log(
            `[${this.extensionIdentifier}] Running migrations: ${fromVersion || "initial"} -> ${toVersion}`,
        );
        TerminalLogger.log(
            "Extension Migration",
            `[${this.extensionIdentifier}] Running migrations: ${fromVersion || "initial"} -> ${toVersion}`,
        );

        await this.runMigrations(fromVersion, toVersion);
    }
}
