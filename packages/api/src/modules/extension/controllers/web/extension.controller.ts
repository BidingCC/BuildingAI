import { BaseController } from "@buildingai/base";
import { DICT_GROUP_KEYS, DICT_KEYS } from "@buildingai/constants/server/dict-key.constant";
import { ExtensionsService, QueryExtensionDto } from "@buildingai/core/modules";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { WebController } from "@common/decorators/controller.decorator";
import { ExtensionMarketService } from "@modules/extension/services/extension-market.service";
import { Get, Query } from "@nestjs/common";

@WebController("extension")
export class ExtensionWebController extends BaseController {
    constructor(
        private readonly dictService: DictService,
        private readonly extensionsService: ExtensionsService,
        private readonly extensionMarketService: ExtensionMarketService,
    ) {
        super();
    }

    /**
     * 获取公开应用列表（公开接口）
     * @description 获取已启用的应用列表，无需登录
     */
    @Get()
    @Public()
    @BuildFileUrl(["**.icon"])
    async lists(@Query() query: QueryExtensionDto) {
        // Check if platform secret is configured
        const platformSecret = await this.dictService.get<string | null>(
            DICT_KEYS.PLATFORM_SECRET,
            null,
            DICT_GROUP_KEYS.APPLICATION,
        );

        let extensionsList;

        if (platformSecret) {
            // If platform secret is configured, fetch mixed list (local + market)
            extensionsList = await this.extensionMarketService.getMixedApplicationList();
        } else {
            // If no platform secret, only fetch local installed extensions
            const installedExtensions = await this.extensionsService.findAll();
            extensionsList = installedExtensions.map((ext) => ({
                ...ext,
                isInstalled: true,
            }));
        }

        // Extension filter conditions
        if (query.keyword) {
            const keyword = query.keyword.toLowerCase();
            extensionsList = extensionsList.filter(
                (ext) =>
                    ext.name.toLowerCase().includes(keyword) ||
                    ext.identifier.toLowerCase().includes(keyword),
            );
        }

        if (query.type !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.type === query.type);
        }

        if (query.isLocal !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.isLocal === query.isLocal);
        }

        // 默认只返回已启用且已安装的应用
        // status 可能是布尔值 true 或数字 1 (ExtensionStatus.ENABLED)
        extensionsList = extensionsList.filter(
            (ext) => (ext.status === true || ext.status === 1) && ext.isInstalled === true,
        );

        return this.paginationResult(extensionsList, extensionsList.length, query);
    }
}
