import { createDataSourceConfig } from "@buildingai/config/db.config";
import { table3BorderStyle } from "@buildingai/config/table.config";
import type { ExtensionInfo } from "@buildingai/core/modules";
import { getCachedExtensionList } from "@buildingai/core/modules";
import { NormalizeFileUrlSubscriber } from "@buildingai/db";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    AiModel,
    AiProvider,
    Dict,
    Menu,
    Payconfig,
    SecretTemplate,
    User,
} from "@buildingai/db/entities";
import { DataSource, EntityMetadata, Logger as TypeOrmLogger } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { DecorateModule } from "@modules/decorate/decorate.module";
import { MenuModule } from "@modules/menu/menu.module";
import { PermissionModule } from "@modules/permission/permission.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import chalk from "chalk";
import Table from "cli-table3";
import { dirname, join } from "path";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { ExtensionUpgradeOrchestratorService } from "./extension-upgrade/extension-upgrade-orchestrator.service";
import { DatabaseInitService } from "./services/database-init.service";
import { ExtensionSchemaService } from "./services/extension-schema.service";
import { VersionManagerService } from "./services/version-manager.service";
import { UpgradeService } from "./upgrade/upgrade.service";

/**
 * Query pattern matchers for database operations
 */
const QUERY_PATTERNS = {
    createTable: /CREATE TABLE "?([^\s"]+)"?/,
    addConstraint: /ADD CONSTRAINT "?([^\s"]+)"? FOREIGN KEY.*REFERENCES "?([^\s"(]+)"?/s,
    createIndex: /CREATE INDEX "?([^\s"]+)"? ON "?([^\s"]+)"?/i,
} as const;

/**
 * Custom TypeORM logger
 *
 * Logs database operations, especially table synchronization information
 */
class CustomLogger implements TypeOrmLogger {
    log(level: "log" | "info" | "warn", message: any): void {
        if (typeof message === "string" && message.includes("synchronize schema")) {
            TerminalLogger.info("Database", "Starting database schema synchronization...");
        }
    }

    logQuery(query: string): void {
        void (
            this.handleCreateTable(query) ||
            this.handleAddConstraint(query) ||
            this.handleCreateIndex(query)
        );
    }

    private handleCreateTable(query: string): boolean {
        if (!query.includes("CREATE TABLE")) return false;

        const match = query.match(QUERY_PATTERNS.createTable);
        if (match?.[1]) {
            TerminalLogger.log("Table", `${match[1]} created or updated`);
        }
        return true;
    }

    private handleAddConstraint(query: string): boolean {
        if (!query.includes("ADD CONSTRAINT") || !query.includes("FOREIGN KEY")) return false;

        const match = query.match(QUERY_PATTERNS.addConstraint);
        if (match?.[1] && match?.[2]) {
            TerminalLogger.log("Foreign Key", `${match[1]} added, references table ${match[2]}`);
        }
        return true;
    }

    private handleCreateIndex(query: string): boolean {
        if (!query.includes("CREATE INDEX")) return false;

        const match = query.match(QUERY_PATTERNS.createIndex);
        if (match?.[1] && match?.[2]) {
            TerminalLogger.log("Index", `${match[1]} added to table ${match[2]}`);
        }
        return true;
    }

    logQueryError(error: string | Error, query: string): void {
        TerminalLogger.error("Query Error", error.toString());
        TerminalLogger.error("Failed Query", query);
    }

    logQuerySlow(time: number, query: string): void {
        TerminalLogger.warn("Slow Query", `(${time}ms): ${query}`);
    }

    logMigration(message: string): void {
        TerminalLogger.info("Migration", message);
    }

    logSchemaBuild(message: string): void {
        TerminalLogger.info("Schema Build", message);
    }

    logClear(): void {
        // No operation needed
    }
}

/**
 * Print entity information table from data source
 *
 * @param dataSource TypeORM data source
 */
function printEntityTable(dataSource: DataSource): void {
    const entities = dataSource.entityMetadatas;

    if (entities.length === 0) {
        TerminalLogger.warn("Entities", "No entities registered");
        return;
    }

    const sortedEntities = sortEntitiesByModule(entities);
    const table = createEntityTable(sortedEntities);

    TerminalLogger.log("", `DataSource(${entities.length}):`);
    console.log(table.toString());
}

/**
 * Sort entities by module type
 */
function sortEntitiesByModule(entities: readonly EntityMetadata[]): EntityMetadata[] {
    return [...entities].sort((a, b) => {
        const moduleA = getEntityModule(a);
        const moduleB = getEntityModule(b);
        return moduleA.localeCompare(moduleB);
    });
}

/**
 * Create CLI table with entity information
 */
function createEntityTable(entities: EntityMetadata[]): Table.Table {
    const table = new Table({
        chars: table3BorderStyle,
        head: ["Table", "Comment", "Schema", "Module", "Columns", "Relations", "Indexes"],
        style: {
            head: ["cyan"],
            border: ["gray"],
        },
    });

    entities.forEach((entity) => {
        table.push([
            chalk.magenta(entity.tableName),
            entity.comment || "-",
            entity.schema ?? "public",
            getEntityModule(entity),
            entity.columns.length.toString(),
            entity.relations.length.toString(),
            entity.indices.length.toString(),
        ]);
    });

    return table;
}

/**
 * Get the module name of an entity
 * @param entity Entity metadata
 * @returns Module name: "SYSTEM" for public schema, "EXTENSION" for extension schemas
 */
function getEntityModule(entity: EntityMetadata): string {
    // System tables are in public schema, extension tables are in their own schemas
    return entity.schema === "public" || !entity.schema ? "SYSTEM" : "EXTENSION";
}

/**
 * Get entity file paths for TypeORM
 * @param enabledExtensions List of enabled extensions
 */
function getEntityPaths(enabledExtensions: ExtensionInfo[]): string[] {
    const dbPackagePath = require.resolve("@buildingai/db");
    const dbDistPath = dirname(dbPackagePath);
    const dbEntitiesPattern = join(dbDistPath, "entities/**/*.entity.js");

    // Generate entity paths for each enabled extension
    const extensionEntityPaths = enabledExtensions.map((extension) =>
        join(extension.path, "build", "db", "entities", "**", "*.entity.js"),
    );

    return [dbEntitiesPattern, ...extensionEntityPaths];
}

/**
 * Initialize TypeORM data source
 */
async function initializeDataSource(options: PostgresConnectionOptions): Promise<DataSource> {
    return new DataSource({
        ...options,
        logging: false,
    }).initialize();
}

/**
 * Log database connection information
 */
async function logDatabaseInfo(
    dataSource: DataSource,
    options: PostgresConnectionOptions,
): Promise<void> {
    try {
        const dbInfoResult = await dataSource.query("SELECT VERSION() as version");
        const dbVersion = dbInfoResult[0]?.version;

        TerminalLogger.info(
            "PgSQL Version",
            dbVersion
                ? dbVersion.match(/PostgreSQL\s+(\d+(?:\.\d+)?)/)?.[1] || "Unknown"
                : "Unknown version",
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        TerminalLogger.error("Database Error", `Get version failed: ${errorMessage}`);
    }

    TerminalLogger.success("PgSQL Status", "Connected");

    TerminalLogger.log("Db Sync", options.synchronize ? "ON" : "OFF", {
        color: "magenta",
    });

    if (process.env.LOG_DATABASE_SCHEMA === "true") {
        printEntityTable(dataSource);
    }
}

/**
 * Database module
 *
 * Responsible for configuring and managing database connections
 * Uses TypeORM as the ORM framework
 * Reads database configuration from environment variables
 */
@Module({
    imports: [
        // DatabaseSyncModule,
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [],
            useFactory: async () => {
                const entityPaths = getEntityPaths(getCachedExtensionList());
                const databaseOptions = createDataSourceConfig();

                return {
                    ...databaseOptions,
                    logger: new CustomLogger(),
                    entities: entityPaths,
                    subscribers: [NormalizeFileUrlSubscriber],
                };
            },
            dataSourceFactory: async (options: PostgresConnectionOptions) => {
                const dataSource = await initializeDataSource(options);
                await logDatabaseInfo(dataSource, options);
                return dataSource;
            },
        }),
        MenuModule,
        PermissionModule,
        DecorateModule,
        TypeOrmModule.forFeature([
            User,
            Menu,
            Payconfig,
            Dict,
            AiProvider,
            AiModel,
            SecretTemplate,
        ]),
    ],
    controllers: [],
    providers: [
        DatabaseInitService,
        ExtensionSchemaService,
        UpgradeService,
        VersionManagerService,
        ExtensionUpgradeOrchestratorService,
    ],
    exports: [
        DatabaseInitService,
        ExtensionSchemaService,
        VersionManagerService,
        ExtensionUpgradeOrchestratorService,
    ],
})
export class DatabaseModule {}
