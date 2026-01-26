import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import readline from "readline";
import semver from "semver";
import { fileURLToPath } from "url";

import { AdvancedLogger, Logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../../../..");

const TEMPLATES_DIR = path.join(rootDir, "templates");
const EXTENSIONS_DIR = path.join(rootDir, "extensions");
const EXTENSIONS_CONFIG_PATH = path.join(EXTENSIONS_DIR, "extensions.json");
const TEMPLATE_FILE = "buildingai-extension-starter";

const RELEASES_DIR = path.join(rootDir, "releases");

const RELEASE_COPY_ALLOWLIST = [
    ".output",
    "build",
    "src",
    "storage/static",
    "storage/.gitkeep",
    ".gitignore",
    "eslint.config.mjs",
    "LICENSE",
    "manifest.json",
    "nuxt.config.ts",
    "README.md",
    "SEEDS.md",
    "tsconfig.json",
    "tsconfig.web.json",
    "tsconfig.api.json",
    "tsup.config.ts",
    "package.json",
];

/**
 * Create readline interface for interactive input
 * @returns {readline.Interface}
 */
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

/**
 * Prompt user for input
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>}
 */
function prompt(rl, question, defaultValue = "") {
    const defaultHint = defaultValue ? ` (${defaultValue})` : "";
    return new Promise((resolve) => {
        rl.question(`${question}${defaultHint}: `, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

/**
 * Validate extension identifier format
 * @param {string} identifier - Extension identifier
 * @returns {{ valid: boolean, message?: string }}
 */
function validateIdentifier(identifier) {
    if (!identifier) {
        return { valid: false, message: "Identifier is required" };
    }

    // Must start with buildingai-
    if (!identifier.startsWith("buildingai-")) {
        return {
            valid: false,
            message: "Identifier must start with 'buildingai-'",
        };
    }

    // Only allow lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/.test(identifier)) {
        return {
            valid: false,
            message: "Identifier can only contain lowercase letters, numbers, and hyphens",
        };
    }

    // Check minimum length
    if (identifier.length < 12) {
        return {
            valid: false,
            message: "Identifier must be at least 12 characters (including 'buildingai-')",
        };
    }

    return { valid: true };
}

/**
 * Check if extension already exists
 * @param {string} identifier - Extension identifier
 * @returns {Promise<boolean>}
 */
async function extensionExists(identifier) {
    const extensionDir = path.join(EXTENSIONS_DIR, identifier);
    return fs.pathExists(extensionDir);
}

/**
 * Check if extension exists in config
 * @param {string} identifier - Extension identifier
 * @returns {Promise<boolean>}
 */
async function extensionExistsInConfig(identifier) {
    if (!(await fs.pathExists(EXTENSIONS_CONFIG_PATH))) {
        return false;
    }
    const config = await fs.readJson(EXTENSIONS_CONFIG_PATH);
    return !!(config.applications?.[identifier] || config.functionals?.[identifier]);
}

/**
 * Extract template to extensions directory
 * @param {string} identifier - Extension identifier
 * @returns {Promise<string>} Extension directory path
 */
async function extractTemplate(identifier) {
    const templatePath = path.join(TEMPLATES_DIR, TEMPLATE_FILE);

    if (!(await fs.pathExists(templatePath))) {
        throw new Error(`Template directory not found: ${templatePath}`);
    }

    const templateStat = await fs.stat(templatePath);
    if (!templateStat.isDirectory()) {
        throw new Error(`Template path is not a directory: ${templatePath}`);
    }

    const targetDir = path.join(EXTENSIONS_DIR, identifier);

    if (await fs.pathExists(targetDir)) {
        throw new Error(`Extension directory already exists: ${targetDir}`);
    }

    // Find the root directory (may be nested)
    const sourceDir = await resolveTemplateRoot(templatePath);

    await fs.ensureDir(targetDir);
    await fs.copy(sourceDir, targetDir);

    return targetDir;
}

async function readExtensionJsonFiles(extensionDir) {
    const packageJsonPath = path.join(extensionDir, "package.json");
    const manifestPath = path.join(extensionDir, "manifest.json");

    if (!(await fs.pathExists(packageJsonPath))) {
        throw new Error(`package.json not found: ${packageJsonPath}`);
    }
    if (!(await fs.pathExists(manifestPath))) {
        throw new Error(`manifest.json not found: ${manifestPath}`);
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const manifest = await fs.readJson(manifestPath);

    return {
        packageJsonPath,
        manifestPath,
        packageJson,
        manifest,
    };
}

async function ensureAndCopyAllowlistedFiles(sourceDir, targetDir) {
    await fs.ensureDir(targetDir);

    for (const relativePath of RELEASE_COPY_ALLOWLIST) {
        const srcPath = path.join(sourceDir, relativePath);
        const destPath = path.join(targetDir, relativePath);

        const exists = await fs.pathExists(srcPath);
        if (!exists) {
            Logger.warning("Copy", `Skipped missing path: ${relativePath}`);
            continue;
        }

        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(srcPath, destPath);
    }
}

export async function releaseExtension() {
    const rl = createReadlineInterface();

    let stagingDir = "";
    let tempBaseDir = "";

    async function removeTempDirIfEmpty() {
        if (!tempBaseDir) return;
        const exists = await fs.pathExists(tempBaseDir);
        if (!exists) return;
        const entries = await fs.readdir(tempBaseDir).catch(() => []);
        if (entries.length === 0) {
            await fs.remove(tempBaseDir).catch(() => {});
        }
    }

    console.log("\n");
    Logger.info("Extension", "Release a BuildingAI extension");
    console.log("━".repeat(60));

    try {
        let identifier = "";
        while (true) {
            const rawIdentifier = await prompt(
                rl,
                "Extension identifier (buildingai-<name> or <name>)",
            );
            identifier = rawIdentifier.startsWith("buildingai-")
                ? rawIdentifier
                : `buildingai-${rawIdentifier}`;

            const validation = validateIdentifier(identifier);
            if (!validation.valid) {
                Logger.error("Validation", validation.message);
                continue;
            }

            if (!(await extensionExists(identifier))) {
                Logger.error("Validation", `Extension directory not found: ${identifier}`);
                continue;
            }

            break;
        }

        const extensionDir = path.join(EXTENSIONS_DIR, identifier);
        const { packageJson, manifest } = await readExtensionJsonFiles(extensionDir);
        const currentVersion =
            typeof packageJson?.version === "string" && packageJson.version
                ? packageJson.version
                : typeof manifest?.version === "string" && manifest.version
                  ? manifest.version
                  : "0.0.1";

        const version = await prompt(rl, "Version", currentVersion);

        if (!semver.valid(version)) {
            throw new Error(`Invalid version: ${version}`);
        }

        let shouldRebuild = true;
        while (true) {
            const rebuildAnswer = await prompt(rl, "Rebuild before release? (Y/n)", "y");
            const normalizedAnswer = rebuildAnswer.trim().toLowerCase();
            if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
                shouldRebuild = true;
                break;
            }
            if (normalizedAnswer === "n" || normalizedAnswer === "no") {
                shouldRebuild = false;
                break;
            }
            Logger.error("Validation", "Please enter 'y' or 'n'");
        }

        rl.close();

        const packageVersion = packageJson?.version;
        const manifestVersion = manifest?.version;

        if (!semver.valid(packageVersion)) {
            throw new Error(`Invalid package.json version: ${packageVersion}`);
        }
        if (!semver.valid(manifestVersion)) {
            throw new Error(`Invalid manifest.json version: ${manifestVersion}`);
        }

        if (semver.lt(version, packageVersion) || semver.lt(version, manifestVersion)) {
            throw new Error(
                `Version ${version} is lower than current version (package.json=${packageVersion}, manifest.json=${manifestVersion})`,
            );
        }

        if (semver.gt(version, packageVersion) || semver.gt(version, manifestVersion)) {
            Logger.info("Version", `Updating versions to ${version}...`);

            const { packageJsonPath, manifestPath } = await readExtensionJsonFiles(extensionDir);
            const nextPackageJson = { ...packageJson, version };
            const nextManifest = { ...manifest, version };

            await fs.writeJson(packageJsonPath, nextPackageJson, { spaces: 4 });
            await fs.writeJson(manifestPath, nextManifest, { spaces: 4 });
            Logger.success("Version", "Updated package.json and manifest.json");
        } else {
            Logger.info("Version", "No version change needed");
        }

        if (shouldRebuild) {
            await buildExtension(extensionDir);
            Logger.success("Build", "Build completed");
        } else {
            Logger.info("Build", "Skipped rebuild");
        }

        const releaseName = `${identifier}-${version}`;
        tempBaseDir = path.join(RELEASES_DIR, ".tmp");
        stagingDir = path.join(tempBaseDir, releaseName);
        const zipPath = path.join(RELEASES_DIR, `${releaseName}.zip`);

        await fs.ensureDir(RELEASES_DIR);
        if (await fs.pathExists(zipPath)) {
            Logger.warning("Zip", `Release zip already exists, overwriting: ${zipPath}`);
            await fs.remove(zipPath);
        }

        await fs.ensureDir(tempBaseDir);
        if (await fs.pathExists(stagingDir)) {
            Logger.warning("Copy", `Removing existing temp directory: ${stagingDir}`);
            await fs.remove(stagingDir);
        }

        Logger.info("Copy", `Copying extension to: ${stagingDir}`);
        await ensureAndCopyAllowlistedFiles(extensionDir, stagingDir);
        Logger.success("Copy", "Copy completed");

        Logger.info("Zip", `Creating zip: ${zipPath}`);
        const zip = new AdmZip();
        zip.addLocalFolder(stagingDir, releaseName);
        zip.writeZip(zipPath);
        Logger.success("Zip", `Release created: ${zipPath}`);

        await fs.remove(stagingDir).catch(() => {});
        stagingDir = "";
        await removeTempDirIfEmpty();
    } catch (error) {
        rl.close();
        if (stagingDir) {
            await fs.remove(stagingDir).catch(() => {});
        }
        await removeTempDirIfEmpty();
        Logger.error("Extension", `Failed to release extension: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Resolve template root directory
 * @param {string} extractedDir - Extracted temporary directory
 * @returns {Promise<string>}
 */
async function resolveTemplateRoot(extractedDir) {
    const packageJsonPath = path.join(extractedDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
        return extractedDir;
    }

    const entries = await fs.readdir(extractedDir);
    for (const entry of entries) {
        const entryPath = path.join(extractedDir, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory()) {
            const subPackageJsonPath = path.join(entryPath, "package.json");
            if (await fs.pathExists(subPackageJsonPath)) {
                return entryPath;
            }
        }
    }

    throw new Error("Invalid template structure: package.json not found");
}

/**
 * Update extension manifest.json and package.json files
 * @param {string} extensionDir - Extension directory path
 * @param {Object} info - Extension info
 */
async function updateExtensionFiles(extensionDir, info) {
    // Update manifest.json
    const manifestPath = path.join(extensionDir, "manifest.json");
    if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        manifest.identifier = info.identifier;
        manifest.name = info.name;
        manifest.version = info.version;
        manifest.description = info.description;
        manifest.homepage = info.homepage || "";
        if (info.author) {
            manifest.author = {
                avatar: "",
                name: info.author,
                homepage: "",
            };
        }
        await fs.writeJson(manifestPath, manifest, { spaces: 4 });
    }

    // Update package.json
    const packageJsonPath = path.join(extensionDir, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = info.identifier;
        packageJson.version = info.version;
        packageJson.description = info.description;
        if (info.author) {
            packageJson.author = info.author;
        }
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 4 });
    }
}

/**
 * Add extension to extensions.json configuration
 * @param {Object} info - Extension info
 */
async function addExtensionToConfig(info) {
    let config = { applications: {}, functionals: {} };

    if (await fs.pathExists(EXTENSIONS_CONFIG_PATH)) {
        config = await fs.readJson(EXTENSIONS_CONFIG_PATH);
    }

    const extensionConfig = {
        manifest: {
            identifier: info.identifier,
            name: info.name,
            version: info.version,
            description: info.description,
            author: {
                avatar: "",
                name: info.author || "",
                homepage: "",
            },
        },
        isLocal: true,
        enabled: true,
        installedAt: new Date().toISOString(),
    };

    // Add to applications by default
    config.applications = config.applications || {};
    config.applications[info.identifier] = extensionConfig;

    await fs.writeJson(EXTENSIONS_CONFIG_PATH, config, { spaces: 4 });
}

/**
 * Insert extension record into database
 * @param {Object} info - Extension info
 */
async function insertExtensionToDatabase(info) {
    // Dynamically import dotenv to load environment variables
    const dotenvPath = path.join(rootDir, ".env");
    if (await fs.pathExists(dotenvPath)) {
        const dotenv = await import("dotenv");
        dotenv.config({ path: dotenvPath });
    }

    // Import pg for database connection
    const { default: pg } = await import("pg");
    const { Client } = pg;

    const client = new Client({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
    });

    try {
        await client.connect();

        // Check if extension already exists in database
        const checkResult = await client.query("SELECT id FROM extension WHERE identifier = $1", [
            info.identifier,
        ]);

        if (checkResult.rows.length > 0) {
            Logger.warning("Database", `Extension ${info.identifier} already exists in database`);
            return;
        }

        // Insert extension record
        const insertQuery = `
            INSERT INTO extension (
                name, identifier, version, description, type, 
                support_terminal, is_local, status, author, 
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, 
                NOW(), NOW()
            )
        `;

        const values = [
            info.name,
            info.identifier,
            info.version,
            info.description,
            1, // ExtensionType.APPLICATION
            JSON.stringify([1]), // ExtensionSupportTerminal.WEB
            true, // isLocal
            1, // ExtensionStatus.ENABLED
            JSON.stringify({
                avatar: "",
                name: info.author || "",
                homepage: "",
            }),
        ];

        await client.query(insertQuery, values);
        Logger.success("Database", `Extension ${info.identifier} inserted successfully`);
    } finally {
        await client.end();
    }
}

/**
 * Execute pnpm install in project root
 * @param {import("child_process").spawn} spawn - Spawn function
 */
async function installDependencies(spawn) {
    return new Promise((resolve, reject) => {
        Logger.info("Install", "Running pnpm install...");

        const childProcess = spawn("pnpm", ["install"], {
            cwd: rootDir,
            stdio: "inherit",
            shell: true,
        });

        childProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pnpm install failed with exit code: ${code}`));
            }
        });

        childProcess.on("error", (err) => {
            reject(new Error(`pnpm install error: ${err.message}`));
        });
    });
}

/**
 * Convert identifier to schema name (e.g., buildingai-my-app -> buildingai_my_app)
 * @param {string} identifier - Extension identifier
 * @returns {string}
 */
function getExtensionSchemaName(identifier) {
    return identifier.replace(/-/g, "_");
}

/**
 * Synchronize extension database tables
 * Creates schema and syncs entity tables using TypeORM
 * @param {string} identifier - Extension identifier
 */
async function synchronizeExtensionTables(identifier) {
    // Load environment variables
    const dotenvPath = path.join(rootDir, ".env");
    if (await fs.pathExists(dotenvPath)) {
        const dotenv = await import("dotenv");
        dotenv.config({ path: dotenvPath });
    }

    const { default: pg } = await import("pg");
    const { Client } = pg;

    const client = new Client({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
    });

    try {
        await client.connect();

        // Create extension schema
        const schemaName = getExtensionSchemaName(identifier);

        // Check if schema exists
        const schemaResult = await client.query(
            `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
            [schemaName],
        );

        if (schemaResult.rows.length === 0) {
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            Logger.success("Database", `Created schema: ${schemaName}`);
        } else {
            Logger.info("Database", `Schema "${schemaName}" already exists`);
        }
    } finally {
        await client.end();
    }

    // Use TypeORM to synchronize tables
    // This requires the extension to be built first (build/db/entities exists)
    const extensionDir = path.join(EXTENSIONS_DIR, identifier);
    const entitiesPath = path.join(extensionDir, "build", "db", "entities");

    if (!(await fs.pathExists(entitiesPath))) {
        Logger.warning(
            "Database",
            `Entities directory not found: ${entitiesPath}. Tables will be created on first API startup.`,
        );
        return;
    }

    // Import TypeORM and create data source for synchronization
    try {
        const { DataSource } = await import("@buildingai/db/typeorm");
        const { SnakeNamingStrategy } = await import("typeorm-naming-strategies");
        const { glob } = await import("glob");
        const { createRequire } = await import("module");

        // Create require function for resolving @buildingai/db path
        const require = createRequire(import.meta.url);

        const extensionEntitiesPattern = path
            .join(entitiesPath, "**", "*.entity.js")
            .replace(/\\/g, "/");

        // Get main app entities path (needed for relations like User, etc.)
        const dbPackagePath = require.resolve("@buildingai/db");
        const dbDistPath = path.dirname(dbPackagePath);
        const mainEntitiesPattern = path
            .join(dbDistPath, "entities", "**", "*.entity.js")
            .replace(/\\/g, "/");

        // Find entity files
        const extensionEntityFiles = await glob(extensionEntitiesPattern);

        if (extensionEntityFiles.length === 0) {
            Logger.info("Database", "No entity files found, skipping table synchronization");
            return;
        }

        Logger.info(
            "Database",
            `Found ${extensionEntityFiles.length} extension entity file(s), synchronizing tables...`,
        );
        Logger.info("Database", `Loading main entities from: ${mainEntitiesPattern}`);

        // Create temporary data source with BOTH main app and extension entities
        const tempDataSource = new DataSource({
            type: process.env.DB_TYPE || "postgres",
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || "postgres",
            password: process.env.DB_PASSWORD || "postgres",
            database: process.env.DB_DATABASE || "buildingai",
            namingStrategy: new SnakeNamingStrategy(),
            entities: [mainEntitiesPattern, extensionEntitiesPattern],
            synchronize: true,
            logging: false,
        });

        await tempDataSource.initialize();
        Logger.success("Database", "Extension tables synchronized successfully");

        await tempDataSource.destroy();
    } catch (error) {
        Logger.warning(
            "Database",
            `Failed to synchronize tables: ${error.message}. Tables will be created on first API startup.`,
        );
    }
}

/**
 * Build extension (pnpm build:publish)
 * @param {string} extensionDir - Extension directory path
 */
async function buildExtension(extensionDir) {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
        Logger.info("Build", `Building extension at: ${extensionDir}`);

        const childProcess = spawn("pnpm", ["build:publish"], {
            cwd: extensionDir,
            stdio: "inherit",
            shell: true,
        });

        childProcess.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`pnpm build:publish failed with exit code: ${code}`));
            }
        });

        childProcess.on("error", (err) => {
            reject(new Error(`Build error: ${err.message}`));
        });
    });
}

/**
 * Create extension from template - main function
 */
export async function createExtension() {
    const rl = createReadlineInterface();

    console.log("\n");
    Logger.info("Extension", "Create a new BuildingAI extension from template");
    console.log("━".repeat(60));

    try {
        // 1. Get extension identifier
        let identifier = "";
        while (true) {
            const rawIdentifier = await prompt(rl, "Extension identifier (buildingai-<name>)");
            const normalizedIdentifier = rawIdentifier.replace(/^(?:buildingai-)+/g, "");
            identifier = `buildingai-${normalizedIdentifier}`;
            const validation = validateIdentifier(identifier);
            if (!validation.valid) {
                Logger.error("Validation", validation.message);
                continue;
            }

            // Check if extension already exists
            if (await extensionExists(identifier)) {
                Logger.error("Validation", `Extension directory already exists: ${identifier}`);
                continue;
            }

            if (await extensionExistsInConfig(identifier)) {
                Logger.error("Validation", `Extension already exists in config: ${identifier}`);
                continue;
            }

            break;
        }

        // 2. Get extension name
        const defaultName = identifier
            .replace("buildingai-", "")
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        const name = await prompt(rl, "Extension name", defaultName);

        // 3. Get extension version
        const version = await prompt(rl, "Version", "0.0.1");

        // 4. Get extension description
        const description = await prompt(rl, "Description", `A BuildingAI extension: ${name}`);

        // 5. Get author name
        const author = await prompt(rl, "Author", "BuildingAI Teams");

        // 6. Get homepage (optional)
        const homepage = await prompt(rl, "Homepage (optional)", "");

        rl.close();

        const extensionInfo = {
            identifier,
            name,
            version,
            description,
            author,
            homepage,
        };

        console.log("\n");
        Logger.info("Extension", "Creating extension with the following info:");
        console.log("━".repeat(60));
        AdvancedLogger.log("Identifier", identifier);
        AdvancedLogger.log("Name", name);
        AdvancedLogger.log("Version", version);
        AdvancedLogger.log("Description", description);
        AdvancedLogger.log("Author", author);
        if (homepage) {
            AdvancedLogger.log("Homepage", homepage);
        }
        console.log("━".repeat(60));
        console.log("\n");

        // Step 1: Extract template
        Logger.info("Step 1/8", "Extracting template...");
        const extensionDir = await extractTemplate(identifier);
        Logger.success("Step 1/8", `Template extracted to: ${extensionDir}`);

        // Step 2: Update extension files
        Logger.info("Step 2/8", "Updating extension files...");
        await updateExtensionFiles(extensionDir, extensionInfo);
        Logger.success("Step 2/8", "Extension files updated");

        // Step 3: Add to extensions.json
        Logger.info("Step 3/8", "Adding to extensions.json...");
        await addExtensionToConfig(extensionInfo);
        Logger.success("Step 3/8", "Added to extensions.json");

        // Step 4: Insert to database
        Logger.info("Step 4/8", "Inserting extension record to database...");
        try {
            await insertExtensionToDatabase(extensionInfo);
            Logger.success("Step 4/8", "Database record created");
        } catch (error) {
            Logger.warning(
                "Step 4/8",
                `Failed to insert to database: ${error.message}. You may need to insert manually.`,
            );
        }

        // Step 5: Install dependencies
        Logger.info("Step 5/8", "Installing dependencies...");
        const { spawn } = await import("child_process");
        try {
            await installDependencies(spawn);
            Logger.success("Step 5/8", "Dependencies installed");
        } catch (error) {
            Logger.warning(
                "Step 5/8",
                `Failed to install dependencies: ${error.message}. Run 'pnpm install' manually.`,
            );
        }

        // Step 6: Build extension
        Logger.info("Step 6/8", "Building extension...");
        try {
            await buildExtension(extensionDir);
            Logger.success("Step 6/8", "Extension built successfully");
        } catch (error) {
            Logger.warning(
                "Step 6/8",
                `Failed to build extension: ${error.message}. Run 'pnpm build:publish' in extension directory manually.`,
            );
        }

        // Step 7: Synchronize extension database tables
        Logger.info("Step 7/8", "Synchronizing extension database tables...");
        try {
            await synchronizeExtensionTables(identifier);
            Logger.success("Step 7/8", "Database tables synchronized");
        } catch (error) {
            Logger.warning(
                "Step 7/8",
                `Failed to synchronize tables: ${error.message}. Tables will be created on first API startup.`,
            );
        }

        console.log("\n");
        console.log("━".repeat(60));
        Logger.success("Extension", `Extension ${identifier} created successfully!`);
        console.log("━".repeat(60));
        console.log("\n");
        AdvancedLogger.info("Next Steps", "");
        console.log(`  1. cd extensions/${identifier}`);
        console.log("  2. Start developing your extension");
        console.log("  3. Run 'pnpm dev' to test your extension");
        console.log("\n");
    } catch (error) {
        rl.close();
        Logger.error("Extension", `Failed to create extension: ${error.message}`);
        process.exit(1);
    }
}
