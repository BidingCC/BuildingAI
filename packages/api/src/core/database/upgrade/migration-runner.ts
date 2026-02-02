import { DataSource, QueryRunner } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";
import * as semver from "semver";

/**
 * Migration file interface
 */
export interface MigrationFile {
    /** Migration file name */
    name: string;
    /** Migration file path */
    path: string;
    /** Migration version */
    version: string;
    /** Migration timestamp */
    timestamp: number;
}

interface MigrationConstructor {
    new (...args: any[]): {
        up: (queryRunner: QueryRunner) => Promise<void>;
        down: (queryRunner: QueryRunner) => Promise<void>;
    };
}

/**
 * Migration runner
 *
 * Responsible for executing database migration files
 * Supports cross-version upgrades
 */
export class MigrationRunner {
    private readonly logger = new Logger(MigrationRunner.name);
    private readonly migrationsDir: string;
    private readonly versionsDir: string;

    constructor(private readonly dataSource: DataSource) {
        // Get migrations directory from @buildingai/db package
        const dbPackagePath = require.resolve("@buildingai/db");
        const dbDistPath = path.dirname(dbPackagePath);
        this.migrationsDir = path.join(dbDistPath, "migrations");
        this.versionsDir = path.join(process.cwd(), "data", "versions");
    }

    /**
     * Ensure migration history table exists
     */
    private async ensureMigrationHistoryTable(): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        try {
            await queryRunner.connect();
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS migrations_history (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    version VARCHAR(50) NOT NULL,
                    timestamp BIGINT NOT NULL,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            `SELECT COUNT(*) as count FROM migrations_history WHERE name = $1`,
            [migrationName],
        );
        return parseInt(result[0].count, 10) > 0;
    }

    /**
     * Record migration execution
     */
    private async recordMigrationExecution(migration: MigrationFile): Promise<void> {
        await this.dataSource.query(
            `INSERT INTO migrations_history (name, version, timestamp) VALUES ($1, $2, $3)`,
            [migration.name, migration.version, migration.timestamp],
        );
    }

    /**
     * Get all migration files
     */
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        try {
            // Ensure migrations directory exists
            if (!(await fse.pathExists(this.migrationsDir))) {
                this.logger.log(`Migrations directory not found: ${this.migrationsDir}`);
                return [];
            }

            const files = await fse.readdir(this.migrationsDir);

            // Filter and parse migration files
            // Expected format: {timestamp}-{version}-{description}.js
            // Example: 1762769127629-25.0.1-add-extension-identifier.js
            const migrationFiles: MigrationFile[] = [];

            for (const file of files) {
                // Skip non-JS files and hidden files
                if (!file.match(/\.js$/) || file.startsWith(".")) {
                    continue;
                }

                // File format: timestamp-version-description.js
                // Example: 1762769127629-25.0.1-add-extension-identifier.js
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

            // Sort by timestamp
            return migrationFiles.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            this.logger.error(`Failed to get migration files: ${error.message}`);
            return [];
        }
    }

    /**
     * Get existing versions from data/versions directory
     */
    private async getExistingVersions(): Promise<Set<string>> {
        try {
            await fse.ensureDir(this.versionsDir);
            const versionFiles = await fse.readdir(this.versionsDir);

            const existingVersions = new Set<string>();
            versionFiles.forEach((file) => {
                if (semver.valid(file)) {
                    existingVersions.add(file);
                }
            });

            return existingVersions;
        } catch (error) {
            this.logger.error(`Failed to get existing versions: ${error.message}`);
            return new Set();
        }
    }

    /**
     * Get migrations that need to be executed
     *
     * @param fromVersion Starting version (exclusive)
     * @param toVersion Target version (inclusive)
     */
    private async getMigrationsToRun(
        fromVersion: string | null,
        toVersion: string,
    ): Promise<MigrationFile[]> {
        const allMigrations = await this.getMigrationFiles();

        if (allMigrations.length === 0) {
            return [];
        }

        // Get existing versions to exclude
        const existingVersions = await this.getExistingVersions();

        // If no starting version, run all migrations up to target version, excluding existing versions
        if (!fromVersion) {
            return allMigrations.filter(
                (m) => semver.lte(m.version, toVersion) && !existingVersions.has(m.version),
            );
        }

        // Filter migrations between versions, excluding existing versions
        return allMigrations.filter(
            (m) =>
                semver.gt(m.version, fromVersion) &&
                semver.lte(m.version, toVersion) &&
                !existingVersions.has(m.version), // 排除已存在的版本
        );
    }

    /**
     * Execute a single migration file
     * Supports both function-based and TypeORM class-based migrations
     */
    private async executeMigration(migration: MigrationFile): Promise<void> {
        try {
            // Check if migration has already been executed
            const isExecuted = await this.isMigrationExecuted(migration.name);
            if (isExecuted) {
                this.logger.log(`Migration already executed, skipping: ${migration.name}`);
                TerminalLogger.log("Migration", `Skipped (already executed): ${migration.name}`);
                return;
            }

            this.logger.log(`Executing migration: ${migration.name}`);
            TerminalLogger.log("Migration", `Executing: ${migration.name}`);

            // Dynamic import migration module
            const migrationModule = await import(migration.path);

            // Check if it's a TypeORM class-based migration
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

            // Record migration execution
            await this.recordMigrationExecution(migration);

            this.logger.log(`Migration completed: ${migration.name}`);
            TerminalLogger.success("Migration", `Completed: ${migration.name}`);
        } catch (error) {
            // Check if error is idempotent (already exists errors)
            const errorMessage = error.message || "";
            const isIdempotentError =
                errorMessage.includes("already exists") ||
                errorMessage.includes("duplicate key") ||
                errorMessage.includes("already defined") ||
                (error.code && ["42701", "42P07", "23505"].includes(error.code)); // PostgreSQL error codes

            if (isIdempotentError) {
                // Idempotent error - migration was partially executed before, record and skip
                this.logger.warn(
                    `Migration ${migration.name} encountered idempotent error (likely already applied), marking as completed`,
                );
                TerminalLogger.log("Migration", `Skipped (already applied): ${migration.name}`);

                // Record migration execution to prevent future attempts
                try {
                    await this.recordMigrationExecution(migration);
                } catch (recordError) {
                    // Ignore if already recorded
                    if (!recordError.message?.includes("duplicate key")) {
                        throw recordError;
                    }
                }
                return;
            }

            // Non-idempotent error - throw
            this.logger.error(`Migration failed: ${migration.name} - ${error.message}`);
            TerminalLogger.error("Migration", `Failed: ${migration.name} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Run migrations for version upgrade
     *
     * @param fromVersion Starting version (null for initial installation)
     * @param toVersion Target version
     */
    async runMigrations(fromVersion: string | null, toVersion: string): Promise<void> {
        try {
            // Ensure migration history table exists
            await this.ensureMigrationHistoryTable();

            const migrations = await this.getMigrationsToRun(fromVersion, toVersion);

            if (migrations.length === 0) {
                this.logger.log("No migrations to run");
                return;
            }

            this.logger.log(
                `Found ${migrations.length} migration(s) to run from ${fromVersion || "initial"} to ${toVersion}`,
            );
            TerminalLogger.log(
                "Migration",
                `Running ${migrations.length} migration(s) from ${fromVersion || "initial"} to ${toVersion}`,
            );

            // Execute migrations in order
            for (const migration of migrations) {
                await this.executeMigration(migration);
            }

            this.logger.log("All migrations completed successfully");
            TerminalLogger.success("Migration", "All migrations completed successfully");
        } catch (error) {
            this.logger.error(`Migration process failed: ${error.message}`);
            TerminalLogger.error("Migration", `Process failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Run migrations for multiple version upgrades (cross-version)
     *
     * @param versions Array of versions to upgrade through
     */
    async runCrossVersionMigrations(versions: string[]): Promise<void> {
        if (versions.length === 0) {
            return;
        }

        this.logger.log(`Starting cross-version migration: ${versions.join(" -> ")}`);
        TerminalLogger.log("Migration", `Cross-version upgrade: ${versions.join(" -> ")}`);

        let previousVersion: string | null = null;

        for (const version of versions) {
            await this.runMigrations(previousVersion, version);
            previousVersion = version;
        }

        this.logger.log("Cross-version migration completed");
        TerminalLogger.success("Migration", "Cross-version migration completed");
    }
}
