import { getExtensionSchemaName } from "@buildingai/core/modules";
import { ExtensionInfo } from "@buildingai/core/modules";
import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { Injectable } from "@nestjs/common";

/**
 * Extension Schema Service
 *
 * Manages database schemas for extensions
 * Each extension gets its own isolated database schema
 */
@Injectable()
export class ExtensionSchemaService {
    constructor(private readonly dataSource: DataSource) {}

    /**
     * Create database schemas for all extensions
     *
     * @param extensionList List of extension information
     */
    async createExtensionSchemas(extensionList: ExtensionInfo[]): Promise<void> {
        if (!extensionList || extensionList.length === 0) {
            TerminalLogger.info(
                "Extension Schema",
                "No extensions found, skipping schema creation",
            );
            return;
        }

        TerminalLogger.log(
            "Extension Schema",
            `Creating schemas for ${extensionList.length} extension(s)...`,
        );

        for (const extension of extensionList) {
            await this.createSchemaForExtension(extension);
        }

        TerminalLogger.success("Extension Schema", "All extension schemas created successfully");
    }

    /**
     * Create database schema for a single extension
     *
     * @param extension Extension information
     */
    private async createSchemaForExtension(extension: ExtensionInfo): Promise<void> {
        const schemaName = getExtensionSchemaName(extension.identifier);

        try {
            // Check if schema already exists
            const schemaExists = await this.checkSchemaExists(schemaName);

            if (schemaExists) {
                TerminalLogger.log(
                    "Extension Schema",
                    `Schema "${schemaName}" already exists, skipping...`,
                );
                return;
            }

            // Create schema
            await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            TerminalLogger.success("Extension Schema", `Created schema: ${schemaName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error(
                "Extension Schema",
                `Failed to create schema "${schemaName}": ${errorMessage}`,
            );
            throw error;
        }
    }

    /**
     * Check if a schema exists in the database
     *
     * @param schemaName Schema name to check
     * @returns True if schema exists, false otherwise
     */
    private async checkSchemaExists(schemaName: string): Promise<boolean> {
        try {
            const result = await this.dataSource.query(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                [schemaName],
            );
            return result.length > 0;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error(
                "Extension Schema",
                `Failed to check schema existence: ${errorMessage}`,
            );
            return false;
        }
    }

    /**
     * Drop database schema for an extension
     *
     * @param identifier Extension identifier
     * @param cascade Whether to cascade drop (drop all objects in schema)
     */
    async dropExtensionSchema(identifier: string, cascade: boolean = false): Promise<void> {
        const schemaName = getExtensionSchemaName(identifier);

        try {
            const cascadeOption = cascade ? "CASCADE" : "RESTRICT";
            await this.dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" ${cascadeOption}`);
            TerminalLogger.success("Extension Schema", `Dropped schema: ${schemaName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error(
                "Extension Schema",
                `Failed to drop schema "${schemaName}": ${errorMessage}`,
            );
            throw error;
        }
    }

    /**
     * Get schema name for an extension
     *
     * @param identifier Extension identifier
     * @returns Schema name
     */
    getSchemaName(identifier: string): string {
        return getExtensionSchemaName(identifier);
    }
}
