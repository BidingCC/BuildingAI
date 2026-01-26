import { Logger } from "@nestjs/common";
import fse from "fs-extra";
import * as path from "path";
import * as semver from "semver";

/**
 * Version information interface
 */
export interface VersionInfo {
    /** Current version */
    current: string;
    /** Installed version (from version file) */
    installed: string | null;
    /** Whether upgrade is needed */
    needsUpgrade: boolean;
    /** Versions that need to be upgraded through */
    upgradeVersions: string[];
}

/**
 * Version detector
 *
 * Responsible for detecting system version and determining if upgrade is needed
 */
export class VersionDetector {
    private readonly logger = new Logger(VersionDetector.name);
    private readonly versionsDir: string;
    private readonly packageJsonPath: string;

    constructor() {
        this.versionsDir = path.join(process.cwd(), "data", "versions");
        this.packageJsonPath = path.join(process.cwd(), "..", "..", "package.json");
    }

    /**
     * Get current version from package.json
     */
    async getCurrentVersion(): Promise<string> {
        try {
            const packageJson = await fse.readJson(this.packageJsonPath);
            return packageJson.version;
        } catch (error) {
            this.logger.error(`Failed to get current version: ${error.message}`);
            return "unknown";
        }
    }

    /**
     * Get installed version from version file
     */
    async getInstalledVersion(): Promise<string | null> {
        try {
            await fse.ensureDir(this.versionsDir);
            const versionFiles = await fse.readdir(this.versionsDir);

            if (versionFiles.length === 0) {
                return null;
            }

            // Sort version files and get the latest one
            const sortedVersions = versionFiles
                .filter((file) => semver.valid(file))
                .sort((a, b) => semver.rcompare(a, b));

            return sortedVersions[0] || null;
        } catch (error) {
            this.logger.error(`Failed to get installed version: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if version file exists
     */
    async versionFileExists(version: string): Promise<boolean> {
        const versionFilePath = path.join(this.versionsDir, version);
        return fse.pathExists(versionFilePath);
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
     * Get all versions that need to be upgraded through
     *
     * @param installedVersion Current installed version
     * @param currentVersion Target version
     * @returns Array of versions to upgrade through (sorted)
     */
    private async getUpgradeVersions(
        installedVersion: string | null,
        currentVersion: string,
    ): Promise<string[]> {
        try {
            // If no installed version, this is initial installation
            if (!installedVersion) {
                return [currentVersion];
            }

            // If versions are the same, no upgrade needed
            if (installedVersion === currentVersion) {
                return [];
            }

            const allVersions = new Set<string>();

            // Collect versions from upgrade scripts
            const upgradePackagePath = require.resolve("@buildingai/upgrade");
            const upgradeDistPath = path.dirname(upgradePackagePath);
            const scriptsDir = path.join(upgradeDistPath, "scripts");

            if (await fse.pathExists(scriptsDir)) {
                const scriptDirs = await fse.readdir(scriptsDir);
                scriptDirs.forEach((dir) => {
                    if (semver.valid(dir)) {
                        allVersions.add(dir);
                    }
                });
            }

            // Collect versions from migration files
            const dbPackagePath = require.resolve("@buildingai/db");
            const dbDistPath = path.dirname(dbPackagePath);
            const migrationsDir = path.join(dbDistPath, "migrations");

            if (await fse.pathExists(migrationsDir)) {
                const migrationFiles = await fse.readdir(migrationsDir);
                migrationFiles.forEach((file) => {
                    if (file.endsWith(".js")) {
                        // Migration file format: timestamp-version-description.js
                        const parts = file.replace(".js", "").split("-");
                        if (parts.length >= 2) {
                            const version = parts[1];
                            if (semver.valid(version)) {
                                allVersions.add(version);
                            }
                        }
                    }
                });
            }

            // Get existing versions to exclude
            const existingVersions = await this.getExistingVersions();

            // Filter and sort versions between installed and current, excluding existing versions
            const upgradeVersions = Array.from(allVersions)
                .filter(
                    (version) =>
                        semver.gt(version, installedVersion) &&
                        semver.lte(version, currentVersion) &&
                        !existingVersions.has(version), // 排除已存在的版本
                )
                .sort((a, b) => semver.compare(a, b));

            // Always include current version if not in the list and not already exists
            if (
                !upgradeVersions.includes(currentVersion) &&
                !existingVersions.has(currentVersion)
            ) {
                upgradeVersions.push(currentVersion);
            }

            return upgradeVersions;
        } catch (error) {
            this.logger.error(`Failed to get upgrade versions: ${error.message}`);
            return [currentVersion];
        }
    }

    /**
     * Detect version information
     */
    async detect(): Promise<VersionInfo> {
        const currentVersion = await this.getCurrentVersion();
        const installedVersion = await this.getInstalledVersion();
        const versionFileExists = await this.versionFileExists(currentVersion);

        // Need upgrade if current version file doesn't exist
        const needsUpgrade = !versionFileExists;

        // Get all versions to upgrade through
        const upgradeVersions = needsUpgrade
            ? await this.getUpgradeVersions(installedVersion, currentVersion)
            : [];

        return {
            current: currentVersion,
            installed: installedVersion,
            needsUpgrade,
            upgradeVersions,
        };
    }
}
