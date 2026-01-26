import { BaseController } from "@buildingai/base";
import { DICT_GROUP_KEYS, DICT_KEYS } from "@buildingai/constants/server/dict-key.constant";
import {
    ExtensionStatus,
    type ExtensionStatusType,
    type ExtensionTypeType,
} from "@buildingai/constants/shared/extension.constant";
import {
    BatchUpdateExtensionStatusDto,
    CreateExtensionDto,
    ExtensionConfigService,
    ExtensionsService,
    PlatformInfo,
    QueryExtensionDto,
    UpdateExtensionDto,
} from "@buildingai/core/modules";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { maskSensitiveValue } from "@buildingai/utils";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { ExtensionFeatureScanService } from "@common/modules/auth/services/extension-feature-scan.service";
import {
    DownloadExtensionDto,
    SetPlatformSecretDto,
} from "@modules/extension/dto/extension-manager.dto";
import { ExtensionMarketService } from "@modules/extension/services/extension-market.service";
import { ExtensionOperationService } from "@modules/extension/services/extension-operation.service";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import * as fs from "fs-extra";
import * as path from "path";

/**
 * Extension Console Controller
 */
@ConsoleController("extensions", "拓展管理")
export class ExtensionConsoleController extends BaseController {
    constructor(
        private readonly extensionsService: ExtensionsService,
        private readonly extensionMarketService: ExtensionMarketService,
        private readonly extensionOperationService: ExtensionOperationService,
        private readonly extensionConfigService: ExtensionConfigService,
        private readonly dictService: DictService,
        private readonly extensionFeatureScanService: ExtensionFeatureScanService,
    ) {
        super();
    }

    /**
     * Get platform secret
     * @description Returns masked platform secret for security
     */
    @Get("platform-secret")
    @Permissions({
        code: "get-platform-secret",
        name: "获取平台密钥",
    })
    async getPlatformSecret() {
        const result: {
            platformSecret: string | null;
            platformInfo: PlatformInfo | null;
        } = {
            platformSecret: null,
            platformInfo: null,
        };

        const platformSecret = await this.dictService.get<string | null>(
            DICT_KEYS.PLATFORM_SECRET,
            null,
            DICT_GROUP_KEYS.APPLICATION,
        );

        if (platformSecret) {
            // Mask the platform secret for security
            result.platformSecret = maskSensitiveValue(platformSecret);

            const platformInfo = await this.extensionMarketService.getPlatformInfo();

            if (platformInfo) {
                result.platformInfo = platformInfo;
            }
        }

        return result;
    }

    /**
     * Set platform secret
     */
    @Post("platform-secret")
    @Permissions({
        code: "set-platform-secret",
        name: "设置平台密钥",
    })
    async setPlatformSecret(@Body() dto: SetPlatformSecretDto) {
        const platformSecret = dto.platformSecret || "";

        if (platformSecret) {
            const platformInfo = await this.extensionMarketService.getPlatformInfo(platformSecret);
            if (!platformInfo) {
                throw HttpErrorFactory.badRequest("密钥无效，请检查密钥是否正确");
            }
        }

        await this.dictService.set(DICT_KEYS.PLATFORM_SECRET, platformSecret, {
            group: DICT_GROUP_KEYS.APPLICATION,
            description: "BuildingAI platform secret",
        });

        return true;
    }

    /**
     * Install extension
     */
    @Post("install/:identifier")
    @Permissions({
        code: "install",
        name: "安装应用",
    })
    @BuildFileUrl(["**.icon"])
    async install(@Param("identifier") identifier: string, @Body() dto: DownloadExtensionDto) {
        return await this.extensionOperationService.install(
            identifier,
            dto.version,
            this.extensionMarketService,
        );
    }

    /**
     * Install application by activation code
     */
    @Post("install-by-activation-code/:activationCode")
    @Permissions({
        code: "install-by-activation-code",
        name: "通过兑换码安装应用",
    })
    async installByActivationCode(
        @Param("activationCode") activationCode: string,
        @Body() dto: DownloadExtensionDto,
    ) {
        return await this.extensionOperationService.installByActivationCode(
            activationCode,
            dto.identifier,
            dto.version,
            this.extensionMarketService,
        );
    }

    /**
     * upgrade content
     */
    @Get("upgrade-content/:identifier")
    @Permissions({
        code: "upgrade-content",
        name: "更新应用内容",
    })
    async upgradeContent(@Param("identifier") identifier: string) {
        return await this.extensionOperationService.upgradeContent(
            identifier,
            this.extensionMarketService,
        );
    }

    /**
     * Get application by activation code
     */
    @Get("get-by-activation-code/:activationCode")
    @Permissions({
        code: "get-by-activation-code",
        name: "通过兑换码获取应用信息",
    })
    @BuildFileUrl(["**.icon"])
    async getApplicationByActivationCode(@Param("activationCode") activationCode: string) {
        return await this.extensionMarketService.getApplicationByActivationCode(activationCode);
    }

    /**
     * Upgrade extension
     */
    @Post("upgrade/:identifier")
    @Permissions({
        code: "upgrade",
        name: "更新应用",
    })
    @BuildFileUrl(["**.icon"])
    async upgrade(@Param("identifier") identifier: string) {
        return await this.extensionOperationService.upgrade(
            identifier,
            this.extensionMarketService,
        );
    }

    /**
     * Uninstall extension
     *
     * @param identifier Extension identifier
     */
    @Delete("uninstall/:identifier")
    @Permissions({
        code: "uninstall",
        name: "卸载应用",
    })
    async uninstall(@Param("identifier") identifier: string) {
        await this.extensionOperationService.uninstall(identifier);
        return true;
    }

    /**
     * Create extension
     *
     * @param dto Create extension DTO
     * @returns Created extension
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建应用",
    })
    @BuildFileUrl(["**.icon", "**.author.avatar"])
    async create(@Body() dto: CreateExtensionDto) {
        const extension = await this.extensionOperationService.createFromTemplate(dto);

        // Sync author name to files
        if (dto.author?.name && extension.identifier) {
            await this.syncAuthorName(extension.identifier, dto.author.name);
        }

        return extension;
    }

    /**
     * Get extension paginated list
     *
     * @param query Query parameters
     * @returns Extension paginated list
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查看应用列表",
    })
    @BuildFileUrl(["**.icon", "**.avatar", "**.aliasIcon"])
    async lists(@Query() query: QueryExtensionDto) {
        // Get extension list (handles platformSecret check internally)
        const allExtensionsList = await this.extensionMarketService.getMixedApplicationList();

        // 统计全部、已安装、未安装的数量（在筛选之前统计）
        const statistics = {
            total: allExtensionsList.length,
            installed: allExtensionsList.filter((ext) => ext.isInstalled === true).length,
            uninstalled: allExtensionsList.filter((ext) => ext.isInstalled === false).length,
        };

        // Extension filter conditions
        let extensionsList = allExtensionsList;
        if (query.name) {
            extensionsList = extensionsList.filter((ext) =>
                ext.name.toLowerCase().includes(query.name.toLowerCase()),
            );
        }

        if (query.identifier) {
            extensionsList = extensionsList.filter((ext) =>
                ext.identifier.toLowerCase().includes(query.identifier.toLowerCase()),
            );
        }

        if (query.type !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.type === query.type);
        }

        if (query.status !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.status === query.status);
        }

        if (query.isLocal !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.isLocal === query.isLocal);
        }

        if (query.isInstalled !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.isInstalled === query.isInstalled);
        }

        extensionsList = extensionsList.sort(
            (a, b) =>
                new Date(b.createdAt || b.updatedAt || 0).getTime() -
                new Date(a.createdAt || a.updatedAt || 0).getTime(),
        );

        const result = this.paginationResult(extensionsList, extensionsList.length, query);
        return { ...result, extend: { statistics } };
    }

    /**
     * Get extension version list
     *
     * @param identifier Extension identifier
     * @returns Extension version list
     */
    @Get("versions/:identifier")
    @Permissions({
        code: "versions-list",
        name: "查看应用版本列表",
    })
    async versions(@Param("identifier") identifier: string) {
        let versions = await this.extensionMarketService.getApplicationVersions(identifier);

        return versions;
    }

    /**
     * Get all enabled extensions
     *
     * @returns List of enabled extensions
     */
    @Get("enabled/all")
    @Permissions({
        code: "enabled-all",
        name: "查看启用应用",
    })
    @BuildFileUrl(["**.icon"])
    async getAllEnabled() {
        return await this.extensionsService.findAllEnabled();
    }

    /**
     * Get all local development extensions
     *
     * @returns List of local extensions
     */
    @Get("local/all")
    @Permissions({
        code: "local-all",
        name: "查看本地应用",
    })
    @BuildFileUrl(["**.icon"])
    async getAllLocal() {
        return await this.extensionsService.findAllLocal();
    }

    /**
     * Get extensions by type
     *
     * @param type Extension type
     * @param onlyEnabled Whether to return only enabled extensions
     * @returns List of extensions
     */
    @Get("type/:type")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "list-by-type",
        name: "按类型查看应用",
    })
    async getByType(
        @Param("type") type: ExtensionTypeType,
        @Query("onlyEnabled") onlyEnabled?: boolean,
    ) {
        const enabled = onlyEnabled === undefined ? true : onlyEnabled === true;
        return await this.extensionsService.findByType(type, enabled);
    }

    /**
     * Get stored extension info by identifier
     *
     * @param identifier Extension identifier
     * @returns Extension details
     */
    @Get("detail/:identifier")
    @BuildFileUrl(["**.aliasIcon", "**.icon"])
    @Permissions({
        code: "detail-by-identifier-from-db",
        name: "查看入库应用详情",
    })
    async getDetailByIdentifier(@Param("identifier") identifier: string) {
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }
        return extension;
    }

    /**
     * Get extension by identifier
     *
     * @param identifier Extension identifier
     * @returns Extension details
     */
    @Get("identifier/:identifier")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "detail-by-identifier-from-market",
        name: "查看应用详情",
    })
    async getByIdentifier(@Param("identifier") identifier: string) {
        const extension = await this.extensionMarketService.getApplicationDetail(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }
        return extension;
    }

    /**
     * Check if extension identifier exists
     *
     * @param identifier Extension identifier
     * @param excludeId Excluded extension ID (for update check)
     * @returns Whether it exists
     */
    @Get("check-identifier/:identifier")
    @Permissions({
        code: "check-identifier",
        name: "检查应用标识符",
    })
    async checkIdentifier(
        @Param("identifier") identifier: string,
        @Query("excludeId") excludeId?: string,
    ) {
        const exists = await this.extensionsService.isIdentifierExists(identifier, excludeId);
        return { exists };
    }

    /**
     * 获取插件功能列表
     *
     * @param identifier 插件标识符
     * @returns 功能列表
     */
    @Get("features/:identifier")
    @Permissions({
        code: "get-features",
        name: "获取插件功能列表",
    })
    async getFeatures(@Param("identifier") identifier: string) {
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }

        return await this.extensionFeatureScanService.getExtensionFeatures(extension.id);
    }

    /**
     * 更新功能的会员等级配置
     *
     * @param featureId 功能ID
     * @param levelIds 会员等级ID列表
     * @returns 更新后的功能
     */
    @Patch("features/:featureId/levels")
    @Permissions({
        code: "update-feature-levels",
        name: "更新功能会员等级",
    })
    async updateFeatureLevels(
        @Param("featureId") featureId: string,
        @Body("levelIds") levelIds: string[],
    ) {
        return await this.extensionFeatureScanService.updateFeatureMembershipLevels(
            featureId,
            levelIds,
        );
    }

    /**
     * Get single extension details
     *
     * @param id Extension ID
     * @returns Extension details
     */
    @Get(":id")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "detail",
        name: "查看应用详情",
    })
    async findOne(@Param("id") id: string) {
        const extension = await this.extensionsService.findOneById(id);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }
        return extension;
    }

    /**
     * Batch update extension status
     *
     * @param dto Batch update status DTO
     * @returns Number of updated extensions
     */
    @Patch("batch-status")
    @Permissions({
        code: "batch-status",
        name: "批量更新应用状态",
    })
    async batchUpdateStatus(@Body() dto: BatchUpdateExtensionStatusDto) {
        const count = await this.extensionsService.batchUpdateStatus(dto.ids, dto.status);
        return {
            message: `Successfully updated status of ${count} extensions`,
            count,
        };
    }

    /**
     * Update extension
     *
     * @param id Extension ID
     * @param dto Update extension DTO
     * @returns Updated extension
     */
    @Patch(":id")
    @BuildFileUrl(["**.icon", "**.author.avatar", "++.aliasIcon"])
    @Permissions({
        code: "update",
        name: "更新应用",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateExtensionDto) {
        const extension = await this.extensionsService.findOneById(id);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension not found");
        }

        const updatedExtension = await this.extensionsService.updateById(id, dto);

        // Sync author name to files if author name is updated
        if (dto.author?.name && extension.identifier) {
            await this.syncAuthorName(extension.identifier, dto.author.name);
        }

        return updatedExtension;
    }

    /**
     * Sync author name to extensions.json, manifest.json and package.json
     * @private
     */
    private async syncAuthorName(identifier: string, authorName: string): Promise<void> {
        try {
            await Promise.all([
                this.extensionConfigService.updateAuthorName(identifier, authorName),
                this.extensionOperationService.updateAuthorName(identifier, authorName),
            ]);
        } catch (error) {
            console.error(`Failed to sync author name for ${identifier}:`, error);
        }
    }

    /**
     * Enable extension
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    @Patch(":id/enable")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "enable",
        name: "启用应用",
    })
    async enable(@Param("id") id: string) {
        return await this.extensionOperationService.enable(id);
    }

    /**
     * Disable extension
     *
     * @param id Extension ID
     * @returns Updated extension
     */
    @Patch(":id/disable")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "disable",
        name: "禁用应用",
    })
    async disable(@Param("id") id: string) {
        return await this.extensionOperationService.disable(id);
    }

    /**
     * Set extension status
     *
     * @param id Extension ID
     * @param status Extension status
     * @returns Updated extension
     */
    @Patch(":id/status")
    @BuildFileUrl(["**.icon"])
    @Permissions({
        code: "set-status",
        name: "设置应用状态",
    })
    async setStatus(@Param("id") id: string, @Body("status") status: ExtensionStatusType) {
        if (!Object.values(ExtensionStatus).includes(status)) {
            throw HttpErrorFactory.paramError("Invalid extension status");
        }
        return await this.extensionsService.setStatus(id, status);
    }

    /**
     * Delete extension
     *
     * @param id Extension ID
     * @returns Deletion result
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除应用",
    })
    async remove(@Param("id") id: string) {
        await this.extensionsService.delete(id);
        return { message: "Extension deleted successfully" };
    }

    /**
     * Batch delete extensions
     *
     * @param ids Array of extension IDs
     * @returns Deletion result
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "批量删除应用",
    })
    async removeMany(@Body("ids") ids: string[]) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw HttpErrorFactory.paramError("Parameter ids must be a non-empty array");
        }
        const deleted = await this.extensionsService.deleteMany(ids);
        return {
            message: `Successfully deleted ${deleted} extensions`,
            deleted,
        };
    }

    /**
     * 同步插件会员功能配置
     *
     * 扫描插件代码中的 @MemberOnly 装饰器，并将功能配置同步到数据库
     *
     * @param identifier 插件标识符
     * @returns 同步结果
     */
    @Post("sync-member-features/:identifier")
    @Permissions({
        code: "sync-member-features",
        name: "同步会员功能",
    })
    async syncMemberFeatures(@Param("identifier") identifier: string) {
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }

        const result = await this.extensionFeatureScanService.scanAndSyncExtensionFeatures(
            identifier,
            extension.id,
        );

        return {
            message: `同步完成: 新增 ${result.added} 个, 更新 ${result.updated} 个, 移除 ${result.removed} 个`,
            ...result,
        };
    }

    /**
     * Get extension plugin layout configuration
     * @description Returns router.options (consoleMenu) and manifest.json for plugin layout
     * @param identifier Extension identifier
     * @returns Plugin layout configuration
     */
    @Get(":identifier/plugin-layout")
    @Permissions({
        code: "get-plugin-layout",
        name: "获取插件布局配置",
    })
    async getPluginLayout(@Param("identifier") identifier: string) {
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }

        const rootDir = path.join(process.cwd(), "..", "..");
        const extensionDir = path.join(rootDir, "extensions", identifier);

        if (!(await fs.pathExists(extensionDir))) {
            throw HttpErrorFactory.notFound("Extension directory does not exist");
        }

        // Read manifest.json - return as object directly
        const manifestPath = path.join(extensionDir, "manifest.json");
        let manifest = null;
        if (await fs.pathExists(manifestPath)) {
            manifest = await fs.readJson(manifestPath);
        }

        // Try to load consoleMenu from compiled router.options.js first
        let consoleMenu = null;
        const routerOptionsBuildPath = path.join(extensionDir, "build", "web", "router.options.js");
        const routerOptionsSourcePath = path.join(extensionDir, "src", "web", "router.options.ts");

        // Try to load from build output first (if exists)
        if (await fs.pathExists(routerOptionsBuildPath)) {
            try {
                // Clear require cache to ensure fresh load
                delete require.cache[require.resolve(routerOptionsBuildPath)];
                const routerOptionsModule = require(routerOptionsBuildPath);
                consoleMenu = routerOptionsModule.consoleMenu || null;
            } catch (error) {
                // If require fails, fall back to parsing source file
                console.warn(`Failed to load router.options.js: ${error}`);
            }
        }

        // If build file doesn't exist or load failed, parse source TypeScript file
        if (!consoleMenu && (await fs.pathExists(routerOptionsSourcePath))) {
            try {
                const content = await fs.readFile(routerOptionsSourcePath, "utf-8");

                // Extract consoleMenu array using regex
                const match = content.match(
                    /export\s+(?:const|let)\s+consoleMenu[^=]*=\s*(\[[\s\S]*?\]);/,
                );

                if (match && match[1]) {
                    // Remove comments
                    let arrayContent = match[1]
                        .replace(/\/\*[\s\S]*?\*\//g, "")
                        .replace(/\/\/.*$/gm, "");

                    // Replace import() calls with null (we don't need component functions in backend)
                    arrayContent = arrayContent.replace(/\(\)\s*=>\s*import\([^)]+\)/g, "null");

                    // Parse the array
                    try {
                        consoleMenu = new Function(`return ${arrayContent}`)();
                    } catch (parseError) {
                        console.warn("Failed to parse consoleMenu:", parseError);
                    }
                }
            } catch (error) {
                console.warn(`Failed to read router.options.ts: ${error}`);
            }
        }

        return {
            manifest,
            consoleMenu,
        };
    }
}
