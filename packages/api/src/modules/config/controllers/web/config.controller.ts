import { BaseController } from "@buildingai/base";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { ChatConfigService } from "@modules/ai/chat/services/chat-config.service";
import { WebsiteService } from "@modules/system/services/website.service";
import { Get } from "@nestjs/common";

/**
 * 前台配置控制器
 *
 * 处理前台网站配置信息获取
 */
@WebController("config")
export class ConfigWebController extends BaseController {
    /**
     * 构造函数
     *
     * @param websiteService 网站配置服务
     * @param chatConfigService 对话配置服务
     */
    constructor(
        private readonly websiteService: WebsiteService,
        private readonly chatConfigService: ChatConfigService,
    ) {
        super();
    }

    /**
     * 获取网站基础配置信息（网站信息、版权信息、统计信息）
     *
     * @returns 网站基础配置信息
     */
    @Get()
    @BuildFileUrl(["**.logo", "**.icon", "***.iconUrl", "***.copyrightUrl"])
    @Public()
    async getConfig() {
        return await this.websiteService.getConfig();
    }

    /**
     * 获取协议配置信息
     *
     * @returns 协议配置信息
     */
    @Get("agreement")
    @Public()
    async getAgreement() {
        const fullConfig = await this.websiteService.getConfig();

        // 只返回 agreement 配置组
        return {
            agreement: fullConfig.agreement,
        };
    }

    /**
     * 获取对话配置信息
     *
     * @returns 对话配置信息
     */
    @Get("chat")
    @Public()
    async getChatConfig() {
        return await this.chatConfigService.getChatConfig();
    }
}
