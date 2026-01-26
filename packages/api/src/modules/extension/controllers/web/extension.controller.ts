import { BaseController } from "@buildingai/base";
import { DICT_GROUP_KEYS, DICT_KEYS } from "@buildingai/constants/server/dict-key.constant";
import { ExtensionsService, QueryExtensionDto } from "@buildingai/core/modules";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { ExtensionMarketService } from "@modules/extension/services/extension-market.service";
import { Get, Param, Query } from "@nestjs/common";

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
     * Get stored extension info by identifier
     *
     * @param identifier Extension identifier
     * @returns Extension details
     */
    @Get("detail/:identifier")
    @BuildFileUrl(["**.aliasIcon", "**.icon"])
    @Public()
    async getDetailByIdentifier(@Param("identifier") identifier: string) {
        const extension = await this.extensionsService.findByIdentifier(identifier);
        if (!extension) {
            throw HttpErrorFactory.notFound("Extension does not exist");
        }
        return extension;
    }

    /**
     * 获取公开应用列表（公开接口）
     * @description 获取已启用的应用列表，无需登录
     */
    @Get()
    @Public()
    @BuildFileUrl(["**.icon", "**.aliasIcon"])
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
            extensionsList = await this.extensionsService.findAll();
        }

        // Extension filter conditions
        if (query.name) {
            const keyword = query.name.toLowerCase();
            extensionsList = extensionsList.filter((ext) => {
                const alias = ext.alias?.toLowerCase();
                const name = ext.name?.toLowerCase();
                return alias?.includes(keyword) || name?.includes(keyword);
            });
        }

        if (query.identifier) {
            extensionsList = extensionsList.filter((ext) =>
                ext.identifier.toLowerCase().includes(query.identifier.toLowerCase()),
            );
        }

        if (query.type !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.type === query.type);
        }

        if (query.isLocal !== undefined) {
            extensionsList = extensionsList.filter((ext) => ext.isLocal === query.isLocal);
        }

        // 默认只返回已启用且已安装的应用
        extensionsList = extensionsList.filter((ext) => ext.status === 1 && ext.aliasShow === true);

        return this.paginationResult(extensionsList, extensionsList.length, query);
    }
}
