#!/usr/bin/env node

/**
 * Generate migration for extension by comparing entity definitions with database schema
 *
 * This script uses TypeORM to automatically detect schema changes for extensions
 *
 * Usage:
 *   pnpm migration:generate:extension <identifier> <version> <description>
 *
 * Example:
 *   pnpm migration:generate:extension buildingai-simple-blog 0.0.3 add-tags
 *
 * Prerequisites:
 *   1. Database must be running
 *   2. Entity changes must be defined in extension's src/api/db/entities
 *   3. Database connection configured in .env
 */

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Filter out SQL statements that don't belong to the extension schema
 * @param {string} content - Migration file content
 * @param {string} schemaName - Extension schema name
 * @returns {string} Filtered content
 */
function filterNonExtensionSQL(content, schemaName) {
    // Split into up and down methods
    const upMatch = content.match(
        /public async up\(queryRunner: QueryRunner\): Promise<void> \{([\s\S]*?)\n {4}\}/,
    );
    const downMatch = content.match(
        /public async down\(queryRunner: QueryRunner\): Promise<void> \{([\s\S]*?)\n {4}\}/,
    );

    if (!upMatch || !downMatch) {
        return content;
    }

    const upBody = upMatch[1];
    const downBody = downMatch[1];

    // Filter SQL statements - keep only those with extension schema
    const schemaPattern = `"${schemaName}"`;

    const filterStatements = (body) => {
        const lines = body.split("\n");
        const filtered = lines.filter((line) => {
            // Keep empty lines and comments
            if (!line.trim() || line.trim().startsWith("//")) {
                return true;
            }
            // Keep lines that contain the extension schema
            if (line.includes(schemaPattern)) {
                return true;
            }
            // Remove lines that are SQL statements but don't have extension schema
            if (line.includes("await queryRunner.query(")) {
                return false;
            }
            return true;
        });
        return filtered.join("\n");
    };

    const filteredUp = filterStatements(upBody);
    const filteredDown = filterStatements(downBody);

    // Replace in content
    content = content.replace(
        /public async up\(queryRunner: QueryRunner\): Promise<void> \{[\s\S]*?\n {4}\}/,
        `public async up(queryRunner: QueryRunner): Promise<void> {${filteredUp}\n    }`,
    );
    content = content.replace(
        /public async down\(queryRunner: QueryRunner\): Promise<void> \{[\s\S]*?\n {4}\}/,
        `public async down(queryRunner: QueryRunner): Promise<void> {${filteredDown}\n    }`,
    );

    return content;
}

// Get arguments
const args = process.argv.slice(2);
const identifier = args[0];
const version = args[1];
const description = args[2];

// Validate arguments
if (!identifier || !version || !description) {
    console.error("❌ Error: Missing required arguments");
    console.log("");
    console.log("Usage:");
    console.log("  pnpm migration:generate:extension <identifier> <version> <description>");
    console.log("");
    console.log("Example:");
    console.log("  pnpm migration:generate:extension buildingai-simple-blog 0.0.3 add-tags");
    console.log("");
    console.log("This will:");
    console.log("  1. Compare extension entity definitions with current database schema");
    console.log("  2. Generate migration SQL automatically");
    console.log("  3. Create a timestamped migration file in extension directory");
    process.exit(1);
}

// Validate version format (semver)
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(version)) {
    console.error("❌ Error: Invalid version format. Must be semver (e.g., 0.0.3)");
    process.exit(1);
}

// Validate description (kebab-case)
const descriptionRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
if (!descriptionRegex.test(description)) {
    console.error("❌ Error: Invalid description format. Must be kebab-case (e.g., add-new-field)");
    process.exit(1);
}

console.log(`🔍 Analyzing database schema changes for extension: ${identifier}`);
console.log("");

// Generate timestamp
const timestamp = Date.now();

// Extension paths
// From packages/@buildingai/db/scripts -> project root (4 levels up)
const projectRoot = path.join(__dirname, "..", "..", "..", "..");
const extensionDir = path.join(projectRoot, "extensions", identifier);
const extensionBuildEntitiesDir = path.join(extensionDir, "build", "db", "entities");
const extensionMigrationsDir = path.join(extensionDir, "src", "api", "db", "migrations");

// Check if extension exists
if (!(await fs.pathExists(extensionDir))) {
    console.error(`❌ Error: Extension not found: ${identifier}`);
    console.error(`   Path: ${extensionDir}`);
    process.exit(1);
}

// Check if build entities directory exists
if (!(await fs.pathExists(extensionBuildEntitiesDir))) {
    console.error(`❌ Error: Extension build entities directory not found`);
    console.error(`   Hint: Please run "pnpm --filter ${identifier} build:api" first`);
    console.error(`   Path: ${extensionBuildEntitiesDir}`);
    process.exit(1);
}

// Ensure migrations directory exists
await fs.ensureDir(extensionMigrationsDir);

try {
    // Get all compiled entity files from extension's build directory
    const entityFiles = (await fs.readdir(extensionBuildEntitiesDir))
        .filter((f) => f.endsWith(".entity.js"))
        .map((f) => path.join(extensionBuildEntitiesDir, f));

    if (entityFiles.length === 0) {
        console.error("❌ Error: No entity files found in extension build directory");
        console.error(`   Path: ${extensionBuildEntitiesDir}`);
        console.error(`   Hint: Please run "pnpm --filter ${identifier} build:api" first`);
        process.exit(1);
    }

    const schemaName = identifier.replace(/[^a-zA-Z0-9_]/g, "_");
    const dbPackageDir = path.join(__dirname, "..");
    const dataSourcePath = path.join(
        dbPackageDir,
        "src",
        "datasources",
        "extension-data-source.ts",
    );

    console.log(`📦 Extension: ${identifier}`);
    console.log(`📋 Schema: ${schemaName}`);
    console.log(`📂 Entities: ${extensionBuildEntitiesDir}`);
    console.log(`📁 Migrations: ${extensionMigrationsDir}`);
    console.log("");
    console.log("Running TypeORM schema comparison...");

    // Run TypeORM migration:generate with environment variable
    const tempMigrationName = `temp_${description}`;
    const command = `npx cross-env EXTENSION_IDENTIFIER=${identifier} typeorm-ts-node-commonjs migration:generate ${extensionMigrationsDir}/${tempMigrationName} -d ${dataSourcePath}`;

    execSync(command, {
        cwd: dbPackageDir,
        stdio: "inherit",
    });

    // Find the generated file (TypeORM adds timestamp prefix)
    const files = await fs.readdir(extensionMigrationsDir);
    const generatedFile = files.find(
        (f) => f.includes(tempMigrationName) && f.endsWith(".ts") && f !== ".gitkeep",
    );

    if (!generatedFile) {
        throw new Error("Generated migration file not found");
    }

    const generatedPath = path.join(extensionMigrationsDir, generatedFile);
    const finalFilename = `${timestamp}-${version}-${description}.ts`;
    const finalPath = path.join(extensionMigrationsDir, finalFilename);

    // Read the generated file
    let content = await fs.readFile(generatedPath, "utf-8");

    // Filter out SQL statements that don't belong to extension schema
    content = filterNonExtensionSQL(content, schemaName);

    // Extract the auto-generated class name (format: TempDescriptionTimestamp)
    const classNameMatch = content.match(/export class (\w+) implements MigrationInterface/);
    if (!classNameMatch) {
        throw new Error("Could not find class name in generated migration");
    }
    const oldClassName = classNameMatch[1];
    const newClassName = `Migration${timestamp}`;

    content = content.replace(new RegExp(oldClassName, "g"), newClassName);

    // Add version comment
    const versionComment = `/**
 * Extension Migration: ${description}
 * Extension: ${identifier}
 * Version: ${version}
 * Generated: ${new Date().toISOString()}
 * 
 * This migration was automatically generated by TypeORM
 * based on entity definition changes.
 */

`;
    content = versionComment + content;

    // Write to final location
    await fs.writeFile(finalPath, content);

    // Remove temporary file if different from final file
    if (generatedPath !== finalPath) {
        await fs.remove(generatedPath);
    }

    console.log("");
    console.log("✅ Migration file generated successfully!");
    console.log("");
    console.log("📄 File:", finalFilename);
    console.log("📁 Path:", finalPath);
    console.log("🔢 Version:", version);
    console.log("📝 Description:", description);
    console.log("🔌 Extension:", identifier);
    console.log("");
    console.log("Next steps:");
    console.log("1. Review the generated SQL in the migration file");
    console.log("2. Make any necessary adjustments");
    console.log(`3. Build the extension: pnpm --filter ${identifier} build:api`);
    console.log("4. Restart the application to run the migration");
} catch (error) {
    console.error("");
    console.error("❌ Migration generation failed");
    console.error("");
    console.error("Common issues:");
    console.error("  1. Database is not running");
    console.error("  2. Database connection failed (check .env)");
    console.error("  3. No schema changes detected");
    console.error("  4. Extension schema does not exist in database");
    console.error("");
    console.error("Error details:", error.message);
    console.error(error);
    process.exit(1);
}
