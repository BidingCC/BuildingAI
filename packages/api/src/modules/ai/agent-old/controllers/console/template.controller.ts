import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Post, Query } from "@nestjs/common";

// 已移除 ImportAgentDto 导入，使用 DSL 专用 DTO
import {
    AgentTemplateDto,
    BatchImportAgentDslDto,
    CreateAgentFromTemplateDto,
    ImportAgentDslDto,
    QueryTemplateDto,
} from "../../dto/template";
import { AiAgentService } from "../../services/ai-agent.service";
import { AiAgentTemplateService } from "../../services/ai-agent-template.service";

/**
 * 智能体模板控制器
 *
 * 负责处理智能体模板相关的所有操作，包括：
 * - 智能体导入导出功能
 * - 模板管理功能
 * - 从模板创建智能体
 */
@ConsoleController("ai-agent-template", "智能体模板")
export class AiAgentTemplateController {
    constructor(
        private readonly AiAgentService: AiAgentService,
        private readonly AiAgentTemplateService: AiAgentTemplateService,
    ) {}

    // ========== 智能体导入导出相关接口 ==========

    /**
     * 导出智能体 DSL 配置
     * 将智能体配置导出为 DSL（Domain Specific Language）格式文件
     *
     * @param id 智能体ID
     * @param format 导出格式（yaml 或 json）
     * @returns DSL 格式的智能体配置
     */
    @Get("export-dsl")
    @Permissions({
        code: "export-dsl",
        name: "导出智能体 DSL 配置",
    })
    async exportAgentDsl(
        @Query("id") id: string,
        @Query("format") format: "yaml" | "json" = "yaml",
    ) {
        if (!id) {
            throw new Error("智能体ID不能为空");
        }
        return this.AiAgentTemplateService.exportAgentDsl(id, format);
    }

    /**
     * 导入智能体 DSL 配置
     * 从 DSL 格式文件导入智能体配置
     *
     * @param dto 导入 DSL 配置DTO
     * @param user 当前用户信息
     * @returns 导入结果
     */
    @Post("import-dsl")
    @Permissions({
        code: "import-dsl",
        name: "导入智能体 DSL 配置",
    })
    async importAgentDsl(@Body() dto: ImportAgentDslDto, @Playground() user: UserPlayground) {
        // 添加创建者ID
        dto.createBy = user.id;
        const importDto = await this.AiAgentTemplateService.importAgentDsl(dto);

        // 创建智能体（importDto 是动态对象，与 CreateAgentDto 兼容）
        const agent = await this.AiAgentService.createAgentFromTemplate(importDto, user);

        // 自动发布智能体
        await this.AiAgentService.publishAgent(agent.id, {
            publishConfig: {
                allowOrigins: [],
                rateLimitPerMinute: 60,
                showBranding: true,
                allowDownloadHistory: false,
            },
        });

        return agent;
    }

    /**
     * 批量导入智能体 DSL 配置
     * 从多个 DSL 格式文件批量导入智能体配置
     *
     * @param dto 批量导入 DSL 配置DTO
     * @param user 当前用户信息
     * @returns 批量导入结果
     */
    @Post("batch-import-dsl")
    @Permissions({
        code: "import-dsl",
        name: "批量导入智能体 DSL 配置",
    })
    async batchImportAgentDsl(
        @Body() dto: BatchImportAgentDslDto,
        @Playground() user: UserPlayground,
    ) {
        // 添加创建者ID
        dto.createBy = user.id;
        return await this.AiAgentTemplateService.batchImportAgentDsl(dto, user);
    }

    // ========== 模板管理相关接口 ==========

    /**
     * 获取智能体模板列表
     *
     * @param query 查询参数
     * @returns 智能体模板列表
     */
    @Get("templates")
    @BuildFileUrl(["**.avatar"])
    @Permissions({
        code: "list-templates",
        name: "查询智能体模板",
    })
    async getTemplates(@Query() query: QueryTemplateDto): Promise<AgentTemplateDto[]> {
        return this.AiAgentTemplateService.getTemplateList(query);
    }

    /**
     * 获取模板分类列表
     *
     * @returns 模板分类列表
     */
    @Get("templates/categories")
    @Permissions({
        code: "list-template-categories",
        name: "查询模板分类",
    })
    async getTemplateCategories(): Promise<string[]> {
        return this.AiAgentTemplateService.getTemplateCategories();
    }

    /**
     * 获取推荐模板
     *
     * @returns 推荐模板列表
     */
    @Get("templates/recommended")
    @BuildFileUrl(["**.avatar"])
    @Permissions({
        code: "list-recommended-templates",
        name: "查询推荐模板",
    })
    async getRecommendedTemplates(): Promise<AgentTemplateDto[]> {
        return this.AiAgentTemplateService.getRecommendedTemplates();
    }

    /**
     * 从模板创建智能体
     *
     * @param dto 从模板创建智能体DTO
     * @param user 当前用户信息
     * @returns 创建的智能体信息
     */
    @Post("templates/create")
    @Permissions({
        code: "create-from-template",
        name: "从模板创建智能体",
    })
    async createFromTemplate(
        @Body() dto: CreateAgentFromTemplateDto,
        @Playground() user: UserPlayground,
    ) {
        const createAgentDto = await this.AiAgentTemplateService.createAgentFromTemplate(dto);

        // 添加创建者ID
        createAgentDto.createBy = user.id;

        const agent = await this.AiAgentService.createAgentFromTemplate(
            createAgentDto as CreateAgentFromTemplateDto,
            user,
        );

        // 自动发布智能体
        await this.AiAgentService.publishAgent(agent.id, {
            publishConfig: {
                allowOrigins: [],
                rateLimitPerMinute: 60,
                showBranding: true,
                allowDownloadHistory: false,
            },
        });

        return agent;
    }
}
