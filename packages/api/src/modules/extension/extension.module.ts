import { getCachedExtensionList, loadExtensionModule } from "@buildingai/core/modules";
import {
    ExtensionConfigService,
    ExtensionSchemaService,
    ExtensionsService,
    UploadModule,
} from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Extension } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { TerminalLogger } from "@buildingai/logger";
import { ExtensionFeatureScanService } from "@common/modules/auth/services/extension-feature-scan.service";
import { DynamicModule, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

import { AuthModule } from "../auth/auth.module";
import { Pm2Module } from "../pm2/pm2.module";
import { ExtensionConsoleController } from "./controllers/console/extension.controller";
import { ExtensionWebController } from "./controllers/web/extension.controller";
import { ExtensionMarketService } from "./services/extension-market.service";
import { ExtensionOperationService } from "./services/extension-operation.service";
import { ExtensionSeedService } from "./services/extension-seed.service";

@Module({
    imports: [],
    providers: [],
    exports: [],
})
export class ExtensionCoreModule implements OnModuleInit {
    static async register(): Promise<DynamicModule> {
        const loadedExtensions: DynamicModule[] = [];

        const extensionList = getCachedExtensionList();

        if (extensionList.length === 0) {
            TerminalLogger.info("Extensions", "No enabled extensions found");
        } else {
            TerminalLogger.info(
                "Extensions",
                `Found ${extensionList.length} enabled extension(s): ${extensionList.map((e) => e.name).join(", ")}`,
            );

            for (const extensionInfo of extensionList) {
                const extensionModule = await loadExtensionModule(extensionInfo);
                if (extensionModule) {
                    loadedExtensions.push(extensionModule);
                }
            }
        }

        return {
            module: ExtensionCoreModule,
            imports: [
                AuthModule,
                Pm2Module,
                UploadModule,
                TypeOrmModule.forFeature([Extension]),
                ...loadedExtensions,
            ],
            providers: [
                ExtensionConfigService,
                ExtensionSchemaService,
                ExtensionsService,
                ExtensionMarketService,
                ExtensionOperationService,
                ExtensionSeedService,
            ],
            controllers: [ExtensionConsoleController, ExtensionWebController],
            exports: [],
        };
    }

    private readonly logger = new Logger(ExtensionCoreModule.name);

    constructor(private readonly moduleRef: ModuleRef) {}

    /**
     * Execute initialization tasks on module init
     * - Clean extension operation locks
     * - Execute seeds for newly installed extensions
     * - Sync extension member features (incremental update)
     *
     * Called after all modules are initialized
     */
    async onModuleInit() {
        // Clean extension operation locks on startup
        await ExtensionOperationService.cleanAllLocks();

        const extensionList = getCachedExtensionList();
        if (extensionList.length === 0) {
            return;
        }

        // Get DataSource from the module
        const dataSource = this.moduleRef.get(DataSource, { strict: false });
        const seedService = new ExtensionSeedService(dataSource);

        await seedService.executeNewExtensionSeeds(extensionList);

        // Sync extension member features (incremental update)
        await this.syncAllExtensionFeatures(extensionList);
    }

    /**
     * 同步所有已启用插件的会员功能
     *
     * 增量更新逻辑：
     * - 扫描到的功能如果数据库没有，则新增
     * - 扫描到的功能如果数据库有，则更新名称和描述
     * - 数据库有但扫描不到的功能，则删除
     *
     * @param extensionList 已启用的插件列表
     */
    private async syncAllExtensionFeatures(
        extensionList: { identifier: string; name: string }[],
    ): Promise<void> {
        try {
            const extensionsService = this.moduleRef.get(ExtensionsService, { strict: false });
            const featureScanService = this.moduleRef.get(ExtensionFeatureScanService, {
                strict: false,
            });

            this.logger.log("开始同步插件会员功能...");

            for (const extensionInfo of extensionList) {
                try {
                    // 从数据库获取插件记录以获取 extensionId
                    const extension = await extensionsService.findByIdentifier(
                        extensionInfo.identifier,
                    );

                    if (!extension) {
                        this.logger.warn(
                            `插件 ${extensionInfo.identifier} 未在数据库中找到，跳过功能同步`,
                        );
                        continue;
                    }

                    const result = await featureScanService.scanAndSyncExtensionFeatures(
                        extensionInfo.identifier,
                        extension.id,
                    );

                    if (result.added > 0 || result.updated > 0 || result.removed > 0) {
                        this.logger.log(
                            `插件 ${extensionInfo.identifier} 功能同步完成: 新增 ${result.added}, 更新 ${result.updated}, 删除 ${result.removed}`,
                        );
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.logger.error(
                        `同步插件 ${extensionInfo.identifier} 功能失败: ${errorMessage}`,
                    );
                    // 不抛出错误，继续处理其他插件
                }
            }

            this.logger.log("插件会员功能同步完成");
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`同步插件会员功能失败: ${errorMessage}`);
            // 不抛出错误，避免影响应用启动
        }
    }
}
