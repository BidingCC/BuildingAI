import { createDataSourceConfig } from "@buildingai/config/db.config";
import { ExtensionDownload, ExtensionDownloadType } from "@buildingai/constants";
import {
    ExtensionStatus,
    type ExtensionSupportTerminalType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import { getExtensionSchemaName } from "@buildingai/core/modules";
import {
    type CreateExtensionDto,
    ExtensionConfigService,
    ExtensionDetailType,
    ExtensionSchemaService,
    ExtensionsService,
    FileUploadService,
} from "@buildingai/core/modules";
import { BaseSeeder } from "@buildingai/db";
import { SeedRunner } from "@buildingai/db/seeds";
import { DataSource } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { TerminalLogger } from "@buildingai/logger";
import { createHttpClient, HttpClientInstance } from "@buildingai/utils";
import { ExtensionFeatureScanService } from "@common/modules/auth/services/extension-feature-scan.service";
import { Injectable, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as path from "path";
import * as semver from "semver";
import { v4 as uuidv4 } from "uuid";

import { Pm2Service } from "../../pm2/services/pm2.service";
import { ExtensionMarketService } from "./extension-market.service";

/**
 * Extension market service
 */
@Injectable()
export class ExtensionOperationService {
    private readonly logger = new Logger(ExtensionOperationService.name);
    private readonly httpClient: HttpClientInstance;
    private readonly rootDir: string;
    private readonly tempDir: string;
    private readonly extensionsDir: string;
    private readonly templatesDir: string;
    private readonly publicWebDir: string;
    private readonly locksDir: string;

    // Static variables for restart debouncing
    private static restartScheduled = false;
    private static restartTimer: NodeJS.Timeout | null = null;
    private static readonly RESTART_DEBOUNCE_MS = 3000; // 3 seconds debounce

    constructor(
        private readonly extensionsService: ExtensionsService,
        private readonly extensionConfigService: ExtensionConfigService,
        private readonly extensionSchemaService: ExtensionSchemaService,
        private readonly pm2Service: Pm2Service,
        private readonly dataSource: DataSource,
        private readonly fileUploadService: FileUploadService,
        private readonly moduleRef: ModuleRef,
    ) {
        // 初始化临时目录路径
        this.rootDir = path.join(process.cwd(), "..", "..");
        this.tempDir = path.join(this.rootDir, "storage", "temp");
        // 确保临时目录存在
        fs.ensureDirSync(this.tempDir);

        this.extensionsDir = path.join(this.rootDir, "extensions");
        fs.ensureDirSync(this.extensionsDir);

        this.templatesDir = path.join(this.rootDir, "templates");

        this.publicWebDir = path.join(this.rootDir, "public", "web", "extensions");
        fs.ensureDirSync(this.publicWebDir);

        this.locksDir = path.join(this.rootDir, "storage", "locks");
        fs.ensureDirSync(this.locksDir);

        this.httpClient = createHttpClient({
            timeout: 30000,
            autoTransformResponse: false,
            retryConfig: {
                retries: 2,
                retryDelay: 1000,
            },
            logConfig: {
                enableErrorLog: true,
            },
        });
    }

    // Lock file names
    private static readonly HEAVY_LOCK = "heavy_operation.lock";
    private static readonly CONFIG_LOCK = "config.lock";

    // Extension operation types
    private static readonly OP_INSTALL = "install";
    private static readonly OP_UPGRADE = "upgrade";
    private static readonly OP_UNINSTALL = "uninstall";

    // Operation display names for error messages
    private static readonly OP_LABELS: Record<string, string> = {
        [ExtensionOperationService.OP_INSTALL]: "安装",
        [ExtensionOperationService.OP_UPGRADE]: "更新",
        [ExtensionOperationService.OP_UNINSTALL]: "卸载",
    };

    /**
     * Acquire lock for extension operation
     * - Install/Upgrade: requires heavy lock (only one at a time) + extension lock
     * - Uninstall: only requires extension lock (can run in parallel with other uninstalls)
     * @param identifier Extension identifier
     * @param operation Operation type
     * @param name Extension display name (optional, falls back to identifier)
     */
    private async acquireLock(identifier: string, operation: string, name?: string): Promise<void> {
        const extensionLockFile = path.join(this.locksDir, `${identifier}.lock`);
        const displayName = name || identifier;

        // Check if this extension is already being operated on
        if (await fs.pathExists(extensionLockFile)) {
            const lockData = await fs.readJson(extensionLockFile);
            const existingOpLabel =
                ExtensionOperationService.OP_LABELS[lockData.operation] || lockData.operation;
            const existingDisplayName = lockData.name || lockData.identifier;
            throw HttpErrorFactory.conflict(
                `插件「${existingDisplayName}」正在执行${existingOpLabel}操作，请稍后再试`,
            );
        }

        // For install/upgrade, check and acquire heavy lock
        const isHeavyOp =
            operation === ExtensionOperationService.OP_INSTALL ||
            operation === ExtensionOperationService.OP_UPGRADE;
        if (isHeavyOp) {
            const heavyLock = await this.getHeavyLock();
            if (heavyLock) {
                const heavyOpLabel =
                    ExtensionOperationService.OP_LABELS[heavyLock.operation] || heavyLock.operation;
                const heavyDisplayName = heavyLock.name || heavyLock.identifier;
                throw HttpErrorFactory.conflict(
                    `插件「${heavyDisplayName}」正在${heavyOpLabel}中，请等待完成后再操作`,
                );
            }

            // Create heavy lock
            await fs.writeJson(path.join(this.locksDir, ExtensionOperationService.HEAVY_LOCK), {
                identifier,
                name: displayName,
                operation,
                timestamp: Date.now(),
                pid: process.pid,
            });
        }

        // Create extension lock
        await fs.writeJson(extensionLockFile, {
            identifier,
            name: displayName,
            operation,
            timestamp: Date.now(),
            pid: process.pid,
        });

        this.logger.log(`Acquired lock for ${displayName} (${operation})`);
    }

    /**
     * Get heavy operation lock if exists
     */
    private async getHeavyLock(): Promise<{
        identifier: string;
        name?: string;
        operation: string;
        timestamp: number;
        pid: number;
    } | null> {
        const heavyLockFile = path.join(this.locksDir, ExtensionOperationService.HEAVY_LOCK);
        try {
            if (await fs.pathExists(heavyLockFile)) {
                return await fs.readJson(heavyLockFile);
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Release lock for extension operation
     * @param identifier Extension identifier
     * @param isHeavyOperation Whether this is a heavy operation (install/upgrade)
     */
    private async releaseLock(identifier: string, isHeavyOperation = false): Promise<void> {
        const extensionLockFile = path.join(this.locksDir, `${identifier}.lock`);

        if (await fs.pathExists(extensionLockFile)) {
            await fs.remove(extensionLockFile);
            this.logger.log(`Released extension lock for ${identifier}`);
        }

        if (isHeavyOperation) {
            const heavyLockFile = path.join(this.locksDir, ExtensionOperationService.HEAVY_LOCK);
            if (await fs.pathExists(heavyLockFile)) {
                await fs.remove(heavyLockFile);
                this.logger.log(`Released heavy operation lock`);
            }
        }
    }

    /**
     * Acquire config lock for extension.json operations
     * Uses retry mechanism to wait for lock release
     */
    private async acquireConfigLock(): Promise<void> {
        const configLockFile = path.join(this.locksDir, ExtensionOperationService.CONFIG_LOCK);
        const maxRetries = 50;
        const retryDelay = 100; // ms

        for (let i = 0; i < maxRetries; i++) {
            if (!(await fs.pathExists(configLockFile))) {
                await fs.writeJson(configLockFile, {
                    timestamp: Date.now(),
                    pid: process.pid,
                });
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }

        throw HttpErrorFactory.conflict("extension.json 文件正在被其他操作使用，请稍后再试");
    }

    /**
     * Release config lock
     */
    private async releaseConfigLock(): Promise<void> {
        const configLockFile = path.join(this.locksDir, ExtensionOperationService.CONFIG_LOCK);
        if (await fs.pathExists(configLockFile)) {
            await fs.remove(configLockFile);
        }
    }

    /**
     * Clean all extension operation locks
     * Should be called on application startup
     */
    static async cleanAllLocks(): Promise<void> {
        const rootDir = path.join(process.cwd(), "..", "..");
        const locksDir = path.join(rootDir, "storage", "locks");

        try {
            if (await fs.pathExists(locksDir)) {
                const lockFiles = await fs.readdir(locksDir);
                const cleanedCount = lockFiles.filter((f) => f.endsWith(".lock")).length;
                for (const file of lockFiles) {
                    if (file.endsWith(".lock")) {
                        await fs.remove(path.join(locksDir, file));
                    }
                }
                if (cleanedCount > 0) {
                    TerminalLogger.success(
                        "Extension Lock",
                        `Cleaned ${cleanedCount} extension operation lock(s)`,
                    );
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            TerminalLogger.error("Extension Lock", `Failed to clean locks: ${errorMessage}`);
        }
    }

    /**
     * 卸载扩展
     *
     * @param identifier 扩展标识符
     */
    async uninstall(identifier: string): Promise<void> {
        if (!identifier) {
            throw HttpErrorFactory.badRequest("Extension identifier is required");
        }

        this.logger.log(`Starting uninstall process for extension: ${identifier}`);

        // 1. Find extension in database first to get the name
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound(`Extension not found: ${identifier}`);
        }

        // Acquire lock with extension name
        await this.acquireLock(identifier, ExtensionOperationService.OP_UNINSTALL, extension.name);

        try {
            // 2. Remove extension directory
            const safeIdentifier = this.toSafeName(identifier);
            const extensionDir = path.join(this.extensionsDir, safeIdentifier);

            if (await fs.pathExists(extensionDir)) {
                this.logger.log(`Removing extension directory: ${extensionDir}`);
                await fs.remove(extensionDir);
            } else {
                this.logger.warn(`Extension directory not found: ${extensionDir}`);
            }

            // 3. Remove web assets from public directory
            await this.removeWebAssets(identifier);

            // 4. Remove extension from extensions.json (with config lock)
            await this.acquireConfigLock();
            try {
                await this.extensionConfigService.removeExtension(identifier);
            } finally {
                await this.releaseConfigLock();
            }

            // 5. Delete file records associated with this extension
            await this.deleteExtensionFiles(identifier);

            // 6. Drop extension database schema (if exists)
            await this.dropExtensionSchemaWrapper(identifier);

            // 7. Delete extension migration history records
            await this.deleteExtensionMigrationHistory(identifier);

            // 8. Delete extension from database
            await this.extensionsService.delete(extension.id);

            // 9. Schedule PM2 restart after response is sent
            this.scheduleRestart();

            this.logger.log(`Extension uninstalled successfully: ${identifier}`);
        } finally {
            // Release lock
            await this.releaseLock(identifier);
        }
    }

    /**
     * 下载并解压扩展包到插件目录
     *
     * @param url 下载链接
     * @returns 返回插件安装信息
     */
    async download(
        url: string,
        identifier: string,
        type: ExtensionDownloadType,
        version?: string,
    ): Promise<{
        identifier: string;
        version?: string;
        pluginDir: string;
        packagePath: string;
    }> {
        try {
            if (!identifier) {
                throw HttpErrorFactory.badRequest("Extension identifier is required");
            }

            const baseName = this.buildPackageBaseName(identifier, version);

            const response = await this.httpClient.get(url, {
                responseType: "arraybuffer",
            });

            const axiosResponse = response as unknown as {
                data: Buffer;
                headers: Record<string, string | undefined>;
            };

            let fileName = this.extractFileNameFromUrl(url);
            const contentDisposition = axiosResponse.headers?.["content-disposition"];
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(
                    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
                );
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1].replace(/['"]/g, "");
                }
            }

            if (!fileName) {
                fileName = `${uuidv4()}.zip`;
            }

            const extension = this.extractFileExtension(fileName);
            const finalFileName = `${baseName}${extension}`;
            const filePath = path.join(this.tempDir, finalFileName);

            await fs.writeFile(filePath, axiosResponse.data);

            const pluginDir = await this.extractPluginPackage(filePath, identifier, type);

            return {
                identifier,
                version,
                pluginDir,
                packagePath: filePath,
            };
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw HttpErrorFactory.badRequest(`Download extension failed: ${reason}`);
        }
    }

    /**
     * 从URL中提取文件名
     *
     * @param url 下载链接
     * @returns 文件名
     */
    private extractFileNameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const segments = pathname.split("/");
            const lastSegment = segments[segments.length - 1];
            return lastSegment || `${uuidv4()}.zip`;
        } catch {
            return `${uuidv4()}.zip`;
        }
    }

    /**
     * 构建扩展包的基础文件名(不包含扩展名)
     *
     * @param identifier 扩展标识符
     * @param version 扩展版本号
     * @returns 基础文件名
     */
    private buildPackageBaseName(identifier: string, version?: string): string {
        const safeIdentifier = this.toSafeName(identifier);
        const safeVersion = version ? this.toSafeName(version) : undefined;
        return safeVersion ? `${safeIdentifier}-${safeVersion}` : safeIdentifier;
    }

    /**
     * 从文件名中提取扩展名
     *
     * @param fileName 文件名
     * @returns 文件扩展名
     */
    private extractFileExtension(fileName: string): string {
        const extension = path.extname(fileName);
        return extension ? extension : ".zip";
    }

    /**
     * 将标识符或版本号转换为安全的文件名片段
     *
     * @param value 原始值
     * @returns 安全的文件名片段
     */
    private toSafeName(value: string): string {
        return value.replace(/[^a-zA-Z0-9._-]/g, "-");
    }

    /**
     * Get all installed plugin package names from extensions directory
     * @returns Array of package names
     */
    private async getInstalledPluginPackageNames(): Promise<string[]> {
        const packageNames: string[] = [];

        try {
            const extensionDirs = await fs.readdir(this.extensionsDir);

            for (const dir of extensionDirs) {
                const extensionDir = path.join(this.extensionsDir, dir);
                const stat = await fs.stat(extensionDir);

                if (stat.isDirectory()) {
                    const packageJsonPath = path.join(extensionDir, "package.json");

                    if (await fs.pathExists(packageJsonPath)) {
                        try {
                            const packageJson = await fs.readJson(packageJsonPath);
                            if (packageJson.name) {
                                packageNames.push(packageJson.name);
                            }
                        } catch (error) {
                            this.logger.warn(
                                `Failed to read package.json from ${extensionDir}: ${error.message}`,
                            );
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to scan extensions directory: ${error.message}`);
        }

        return packageNames;
    }

    /**
     * Clean up extension installation when package name conflict detected
     * @param identifier Extension identifier
     * @param packageName Package name from package.json
     */
    private async cleanupFailedInstallation(
        identifier: string,
        packageName: string,
    ): Promise<void> {
        this.logger.warn(
            `Package name conflict detected: ${packageName}. Cleaning up failed installation...`,
        );

        try {
            // Remove extension directory if exists
            const targetDir = path.join(this.extensionsDir, this.toSafeName(identifier));
            if (await fs.pathExists(targetDir)) {
                await fs.remove(targetDir);
                this.logger.log(`Removed extension directory: ${targetDir}`);
            }

            // Remove from extensions.json
            await this.extensionConfigService.removeExtension(identifier);

            // Remove from database
            const extension = await this.extensionsService.findOne({ where: { identifier } });
            if (extension) {
                await this.extensionsService.delete(extension.id);
                this.logger.log(`Removed extension from database: ${identifier}`);
            }
        } catch (error) {
            this.logger.error(`Failed to cleanup installation: ${error.message}`);
        }
    }

    /**
     * 解压插件包到插件目录
     *
     * @param packagePath 插件包路径
     * @param identifier 插件标识符
     * @param type 下载类型(安装/升级)
     * @returns 插件安装目录
     */
    private async extractPluginPackage(
        packagePath: string,
        identifier: string,
        type: ExtensionDownloadType,
    ): Promise<string> {
        const zip = new AdmZip(packagePath);
        const tempExtractDir = path.join(
            this.tempDir,
            `${path.basename(packagePath, path.extname(packagePath))}-${uuidv4()}`,
        );

        await fs.ensureDir(tempExtractDir);

        try {
            zip.extractAllTo(tempExtractDir, true);

            const sourceDir = await this.resolvePluginRoot(tempExtractDir);

            // Read package.json to get package name
            const packageJsonPath = path.join(sourceDir, "package.json");
            if (!(await fs.pathExists(packageJsonPath))) {
                throw HttpErrorFactory.badRequest("Plugin package.json not found");
            }

            const packageJson = await fs.readJson(packageJsonPath);
            const packageName = packageJson.name;

            if (!packageName) {
                throw HttpErrorFactory.badRequest("Plugin package.json missing name field");
            }

            // Check for package name conflicts (only for fresh installs, not upgrades)
            if (type !== ExtensionDownload.UPGRADE) {
                const installedPackageNames = await this.getInstalledPluginPackageNames();

                if (installedPackageNames.includes(packageName)) {
                    // Clean up failed installation
                    await this.cleanupFailedInstallation(identifier, packageName);
                    throw HttpErrorFactory.badRequest(
                        `Extension with package name "${packageName}" already exists. Installation cancelled.`,
                    );
                }
            }

            const targetDir = path.join(this.extensionsDir, this.toSafeName(identifier));

            // Handle upgrade: preserve data, storage, node_modules
            if (type === ExtensionDownload.UPGRADE && (await fs.pathExists(targetDir))) {
                await this.upgradeExtension(sourceDir, targetDir);
            } else {
                // Fresh install: remove old directory if exists
                if (await fs.pathExists(targetDir)) {
                    await fs.remove(targetDir);
                }

                await fs.ensureDir(targetDir);
                await fs.copy(sourceDir, targetDir);
            }

            await this.ensurePluginStructure(targetDir);

            return targetDir;
        } finally {
            await fs.remove(tempExtractDir).catch(() => undefined);
        }
    }

    /**
     * Upgrade extension by preserving data and storage directories
     * @param sourceDir New extension source directory
     * @param targetDir Existing extension directory
     */
    private async upgradeExtension(sourceDir: string, targetDir: string): Promise<void> {
        const preservePaths = ["data", "storage"];
        const tempBackupDir = path.join(this.tempDir, `backup-${uuidv4()}`);

        try {
            // 1. Backup preserved paths
            await fs.ensureDir(tempBackupDir);
            for (const preservePath of preservePaths) {
                const sourcePath = path.join(targetDir, preservePath);
                if (await fs.pathExists(sourcePath)) {
                    const backupPath = path.join(tempBackupDir, preservePath);
                    await fs.copy(sourcePath, backupPath);
                    this.logger.log(`Backed up ${preservePath} directory`);
                }
            }

            // 2. Remove old extension directory
            await fs.remove(targetDir);
            this.logger.log(`Removed old extension directory: ${targetDir}`);

            // 3. Copy new extension files
            await fs.ensureDir(targetDir);
            await fs.copy(sourceDir, targetDir);
            this.logger.log(`Copied new extension files to: ${targetDir}`);

            // 4. Restore preserved paths
            for (const preservePath of preservePaths) {
                const backupPath = path.join(tempBackupDir, preservePath);
                const targetPath = path.join(targetDir, preservePath);

                if (await fs.pathExists(backupPath)) {
                    // Always restore preserved directories, merge with new version if exists
                    await fs.copy(backupPath, targetPath, { overwrite: false });
                    this.logger.log(`Restored ${preservePath} directory (merged with new version)`);
                }
            }
        } finally {
            // Clean up backup
            await fs.remove(tempBackupDir).catch(() => undefined);
        }
    }

    /**
     * 确保插件目录结构有效
     *
     * @param targetDir 插件目录
     */
    private async ensurePluginStructure(targetDir: string): Promise<void> {
        const buildDir = path.join(targetDir, "build");
        const outputPublicDir = path.join(targetDir, ".output", "public");

        // Check if build directory exists (backend)
        if (!(await fs.pathExists(buildDir))) {
            throw HttpErrorFactory.badRequest(
                'Invalid plugin package structure: missing "build" directory',
            );
        }

        // Check if .output/public directory exists (frontend)
        if (!(await fs.pathExists(outputPublicDir))) {
            throw HttpErrorFactory.badRequest(
                'Invalid plugin package structure: missing ".output/public" directory',
            );
        }
    }

    /**
     * 解析插件包内的根目录
     *
     * @param extractedDir 解压后的临时目录
     * @returns 插件根目录
     */
    private async resolvePluginRoot(extractedDir: string): Promise<string> {
        if (await this.hasPluginStructure(extractedDir)) {
            return extractedDir;
        }

        const entries = await fs.readdir(extractedDir);
        for (const entry of entries) {
            const entryPath = path.join(extractedDir, entry);
            const stat = await fs.stat(entryPath);
            if (stat.isDirectory() && (await this.hasPluginStructure(entryPath))) {
                return entryPath;
            }
        }

        throw HttpErrorFactory.badRequest(
            "Invalid plugin package structure: expected build and .output/public directories",
        );
    }

    /**
     * 判断目录是否包含有效插件结构
     *
     * @param dir 检测目录
     * @returns 是否包含 build 和 .output/public 目录
     */
    private async hasPluginStructure(dir: string): Promise<boolean> {
        const buildDir = path.join(dir, "build");
        const outputPublicDir = path.join(dir, ".output", "public");

        return (await fs.pathExists(buildDir)) && (await fs.pathExists(outputPublicDir));
    }

    /**
     * Install extension with complete workflow
     * @param identifier Extension identifier
     * @param requestedVersion Optional version, uses latest if not provided
     * @param extensionMarketService Market service instance for fetching extension data
     * @returns Installed extension entity
     */
    async install(
        identifier: string,
        requestedVersion: string | undefined,
        extensionMarketService: ExtensionMarketService,
    ) {
        this.logger.log(`Starting install extension: ${identifier}`);

        // Get extension info first to get the name for lock
        const extensionInfo = await extensionMarketService.getApplicationDetail(identifier);

        // Acquire lock with extension name
        await this.acquireLock(
            identifier,
            ExtensionOperationService.OP_INSTALL,
            extensionInfo.name,
        );

        try {
            const targetVersion =
                requestedVersion ??
                (await this.resolveLatestVersion(identifier, extensionMarketService));

            if (!targetVersion) {
                throw HttpErrorFactory.badRequest(
                    `No available version found for extension: ${identifier}`,
                );
            }

            const { url } = await extensionMarketService.downloadApplication(
                identifier,
                targetVersion,
                ExtensionDownload.INSTALL,
            );
            await this.download(url, identifier, ExtensionDownload.INSTALL, targetVersion);

            const extension = await this.extensionsService.create({
                name: extensionInfo.name,
                identifier: extensionInfo.identifier,
                version: targetVersion,
                description: extensionInfo.description,
                icon: extensionInfo.icon,
                type: extensionInfo.type as ExtensionTypeType,
                supportTerminal: extensionInfo.supportTerminal as ExtensionSupportTerminalType[],
                author: extensionInfo.author,
                documentation: extensionInfo.content,
                status: ExtensionStatus.ENABLED,
                isLocal: false,
            });

            // Update extensions.json to enable the new extension
            await this.updateExtensionsConfigWrapper(extensionInfo, targetVersion);

            // Install dependencies before restarting
            await this.installDependencies();

            // Synchronize extension tables and execute seeds BEFORE restart
            await this.synchronizeExtensionTablesAndSeeds(identifier);

            // Scan and sync member-only features
            await this.scanExtensionMemberFeatures(identifier, extension.id);

            // Schedule PM2 restart after response is sent
            this.scheduleRestart();

            this.logger.log(`Extension installed successfully: ${identifier}@${targetVersion}`);
            return extension;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to install extension: ${errorMessage}`);
            throw error;
        } finally {
            // Release lock (heavy operation)
            await this.releaseLock(identifier, true);
        }
    }

    /**
     * Install application by activation code
     * @param activationCode Activation code
     * @param requestedVersion Optional version (may not be used if API returns specific version)
     * @param extensionMarketService Extension market service instance
     * @returns Installed extension entity
     */
    async installByActivationCode(
        activationCode: string,
        identifier: string,
        requestedVersion: string | undefined,
        extensionMarketService: ExtensionMarketService,
    ) {
        this.logger.log(`Starting install application by activation code: ${activationCode}`);

        // Get extension info first to get the name for lock
        const appInfo = await extensionMarketService.getApplicationDetail(identifier);

        if (!appInfo.isCompatible) {
            throw HttpErrorFactory.badRequest(`应用 ${appInfo.name} 不兼容当前平台，无法安装`);
        }

        // Acquire lock with extension name
        await this.acquireLock(identifier, ExtensionOperationService.OP_INSTALL, appInfo.name);

        try {
            const targetVersion =
                requestedVersion ??
                (await this.resolveLatestVersion(identifier, extensionMarketService));

            if (!targetVersion) {
                throw HttpErrorFactory.badRequest(
                    `No available version found for extension: ${identifier}`,
                );
            }

            const { url } =
                await extensionMarketService.installApplicationByActivationCode(activationCode);

            await this.download(url, identifier, ExtensionDownload.INSTALL, targetVersion);

            const extension = await this.extensionsService.create({
                name: appInfo.name,
                identifier: appInfo.identifier,
                version: targetVersion,
                description: appInfo.description,
                icon: appInfo.icon,
                type: appInfo.type as ExtensionTypeType,
                supportTerminal: appInfo.supportTerminal as ExtensionSupportTerminalType[],
                author: appInfo.author,
                documentation: appInfo.content,
                status: ExtensionStatus.ENABLED,
                isLocal: false,
            });

            // Update extensions.json to enable the new extension
            await this.updateExtensionsConfigWrapper(appInfo, targetVersion);

            // Install dependencies before restarting
            await this.installDependencies();

            // Synchronize extension tables and execute seeds BEFORE restart
            await this.synchronizeExtensionTablesAndSeeds(identifier);

            // Scan and sync member-only features
            await this.scanExtensionMemberFeatures(identifier, extension.id);

            // Schedule PM2 restart after response is sent
            this.scheduleRestart();

            this.logger.log(`Extension installed successfully: ${identifier}@${targetVersion}`);
            return extension;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to install application by activation code: ${errorMessage}`);
            throw error;
        } finally {
            // Release lock (heavy operation)
            await this.releaseLock(identifier, true);
        }
    }

    /**
     * Upgrade extension content to latest version
     */
    async upgradeContent(identifier: string, extensionMarketService: ExtensionMarketService) {
        this.logger.log(`Starting upgrade extension content: ${identifier}`);

        try {
            const latestVersion = await this.resolveLatestVersion(
                identifier,
                extensionMarketService,
            );

            if (!latestVersion) {
                throw HttpErrorFactory.badRequest(
                    `No available version found for extension: ${identifier}`,
                );
            }

            return await extensionMarketService.getApplicationUpgradeContent(
                identifier,
                latestVersion,
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to upgrade extension content: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Upgrade extension to latest version
     * @param identifier Extension identifier
     * @param extensionMarketService Market service instance
     * @returns Updated extension entity
     */
    async upgrade(identifier: string, extensionMarketService: ExtensionMarketService) {
        this.logger.log(`Starting upgrade extension: ${identifier}`);

        // Get extension info first to get the name for lock
        const extensionInfo = await extensionMarketService.getApplicationDetail(identifier);
        if (extensionInfo.appsStatus === 0) {
            throw HttpErrorFactory.badRequest("当前应用未在官网注册安装，不支持更新");
        }

        if (!extensionInfo.isCompatible) {
            throw HttpErrorFactory.badRequest(
                `应用 ${extensionInfo.name} 不兼容当前平台，无法升级`,
            );
        }

        // Acquire lock with extension name
        await this.acquireLock(
            identifier,
            ExtensionOperationService.OP_UPGRADE,
            extensionInfo.name,
        );

        try {
            const latestVersion = await this.resolveLatestVersion(
                identifier,
                extensionMarketService,
            );

            if (!latestVersion) {
                throw HttpErrorFactory.badRequest(
                    `No available version found for extension: ${identifier}`,
                );
            }

            // 2. Download latest version with UPGRADE type
            const { url } = await extensionMarketService.downloadApplication(
                identifier,
                latestVersion,
                ExtensionDownload.UPGRADE,
            );
            await this.download(url, identifier, ExtensionDownload.UPGRADE, latestVersion);

            // 3. Update extension in database
            const extension = await this.extensionsService.findByIdentifier(identifier);
            if (!extension) {
                throw HttpErrorFactory.notFound(`Extension ${identifier} not found`);
            }

            const updatedExtension = await this.extensionsService.updateById(extension.id, {
                version: latestVersion,
                name: extensionInfo.name,
                description: extensionInfo.description,
                icon: extensionInfo.icon,
                type: extensionInfo.type as ExtensionTypeType,
                supportTerminal: extensionInfo.supportTerminal as ExtensionSupportTerminalType[],
                author: extensionInfo.author,
                documentation: extensionInfo.content,
            });

            // 4. Update extensions.json
            await this.updateExtensionsConfigWrapper(extensionInfo, latestVersion);

            // 5. Install dependencies
            await this.installDependencies();

            // 6. Synchronize extension tables and execute seeds BEFORE restart
            await this.synchronizeExtensionTablesAndSeeds(identifier);

            // 7. Schedule PM2 restart after response is sent
            this.scheduleRestart();

            this.logger.log(`Extension upgraded successfully: ${identifier} to ${latestVersion}`);
            return updatedExtension;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to upgrade extension: ${errorMessage}`);
            throw error;
        } finally {
            // Release lock (heavy operation)
            await this.releaseLock(identifier, true);
        }
    }

    /**
     * Resolve latest available version for extension
     * @param identifier Extension identifier
     * @param extensionMarketService Market service instance
     * @returns Latest version string or null if none available
     */
    private async resolveLatestVersion(
        identifier: string,
        extensionMarketService: ExtensionMarketService,
    ): Promise<string | null> {
        const versionsRaw = await extensionMarketService.getApplicationVersions(identifier);
        if (!versionsRaw || versionsRaw.length === 0) {
            return null;
        }

        // 1. Filter valid semver versions
        const validVersions = versionsRaw.map((v) => v.version).filter((v) => semver.valid(v));

        if (validVersions.length === 0) {
            // Fallback to raw first item if no valid semver found
            return versionsRaw[0].version;
        }

        // 2. Sort descending using semver
        validVersions.sort((a, b) => semver.rcompare(a, b));

        // 3. Prefer stable release (no prerelease tag)
        const latestStable = validVersions.find((v) => !semver.prerelease(v));

        // 4. Return latest stable or latest prerelease
        return latestStable || validVersions[0];
    }

    /**
     * Update extensions.json configuration file using ExtensionConfigService
     * @param extensionInfo Extension detail information
     * @param version Extension version
     * @private
     */
    private async updateExtensionsConfigWrapper(
        extensionInfo: ExtensionDetailType,
        version: string,
    ): Promise<void> {
        // Acquire config lock to prevent concurrent extension.json modifications
        await this.acquireConfigLock();

        try {
            const extensionConfig = {
                manifest: {
                    identifier: extensionInfo.identifier,
                    name: extensionInfo.name,
                    version: version,
                    description: extensionInfo.description,
                    author: extensionInfo.author,
                },
                isLocal: false,
                enabled: true,
                installedAt: new Date().toISOString(),
            };

            await this.extensionConfigService.addExtension(
                extensionInfo.identifier,
                extensionConfig,
                "applications",
            );

            this.logger.log(
                `Updated extensions.json: enabled ${extensionInfo.identifier}@${version}`,
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to update extensions.json: ${errorMessage}. Extension installed but may not load on restart.`,
            );
            // Don't throw error - extension is already installed in database
        } finally {
            await this.releaseConfigLock();
        }
    }

    /**
     * Drop extension database schema using ExtensionSchemaService
     * @param identifier Extension identifier
     * @private
     */
    private async dropExtensionSchemaWrapper(identifier: string): Promise<void> {
        try {
            // Use the same schema name sanitization logic as creation
            const schemaName = getExtensionSchemaName(identifier);

            this.logger.log(`Checking for extension schema: ${schemaName}`);

            // Check if schema exists
            const schemaExists = await this.extensionSchemaService.checkSchemaExists(schemaName);

            if (schemaExists) {
                this.logger.log(`Dropping extension schema: ${schemaName}`);
                await this.extensionSchemaService.dropSchema(schemaName);
                this.logger.log(`Extension schema dropped successfully: ${schemaName}`);
            } else {
                this.logger.log(`Extension schema does not exist: ${schemaName}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to drop extension schema: ${errorMessage}. Manual cleanup may be required.`,
            );
            // Don't throw error - continue with uninstall
        }
    }

    /**
     * Delete extension migration history records
     * @param identifier Extension identifier
     * @private
     */
    private async deleteExtensionMigrationHistory(identifier: string): Promise<void> {
        try {
            this.logger.log(`Deleting migration history for extension: ${identifier}`);

            const result = await this.dataSource.query(
                `DELETE FROM "extensions_migrations_history" WHERE extension_identifier = $1`,
                [identifier],
            );

            const deletedCount = result[1] || 0;
            this.logger.log(
                `Deleted ${deletedCount} migration history record(s) for extension: ${identifier}`,
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Table might not exist if no migrations were ever run
            if (errorMessage.includes("does not exist")) {
                this.logger.log(
                    `Migration history table does not exist, skipping cleanup for: ${identifier}`,
                );
                return;
            }
            this.logger.error(
                `Failed to delete migration history: ${errorMessage}. Manual cleanup may be required.`,
            );
            // Don't throw error - continue with uninstall
        }
    }

    /**
     * Delete file records associated with extension
     * @param identifier Extension identifier
     * @private
     */
    private async deleteExtensionFiles(identifier: string): Promise<void> {
        try {
            this.logger.log(`Deleting file records for extension: ${identifier}`);

            const files = await this.fileUploadService.findAll({
                where: { extensionIdentifier: identifier },
            });

            if (files.length === 0) {
                this.logger.log(`No file records found for extension: ${identifier}`);
                return;
            }

            // Batch delete database records (physical files will be removed with extension directory)
            const fileIds = files.map((file) => file.id);
            const deletedCount = await this.fileUploadService.deleteMany(fileIds);

            this.logger.log(`Deleted ${deletedCount} file record(s) for extension: ${identifier}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to delete file records: ${errorMessage}. Manual cleanup may be required.`,
            );
            // Don't throw error - continue with uninstall
        }
    }

    /**
     * Install project dependencies using pnpm
     * @private
     */
    private async installDependencies(): Promise<void> {
        try {
            this.logger.log("Installing project dependencies...");

            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const projectRoot = path.join(process.cwd(), "..", "..");

            await execAsync("pnpm install --no-frozen-lockfile", {
                cwd: projectRoot,
                env: process.env,
            });

            this.logger.log("Dependencies installed successfully");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to install dependencies: ${errorMessage}`);
            throw HttpErrorFactory.internal(`Failed to install dependencies: ${errorMessage}`);
        }
    }

    /**
     * Build extension using pnpm
     * @param extensionDir Extension directory path
     * @private
     */
    private async buildExtension(extensionDir: string): Promise<void> {
        try {
            this.logger.log(`Building extension at: ${extensionDir}`);

            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            // Build web first, then build api
            await execAsync("pnpm build:publish", {
                cwd: extensionDir,
                env: process.env,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to build extension: ${errorMessage}`);
            throw HttpErrorFactory.internal(`Failed to build extension: ${errorMessage}`);
        }
    }

    /**
     * Restart PM2 process to load new extensions
     * Uses restart instead of reload to ensure module cache is cleared
     * @private
     */
    private async restartPm2Process(): Promise<void> {
        try {
            this.logger.log("Restarting PM2 process to load new extension");

            if (!this.pm2Service.isPm2Available()) {
                this.logger.warn(
                    "PM2 is not available. Extension installed but requires manual restart to take effect.",
                );
                return;
            }

            const result = await this.pm2Service.restart();

            if (result.success) {
                this.logger.log("PM2 process restarted successfully");
            } else {
                this.logger.warn(
                    `Failed to restart PM2 process: ${result.message}. Extension installed but requires manual restart.`,
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Error during PM2 restart: ${errorMessage}. Extension installed but requires manual restart.`,
            );
            // Don't throw error - extension is already installed
        }
    }

    /**
     * Create extension from template
     * @param dto Create extension DTO
     * @returns Created extension entity
     */
    async createFromTemplate(dto: CreateExtensionDto) {
        this.logger.log(`Starting create extension from template: ${dto.identifier}`);

        try {
            // 1. Check if extension already exists
            const existingExtension = await this.extensionsService.findByIdentifier(dto.identifier);
            if (existingExtension) {
                throw HttpErrorFactory.badRequest(
                    `Extension with identifier ${dto.identifier} already exists`,
                );
            }

            // 2. Extract template to extensions directory
            const extensionDir = await this.extractTemplateToExtensions(dto.identifier);

            // 3. Update manifest.json and package.json
            await this.updateExtensionFiles(extensionDir, dto);

            // 4. Create extension in database
            const extension = await this.extensionsService.create({
                name: dto.name,
                identifier: dto.identifier,
                version: dto.version || "0.0.1",
                description: dto.description,
                icon: dto.icon,
                type: dto.type,
                supportTerminal: dto.supportTerminal,
                author: dto.author,
                homepage: dto.homepage,
                documentation: dto.documentation,
                status: ExtensionStatus.ENABLED,
                isLocal: true,
            });

            // 5. Add extension to extensions.json
            await this.addExtensionToConfig(dto);

            // 6. Install dependencies
            await this.installDependencies();

            // 7. Build extension
            await this.buildExtension(extensionDir);

            // 8. Synchronize extension tables and execute seeds BEFORE restart
            await this.synchronizeExtensionTablesAndSeeds(dto.identifier);

            // 9. Schedule PM2 restart after response is sent
            this.scheduleRestart();

            this.logger.log(`Extension created successfully: ${dto.identifier}`);
            return extension;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create extension from template: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Extract template zip to extensions directory
     * @param identifier Extension identifier
     * @returns Extension directory path
     * @private
     */
    private async extractTemplateToExtensions(identifier: string): Promise<string> {
        const templatePath = path.join(this.templatesDir, "buildingai-extension-starter");

        if (!(await fs.pathExists(templatePath))) {
            throw HttpErrorFactory.badRequest(`Template directory not found: ${templatePath}`);
        }

        const templateStat = await fs.stat(templatePath);
        if (!templateStat.isDirectory()) {
            throw HttpErrorFactory.badRequest(`Template path is not a directory: ${templatePath}`);
        }

        const safeIdentifier = this.toSafeName(identifier);
        const targetDir = path.join(this.extensionsDir, safeIdentifier);

        // Check if target directory already exists
        if (await fs.pathExists(targetDir)) {
            throw HttpErrorFactory.badRequest(`Extension directory already exists: ${targetDir}`);
        }

        try {
            // Find the root directory (may be nested)
            const sourceDir = await this.resolveTemplateRoot(templatePath);

            // Copy to target directory
            await fs.ensureDir(targetDir);
            await fs.copy(sourceDir, targetDir);

            this.logger.log(`Template extracted to: ${targetDir}`);
            return targetDir;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw HttpErrorFactory.badRequest(`Failed to extract template: ${errorMessage}`);
        }
    }

    /**
     * Resolve template root directory
     * @param extractedDir Extracted temporary directory
     * @returns Template root directory path
     * @private
     */
    private async resolveTemplateRoot(extractedDir: string): Promise<string> {
        // Check if current directory has package.json
        const packageJsonPath = path.join(extractedDir, "package.json");
        if (await fs.pathExists(packageJsonPath)) {
            return extractedDir;
        }

        // Check subdirectories
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

        throw HttpErrorFactory.badRequest("Invalid template structure: package.json not found");
    }

    /**
     * Update extension manifest.json and package.json files
     * @param extensionDir Extension directory path
     * @param dto Create extension DTO
     * @private
     */
    private async updateExtensionFiles(
        extensionDir: string,
        dto: CreateExtensionDto,
    ): Promise<void> {
        // Update manifest.json
        const manifestPath = path.join(extensionDir, "manifest.json");
        if (await fs.pathExists(manifestPath)) {
            const manifest = await fs.readJson(manifestPath);
            manifest.identifier = dto.identifier;
            manifest.name = dto.name;
            manifest.version = dto.version || "0.0.1";
            manifest.description = dto.description || "";
            manifest.homepage = dto.homepage || "";
            if (dto.type) {
                manifest.type = dto.type;
            }
            if (dto.author) {
                manifest.author = {
                    avatar: dto.author.avatar || "",
                    name: dto.author.name || "",
                    homepage: dto.author.homepage || "",
                };
            }
            await fs.writeJson(manifestPath, manifest, { spaces: 4 });
            this.logger.log(`Updated manifest.json for ${dto.identifier}`);
        }

        // Update package.json
        const packageJsonPath = path.join(extensionDir, "package.json");
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            packageJson.name = dto.identifier;
            packageJson.version = dto.version || "0.0.1";
            packageJson.description = dto.description || "";
            if (dto.author?.name) {
                packageJson.author = dto.author.name;
            }
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 4 });
            this.logger.log(`Updated package.json for ${dto.identifier}`);
        }
    }

    /**
     * Update author name in manifest.json and package.json
     * @param identifier Extension identifier
     * @param authorName Author name to update
     */
    async updateAuthorName(identifier: string, authorName: string): Promise<void> {
        if (!authorName) return;

        const safeIdentifier = this.toSafeName(identifier);
        const extensionDir = path.join(this.extensionsDir, safeIdentifier);

        if (!(await fs.pathExists(extensionDir))) {
            this.logger.warn(`Extension directory not found: ${extensionDir}`);
            return;
        }

        // Update manifest.json
        const manifestPath = path.join(extensionDir, "manifest.json");
        if (await fs.pathExists(manifestPath)) {
            const manifest = await fs.readJson(manifestPath);
            if (manifest.author) {
                manifest.author.name = authorName;
                await fs.writeJson(manifestPath, manifest, { spaces: 4 });
            }
        }

        // Update package.json
        const packageJsonPath = path.join(extensionDir, "package.json");
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            packageJson.author = authorName;
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 4 });
        }
    }

    /**
     * Add extension to extensions.json configuration
     * @param dto Create extension DTO
     * @private
     */
    private async addExtensionToConfig(dto: CreateExtensionDto): Promise<void> {
        const extensionConfig = {
            manifest: {
                identifier: dto.identifier,
                name: dto.name,
                version: dto.version || "0.0.1",
                description: dto.description || "",
                author: {
                    avatar: dto.author?.avatar || "",
                    name: dto.author?.name || "",
                    homepage: dto.author?.homepage || "",
                },
            },
            isLocal: true,
            enabled: true,
            installedAt: new Date().toISOString(),
        };

        await this.extensionConfigService.addExtension(
            dto.identifier,
            extensionConfig,
            "applications",
        );

        this.logger.log(`Added extension to extensions.json: ${dto.identifier}`);
    }

    /**
     * Remove web assets from public/web/extensions/{identifier}
     * @param identifier Extension identifier
     * @private
     */
    private async removeWebAssets(identifier: string): Promise<void> {
        try {
            const safeIdentifier = this.toSafeName(identifier);
            const targetWebDir = path.join(this.publicWebDir, safeIdentifier);

            // Check if target web directory exists
            if (await fs.pathExists(targetWebDir)) {
                this.logger.log(`Removing web assets: ${targetWebDir}`);
                await fs.remove(targetWebDir);
                this.logger.log(`Web assets removed successfully for extension: ${identifier}`);
            } else {
                this.logger.log(
                    `Web assets directory not found: ${targetWebDir}. Skipping removal.`,
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to remove web assets: ${errorMessage}`);
            // Don't throw error - continue with uninstall even if web assets removal fails
        }
    }

    /**
     * Synchronize extension database tables and execute seeds before restart
     *
     * This method creates a temporary database connection to:
     * 1. Load extension entities
     * 2. Synchronize extension tables (create/update schema)
     * 3. Execute extension seed files
     *
     * @param identifier Extension identifier
     * @private
     */
    private async synchronizeExtensionTablesAndSeeds(identifier: string): Promise<void> {
        let tempDataSource: DataSource | null = null;

        try {
            this.logger.log(
                `Synchronizing tables and executing seeds for extension: ${identifier}`,
            );

            // First, ensure the extension schema exists
            const schemaName = getExtensionSchemaName(identifier);
            await this.ensureExtensionSchema(schemaName);

            const safeIdentifier = this.toSafeName(identifier);
            const extensionPath = path.join(this.extensionsDir, safeIdentifier);
            const extensionEntitiesPath = path.join(
                extensionPath,
                "build",
                "db",
                "entities",
                "**",
                "*.entity.js",
            );

            // Get main app entities path (needed for relations like User, etc.)
            const dbPackagePath = require.resolve("@buildingai/db");
            const dbDistPath = path.dirname(dbPackagePath);
            const mainEntitiesPath = path.join(dbDistPath, "entities", "**", "*.entity.js");

            this.logger.log(`Loading entities from: ${extensionEntitiesPath}`);
            this.logger.log(`Loading main entities from: ${mainEntitiesPath}`);

            // Create temporary data source with both main app and extension entities
            const databaseOptions = createDataSourceConfig();
            tempDataSource = new DataSource({
                ...databaseOptions,
                entities: [mainEntitiesPath, extensionEntitiesPath],
                synchronize: true, // Enable synchronize for this temporary connection
                logging: false,
            });

            // Initialize and synchronize
            await tempDataSource.initialize();
            this.logger.log(`Extension ${identifier} tables synchronized successfully`);

            // Execute extension seeds
            await this.executeExtensionSeeds(identifier, tempDataSource);

            // Mark extension as installed and write version file (only for first installation)
            await this.markExtensionAsInstalled(identifier);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to synchronize extension tables and seeds: ${errorMessage}`);
            throw error;
        } finally {
            // Close temporary connection
            if (tempDataSource?.isInitialized) {
                await tempDataSource.destroy();
            }
        }
    }

    /**
     * Execute extension seed files
     *
     * @param identifier Extension identifier
     * @param dataSource DataSource to use for seed execution
     * @private
     */
    private async executeExtensionSeeds(identifier: string, dataSource: DataSource): Promise<void> {
        const safeIdentifier = this.toSafeName(identifier);
        const extensionPath = path.join(this.extensionsDir, safeIdentifier);

        // Check if extension is already installed (skip seeds on upgrade)
        const installFilePath = path.join(extensionPath, "data", ".installed");
        if (await fs.pathExists(installFilePath)) {
            this.logger.log(`Extension ${identifier} already installed, skipping seeds execution`);
            TerminalLogger.log(
                "Extension Upgrade",
                `Extension ${identifier} already installed, skipping seeds execution`,
                {
                    icon: "⬆",
                },
            );
            return;
        }

        const seedsIndexPath = path.join(extensionPath, "build", "db", "seeds", "index.js");

        // Check if seeds entry exists
        if (!(await fs.pathExists(seedsIndexPath))) {
            this.logger.log(`Extension ${identifier} has no seeds, skipping...`);
            return;
        }

        try {
            this.logger.log(`Executing seeds for extension: ${identifier}`);

            // Dynamic require for CommonJS modules
            const seedsModule = require(seedsIndexPath);

            if (!seedsModule.getSeeders) {
                this.logger.warn(
                    `Extension ${identifier} seeds/index.ts must export getSeeders function`,
                );
                return;
            }

            // Get seeders and run
            const seeders: BaseSeeder[] = await seedsModule.getSeeders();

            if (!Array.isArray(seeders) || seeders.length === 0) {
                this.logger.log(`Extension ${identifier} has no seeders to run`);
                return;
            }

            const seedRunner = new SeedRunner(dataSource);
            await seedRunner.run(seeders);

            this.logger.log(`Extension ${identifier} seeds executed successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to execute extension ${identifier} seeds: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Ensure extension schema exists in database
     *
     * @param schemaName Schema name to create
     * @private
     */
    private async ensureExtensionSchema(schemaName: string): Promise<void> {
        try {
            // Check if schema already exists
            const result = await this.dataSource.query(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                [schemaName],
            );

            if (result.length > 0) {
                this.logger.log(`Schema "${schemaName}" already exists`);
                return;
            }

            // Create schema
            await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            this.logger.log(`Created schema: ${schemaName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create schema "${schemaName}": ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Mark extension as installed by creating .installed file
     * Also writes version file on first installation to prevent re-running migrations on upgrade
     *
     * @param identifier Extension identifier
     * @private
     */
    private async markExtensionAsInstalled(identifier: string): Promise<void> {
        try {
            const safeIdentifier = this.toSafeName(identifier);
            const extensionPath = path.join(this.extensionsDir, safeIdentifier);
            const dataDir = path.join(extensionPath, "data");
            await fs.ensureDir(dataDir);

            const installFilePath = path.join(dataDir, ".installed");

            // Check if already installed (upgrade scenario)
            const isAlreadyInstalled = await fs.pathExists(installFilePath);

            if (isAlreadyInstalled) {
                // Upgrade scenario: don't write version file here, let upgrade process handle it
                this.logger.log(
                    `Extension ${identifier} already installed, skipping version file write`,
                );
                return;
            }

            // First installation: write .installed file
            await fs.writeFile(
                installFilePath,
                JSON.stringify(
                    {
                        installed_at: new Date().toISOString(),
                        identifier: identifier,
                    },
                    null,
                    2,
                ),
            );
            this.logger.log(`Extension ${identifier} marked as installed`);

            // First installation: also write version file
            await this.writeExtensionVersionFile(identifier);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to mark extension ${identifier} as installed: ${errorMessage}`,
            );
            // Don't throw - this is not critical
        }
    }

    /**
     * Write version file to mark current version as installed
     * This prevents upgrade process from re-running migrations for already installed version
     *
     * @param identifier Extension identifier
     * @private
     */
    private async writeExtensionVersionFile(identifier: string): Promise<void> {
        try {
            const safeIdentifier = this.toSafeName(identifier);
            const extensionPath = path.join(this.extensionsDir, safeIdentifier);
            const packageJsonPath = path.join(extensionPath, "package.json");

            if (!(await fs.pathExists(packageJsonPath))) {
                this.logger.warn(`package.json not found for ${identifier}, skipping version file`);
                return;
            }

            const packageJson = await fs.readJson(packageJsonPath);
            const version = packageJson.version;

            if (!version) {
                this.logger.warn(`No version found in package.json for ${identifier}`);
                return;
            }

            const versionsDir = path.join(extensionPath, "data", "versions");
            await fs.ensureDir(versionsDir);

            const versionFile = path.join(versionsDir, version);
            await fs.writeFile(versionFile, new Date().toISOString());

            this.logger.log(`Extension ${identifier} version file written: ${version}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to write version file for ${identifier}: ${errorMessage}`);
            // Don't throw - this is not critical for installation
        }
    }

    /**
     * Enable extension and schedule restart
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    async enable(id: string) {
        const result = await this.extensionsService.enable(id);
        this.scheduleRestart();
        return result;
    }

    /**
     * Disable extension and schedule restart
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    async disable(id: string) {
        const result = await this.extensionsService.disable(id);
        this.scheduleRestart();
        return result;
    }

    /**
     * Schedule PM2 restart after response is sent
     * Uses debouncing to prevent multiple concurrent restart requests
     * Waits for heavy operations (install/upgrade) to complete before restarting
     * @private
     */
    private scheduleRestart(): void {
        // Check if restart is already scheduled
        if (ExtensionOperationService.restartScheduled) {
            this.logger.log("PM2 restart already scheduled, extending debounce timer...");

            // Clear existing timer and reschedule
            if (ExtensionOperationService.restartTimer) {
                clearTimeout(ExtensionOperationService.restartTimer);
            }
        } else {
            this.logger.log("Scheduling PM2 restart after response is sent...");
            ExtensionOperationService.restartScheduled = true;
        }

        // Schedule restart with debounce
        ExtensionOperationService.restartTimer = setTimeout(async () => {
            try {
                // Wait for heavy operations to complete before restarting
                await this.waitForHeavyOperations();

                this.logger.log("Executing scheduled PM2 restart...");
                await this.restartPm2Process();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to restart PM2 after scheduling: ${errorMessage}`);
            } finally {
                // Reset state after restart attempt
                ExtensionOperationService.restartScheduled = false;
                ExtensionOperationService.restartTimer = null;
            }
        }, ExtensionOperationService.RESTART_DEBOUNCE_MS);
    }

    /**
     * Wait for heavy operations (install/upgrade) to complete
     * Polls every second until no heavy lock exists
     * @private
     */
    private async waitForHeavyOperations(): Promise<void> {
        const maxWaitTime = 10 * 60 * 1000; // 10 minutes max wait
        const pollInterval = 1000; // 1 second
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const heavyLock = await this.getHeavyLock();
            if (!heavyLock) {
                return; // No heavy operation in progress, safe to restart
            }

            this.logger.log(
                `Waiting for heavy operation to complete: ${heavyLock.identifier} (${heavyLock.operation})`,
            );
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        this.logger.warn("Max wait time exceeded, proceeding with restart anyway");
    }

    /**
     * 扫描插件的会员功能配置并同步到数据库
     *
     * @param identifier 插件标识符
     * @param extensionId 插件ID
     * @private
     */
    private async scanExtensionMemberFeatures(
        identifier: string,
        extensionId: string,
    ): Promise<void> {
        try {
            // 通过 ModuleRef 获取 ExtensionFeatureScanService
            const featureScanService = this.moduleRef.get(ExtensionFeatureScanService, {
                strict: false,
            });

            if (!featureScanService) {
                this.logger.warn(
                    "ExtensionFeatureScanService not available, skipping feature scan",
                );
                return;
            }

            await featureScanService.scanAndSyncExtensionFeatures(identifier, extensionId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to scan member features for ${identifier}: ${errorMessage}`);
            // 不抛出错误，避免影响插件安装流程
        }
    }
}
