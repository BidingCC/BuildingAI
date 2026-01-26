import { AppConfig } from "@buildingai/config/app.config";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Menu } from "@buildingai/db/entities";
import {
    AgentSquareSeeder,
    AiModelSeeder,
    AiProviderSeeder,
    ExtensionSeeder,
    MembershipLevelsSeeder,
    MembershipPlansSeeder,
    MenuSeeder,
    PageSeeder,
    PayConfigSeeder,
    PermissionSeeder,
    RechargeCenterSeeder,
    SecretTemplateSeeder,
    SeedRunner,
    StorageConfigSeeder,
    WebsiteSeeder,
} from "@buildingai/db/seeds";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { DictService } from "@buildingai/dict";
import { TerminalLogger } from "@buildingai/logger";
import { isEnabled } from "@buildingai/utils";
import { SYSTEM_CONFIG } from "@common/constants";
import { PermissionService } from "@modules/permission/services/permission.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import fse from "fs-extra";
import { machineId } from "node-machine-id";
import * as path from "path";

import { ExtensionUpgradeOrchestratorService } from "../extension-upgrade/extension-upgrade-orchestrator.service";
import { VersionManagerService } from "./version-manager.service";

/**
 * Database initialization service
 *
 * Responsible for:
 * 1. Checking if system is installed
 * 2. Running initial database seeds
 * 3. Delegating upgrade logic to VersionManagerService
 * 4. Delegating extension upgrade logic to ExtensionUpgradeOrchestratorService
 */
@Injectable()
export class DatabaseInitService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseInitService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly permissionService: PermissionService,
        private readonly dictService: DictService,
        private readonly versionManagerService: VersionManagerService,
        private readonly extensionUpgradeOrchestrator: ExtensionUpgradeOrchestratorService,
        @InjectRepository(Menu)
        private readonly menuRepository: Repository<Menu>,
    ) {}

    /**
     * Executed automatically during module initialization
     */
    async onModuleInit() {
        this.logger.log("Checking database initialization status...");

        try {
            // Scan controllers for permission sync
            this.permissionService.scanControllers();

            // Check whether the system is already installed
            const isInstalled = await this.checkSystemInstalled();

            if (isInstalled) {
                this.logger.log("✅ System already installed, skipping initialization");

                // Delegate upgrade logic to VersionManagerService
                await this.versionManagerService.checkAndUpgrade();

                // Delegate extension upgrade logic to ExtensionUpgradeOrchestratorService
                await this.extensionUpgradeOrchestrator.checkAndUpgradeAll();
                return;
            }

            // System not installed, perform initial setup
            await this.performInitialSetup();
        } catch (error) {
            this.logger.error(`❌ Database initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Perform initial system setup
     */
    private async performInitialSetup(): Promise<void> {
        this.logger.log("🚀 Starting system initialization...");
        TerminalLogger.log("Database Init", "🚀 Starting system initialization...");

        // Synchronize database schema
        await this.dataSource.synchronize();

        // 1. Run independent seeders (no NestJS dependencies)
        await this.runIndependentSeeds();

        // 2. Run runtime seeders (NestJS dependencies)
        await this.runRuntimeSeeds();

        await this.initializeSpaLoadingIcon();

        // 3. Mark system as installed
        await this.markSystemAsInstalled();

        // 4. Write initial version file
        const currentVersion = await this.versionManagerService.getCurrentVersion();
        await this.writeVersionFile(currentVersion);

        this.logger.log("✅ Database initialization completed");
        TerminalLogger.success("Database Init", "Successful");
    }

    /**
     * Run independent seeders (no NestJS dependencies)
     */
    private async runIndependentSeeds(): Promise<void> {
        const runner = new SeedRunner(this.dataSource);

        await runner.run([
            new ExtensionSeeder(), // pgvector, zhparser extensions
            new PayConfigSeeder(), // Payment configuration
            new PageSeeder(), // Page configuration
            new AiProviderSeeder(), // AI providers
            new AiModelSeeder(), // AI models
            new SecretTemplateSeeder(), // Secret templates
            new MembershipLevelsSeeder(), // Membership levels
            new MembershipPlansSeeder(), // Membership plans
            new RechargeCenterSeeder(), // Recharge center configuration
            new AgentSquareSeeder(), // Agent square configuration
            new StorageConfigSeeder(), // OSS storage
            new WebsiteSeeder(), // Website default configuration
        ]);
    }

    /**
     * Run runtime seeders (with NestJS dependencies)
     */
    private async runRuntimeSeeds(): Promise<void> {
        // 1. Sync permissions (requires controller scanning)
        const permissionSeeder = new PermissionSeeder(this.permissionService);
        await permissionSeeder.run();

        // 2. Initialize menus (depends on permission data)
        const menuSeeder = new MenuSeeder(this.menuRepository, this.permissionService);
        await menuSeeder.run();
    }

    /**
     * Initialize SPA loading icon from source
     */
    private async initializeSpaLoadingIcon(): Promise<void> {
        try {
            const rootDir = path.join(process.cwd(), "..", "..");
            const sourcePath = path.join(rootDir, "public/web/spa-loading-source.png");
            const targetPath = path.join(rootDir, "public/web/spa-loading.png");

            if (await fse.pathExists(sourcePath)) {
                await fse.copy(sourcePath, targetPath, { overwrite: true });
                this.logger.log("✅ Initialized SPA loading icon");
            } else {
                this.logger.warn("⚠️ SPA loading source icon not found, skipping initialization");
            }
        } catch (e) {
            this.logger.error(`❌ Failed to initialize SPA loading icon: ${e.message}`);
        }
    }

    /**
     * 检查系统是否已安装
     *
     * 以数据库中的is_installed为唯一判断依据
     * 如果is_installed为true但.installed文件不存在，会自动创建文件
     *
     * @returns 系统是否已安装
     */
    private async checkSystemInstalled(): Promise<boolean> {
        try {
            // 先检查 config 表是否存在
            const tableExists = await this.checkConfigTableExists();
            if (!tableExists) {
                this.logger.log("config 表不存在，系统未安装");
                return false;
            }

            // 检查数据库中的安装标记
            let dbInstalled = false;
            try {
                // 尝试从字典表中获取安装状态
                const installStatus = await this.dictService.get(
                    "is_installed",
                    "false",
                    SYSTEM_CONFIG,
                );
                dbInstalled = isEnabled(installStatus);
            } catch (e) {
                // 如果查询失败，可能是表不存在，视为未安装
                this.logger.error("检查数据库安装状态失败", e);
                dbInstalled = false;
            }

            // 检查 .installed 文件是否存在
            const installFilePath = path.join(process.cwd(), "data", ".installed");
            const fileExists = await fse.pathExists(installFilePath);

            // 如果数据库标记为已安装，但.installed文件不存在，自动创建文件
            if (dbInstalled && !fileExists) {
                this.logger.log("📁 数据库标记为已安装，但.installed文件不存在，正在自动创建...");
                await this.createInstallFile();
                this.logger.log("✅ 已自动创建 .installed 文件");
            } else if (!dbInstalled && fileExists) {
                this.logger.log("⚠️ 数据库标记为未安装，但.installed文件存在，将以数据库状态为准");
            }

            // 仅以数据库标记为判断依据
            return dbInstalled;
        } catch (e) {
            // 出错时默认为未安装，确保安全
            this.logger.error("检查系统安装状态时出错", e);
            return false;
        }
    }

    /**
     * 检查 config 表是否存在
     */
    private async checkConfigTableExists(): Promise<boolean> {
        try {
            const result = await this.dataSource.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'config'
                );
            `);
            return result[0].exists;
        } catch (error) {
            this.logger.error("检查 config 表是否存在失败", error);
            return false;
        }
    }

    /**
     * 创建 .installed 文件
     *
     * 用于补全迁移场景下缺失的文件标记
     */
    private async createInstallFile(): Promise<void> {
        try {
            // 创建 data 目录（如果不存在）
            const dataDir = path.join(process.cwd(), "data");
            await fse.ensureDir(dataDir);

            // 创建 .installed 文件
            const installFilePath = path.join(dataDir, ".installed");
            const currentVersion = await this.versionManagerService.getCurrentVersion();

            await fse.writeFile(
                installFilePath,
                JSON.stringify(
                    {
                        installed_at: new Date().toISOString(),
                        version: currentVersion,
                        migration_auto_created: true, // 标记为迁移时自动创建
                    },
                    null,
                    2,
                ),
            );
        } catch (e) {
            this.logger.error(`创建 .installed 文件失败: ${e.message}`);
            // 不抛出异常，以免影响判断已安装状态
        }
    }

    /**
     * 标记系统为已安装
     *
     * 创建 .installed 文件并在数据库中设置安装标记
     */
    private async markSystemAsInstalled(): Promise<void> {
        try {
            // 创建 data 目录（如果不存在）
            const dataDir = path.join(process.cwd(), "data");
            await fse.ensureDir(dataDir);

            // 创建 .installed 文件
            const installFilePath = path.join(dataDir, ".installed");
            await fse.writeFile(
                installFilePath,
                JSON.stringify(
                    {
                        installed_at: new Date().toISOString(),
                        version: AppConfig.version, // Record current system version
                    },
                    null,
                    2,
                ),
            );

            // 在字典表中设置安装标记
            await this.dictService.set("is_installed", "true", {
                group: SYSTEM_CONFIG,
                description: "系统是否已完成初始化安装",
            });

            this.logger.log("✅ 系统已标记为已安装状态");
        } catch (e) {
            this.logger.error(`❌ 标记系统安装状态失败: ${e.message}`);
        }
    }

    /**
     * Write version file
     *
     * @param version Version number
     */
    private async writeVersionFile(version: string): Promise<void> {
        const versionsDir = path.join(process.cwd(), "data", "versions");
        await fse.ensureDir(versionsDir);

        const versionFilePath = path.join(versionsDir, version);
        await fse.writeFile(
            versionFilePath,
            JSON.stringify(
                {
                    version: version,
                    upgraded_at: new Date().toISOString(),
                    description: `System upgraded to version ${version}`,
                },
                null,
                2,
            ),
        );
    }
}
