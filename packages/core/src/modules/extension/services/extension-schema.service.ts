import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Extension } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

/**
 * Extension Schema Service
 *
 * Handles database schema operations for extensions
 */
@Injectable()
export class ExtensionSchemaService {
    /**
     * Constructor
     *
     * @param extensionRepository Extension repository for database operations
     */
    constructor(
        @InjectRepository(Extension)
        private readonly extensionRepository: Repository<Extension>,
    ) {}

    /**
     * Check if database schema exists
     *
     * @param schemaName Schema name
     * @returns True if schema exists, false otherwise
     */
    async checkSchemaExists(schemaName: string): Promise<boolean> {
        try {
            const result = await this.extensionRepository.query(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                [schemaName],
            );
            return result.length > 0;
        } catch (error) {
            console.error(`Error checking schema existence: ${error}`);
            return false;
        }
    }

    /**
     * Drop database schema
     *
     * @param schemaName Schema name
     */
    async dropSchema(schemaName: string): Promise<void> {
        try {
            // Drop schema with CASCADE to remove all objects in it
            await this.extensionRepository.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to drop schema ${schemaName}: ${errorMessage}`);
        }
    }

    /**
     * Create database schema
     *
     * @param schemaName Schema name
     */
    async createSchema(schemaName: string): Promise<void> {
        try {
            await this.extensionRepository.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create schema ${schemaName}: ${errorMessage}`);
        }
    }
}
