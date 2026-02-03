import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import {
    AgentChatDto,
    CreateAgentDto,
    PublishAgentDto,
    QueryAgentDto,
    QueryAgentStatisticsDto,
    UpdateAgentConfigDto,
} from "../../dto/agent";
import { AgentTagsDto } from "../../dto/agent/update-agent-tags.dto";
import { NoBillingStrategy } from "../../interfaces/billing-strategy.interface";
import { AiAgentService } from "../../services/ai-agent.service";
import { AiAgentChatService } from "../../services/ai-agent-chat.service";

@ConsoleController("ai-agent", "智能体")
export class AiAgentConsoleController {
    constructor(
        private readonly AiAgentService: AiAgentService,
        private readonly AiAgentChatService: AiAgentChatService,
    ) {}

    // ========== 智能体管理相关接口 ==========

    /**
     * 创建智能体
     *
     * @param dto 创建智能体DTO
     * @param user 当前用户信息
     * @returns 创建的智能体信息
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建智能体",
    })
    async create(@Body() dto: CreateAgentDto, @Playground() user: UserPlayground) {
        // 添加创建者ID
        dto.createBy = user.id;

        // 创建智能体
        const agent = await this.AiAgentService.createAgent(dto, user);

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
     * 获取智能体列表
     *
     * 支持关键词搜索智能体名称和描述
     *
     * @param dto 查询参数
     * @param user 当前用户信息
     * @returns 智能体列表和分页信息
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询智能体列表",
    })
    @BuildFileUrl(["**.avatar"])
    async list(@Query() dto: QueryAgentDto) {
        return this.AiAgentService.getAgentList(dto);
    }

    /**
     * 获取智能体详情
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 智能体详细信息
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看智能体详情",
    })
    @BuildFileUrl(["**.avatar"])
    async detail(@Param("id") id: string) {
        return this.AiAgentService.getAgentDetail(id);
    }

    /**
     * 获取智能体文件上传配置
     * 对于 Dify 智能体，从 Dify 平台获取文件上传配置
     *
     * @param id 智能体ID
     * @returns 文件上传配置
     */
    @Get(":id/file-upload-config")
    @Permissions({
        code: "detail",
        name: "查看智能体详情",
    })
    async getFileUploadConfig(@Param("id") id: string) {
        return this.AiAgentService.getAgentFileUploadConfig(id);
    }

    /**
     * 更新智能体配置
     *
     * @param id 智能体ID
     * @param dto 更新配置DTO
     * @param user 当前用户信息
     * @returns 更新后的智能体信息
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新智能体",
    })
    async updateConfig(@Param("id") id: string, @Body() dto: UpdateAgentConfigDto) {
        return this.AiAgentService.updateAgentConfig(id, dto);
    }

    /**
     * 智能体对话
     *
     * 支持表单变量、模型配置、知识库检索等完整功能
     *
     * @param id 智能体ID
     * @param dto 对话DTO
     * @param user 当前用户信息
     * @returns 对话响应结果
     */
    @Post(":id/chat")
    @Permissions({
        code: "chat",
        name: "智能体对话",
    })
    async chat(
        @Param("id") id: string,
        @Body() dto: AgentChatDto,
        @Playground() user: UserPlayground,
    ) {
        return this.AiAgentChatService.handleChat(
            id,
            dto,
            user,
            "blocking",
            new NoBillingStrategy(),
        );
    }

    /**
     * 智能体流式对话
     *
     * 支持SSE流式响应，表单变量、模型配置、知识库检索等完整功能
     *
     * @param id 智能体ID
     * @param dto 对话DTO
     * @param user 当前用户信息
     * @param res 响应对象
     */
    @Post(":id/chat/stream")
    @Permissions({
        code: "chat-stream",
        name: "智能体流式对话",
    })
    async chatStream(
        @Param("id") id: string,
        @Body() dto: AgentChatDto,
        @Playground() user: UserPlayground,
        @Res() res: Response,
    ) {
        return this.AiAgentChatService.handleChat(
            id,
            dto,
            user,
            "streaming",
            new NoBillingStrategy(),
            res,
        );
    }

    /**
     * 获取智能体统计信息
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 智能体统计数据
     */
    @Get(":id/statistics")
    @Permissions({
        code: "statistics",
        name: "查看智能体统计",
    })
    async getStatistics(@Param("id") id: string, @Query() dto: QueryAgentStatisticsDto) {
        return this.AiAgentService.getAgentStatistics(id, dto);
    }

    /**
     * 删除智能体
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 删除结果
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除智能体",
    })
    async delete(@Param("id") id: string) {
        await this.AiAgentService.deleteAgent(id);
        return { message: "智能体删除成功" };
    }

    // ========== 发布管理相关接口 ==========

    /**
     * 发布智能体
     *
     * @param id 智能体ID
     * @param dto 发布配置DTO
     * @param user 当前用户信息
     * @returns 发布结果，包含访问令牌和嵌入代码
     */
    @Post(":id/publish")
    @Permissions({
        code: "publish",
        name: "发布智能体",
    })
    async publish(@Param("id") id: string, @Body() dto: PublishAgentDto) {
        return this.AiAgentService.publishAgent(id, dto);
    }

    /**
     * 取消发布智能体
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 取消发布结果
     */
    @Post(":id/unpublish")
    @Permissions({
        code: "unpublish",
        name: "取消发布智能体",
    })
    async unpublish(@Param("id") id: string) {
        await this.AiAgentService.unpublishAgent(id);
        return { message: "智能体取消发布成功" };
    }

    /**
     * 重新生成API密钥
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 新的API密钥
     */
    @Post(":id/regenerate-api-key")
    @Permissions({
        code: "regenerate-api-key",
        name: "重新生成API密钥",
    })
    async regenerateApiKey(@Param("id") id: string) {
        return this.AiAgentService.regenerateApiKey(id);
    }

    /**
     * 获取嵌入代码
     *
     * @param id 智能体ID
     * @param user 当前用户信息
     * @returns 嵌入代码和发布链接
     */
    @Get(":id/embed-code")
    @Permissions({
        code: "embed-code",
        name: "获取嵌入代码",
    })
    async getEmbedCode(@Param("id") id: string) {
        return this.AiAgentService.getEmbedCode(id);
    }

    // ========== 标签管理 ==========

    /**
     * 批量添加标签到智能体
     *
     * @param id 智能体ID
     * @param dto 标签ID数组
     * @returns 更新后的智能体
     */
    @Post(":id/tags")
    @Permissions({
        code: "tags:add",
        name: "添加智能体标签",
    })
    async addTags(@Param("id") id: string, @Body() dto: AgentTagsDto) {
        return this.AiAgentService.addAgentTags(id, dto.tagIds);
    }

    /**
     * 批量移除智能体标签
     *
     * @param id 智能体ID
     * @param dto 标签ID数组
     * @returns 更新后的智能体
     */
    @Delete(":id/tags")
    @Permissions({
        code: "tags:remove",
        name: "移除智能体标签",
    })
    async removeTags(@Param("id") id: string, @Body() dto: AgentTagsDto) {
        return this.AiAgentService.removeAgentTags(id, dto.tagIds);
    }
}
