import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { PublicAccessTokenGuard } from "@common/guards/public-access-token.guard";
import { MembershipValidationCommandHandler } from "@modules/ai/chat/handlers";
import { Body, Delete, Get, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { AgentChatDto } from "../../dto/agent";
import { CreateAgentAnnotationDto, UpdateAgentAnnotationDto } from "../../dto/annotation";
import {
    CreatorBillingStrategy,
    SmartUserBillingStrategy,
    UserBillingStrategy,
} from "../../interfaces/billing-strategy.interface";
import { AiAgentService } from "../../services/ai-agent.service";
import { AiAgentAnnotationService } from "../../services/ai-agent-annotation.service";
import { AiAgentChatService } from "../../services/ai-agent-chat.service";
import { AiAgentPublicChatService } from "../../services/ai-agent-v1-chat.service";

/**
 * V1 API 控制器
 * 提供标准化的 AI Agent API 接口
 */
@ConsoleController("v1", "V1 API")
export class AiAgentV1Controller {
    constructor(
        @InjectRepository(AiModel)
        private readonly aiModelRepository: Repository<AiModel>,
        private readonly AiAgentService: AiAgentService,
        private readonly AiAgentChatService: AiAgentChatService,
        private readonly AiAgentPublicChatService: AiAgentPublicChatService,
        private readonly annotationService: AiAgentAnnotationService,
        private readonly membershipValidationHandler: MembershipValidationCommandHandler,
    ) {}

    /**
     * 获取智能体信息
     *
     * @param publishToken 发布令牌
     * @returns 智能体基本信息
     */
    @Get(":publishToken/info")
    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    @Public()
    async getAgentInfo(@Param("publishToken") publishToken: string) {
        return this.AiAgentService.getPublicAgentByToken(publishToken);
    }

    /**
     * 生成访问令牌
     *
     * @param publishToken 发布令牌
     * @returns 访问令牌信息
     */
    @Post(":publishToken/generate-access-token")
    @Public()
    async generateAccessToken(@Param("publishToken") publishToken: string) {
        return this.AiAgentPublicChatService.generateAccessToken(publishToken);
    }

    /**
     * 统一对话接口
     * 支持流式和阻塞两种模式
     *
     * @param publishToken 发布令牌
     * @param dto 对话DTO
     * @param res 响应对象
     * @param req 请求对象
     */
    @Post(":publishToken/chat")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async chat(
        @Param("publishToken") publishToken: string,
        @Body() dto: AgentChatDto,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        const agent = await this.AiAgentPublicChatService.getAgentByPublishToken(publishToken);
        await this.AiAgentPublicChatService.checkRateLimit(agent);

        const agentChatDto = this.AiAgentPublicChatService.convertToAgentChatDto(dto, agent);
        const user = this.AiAgentPublicChatService.createEnhancedUser(req.accessToken, req.user);

        // 根据扣费模式选择计费策略
        const billingStrategy =
            dto.billingMode === "creator"
                ? new CreatorBillingStrategy()
                : dto.billingMode === "user"
                  ? new UserBillingStrategy()
                  : new SmartUserBillingStrategy();

        // 第三方集成智能体不需要配置模型，跳过模型检查
        const isThirdPartyAgent = agent.createMode && agent.createMode !== "direct";
        if (!isThirdPartyAgent) {
            const modelId = agentChatDto.modelConfig?.id;
            if (!modelId) {
                throw HttpErrorFactory.badRequest("智能体需要配置模型");
            }

            const model = await this.aiModelRepository.findOne({
                where: { id: modelId },
                relations: ["provider"],
            });

            if (!model) {
                throw HttpErrorFactory.notFound("Model not found.");
            }

            const membershipUserId = (req.user as { id?: string } | undefined)?.id ?? "anonymous";
            await this.membershipValidationHandler.validateModelAccessOrThrow(
                membershipUserId,
                model,
            );
        }

        try {
            if (dto.responseMode === "streaming") {
                // 流式响应
                return await this.AiAgentChatService.handleChat(
                    agent.id,
                    agentChatDto,
                    user,
                    "streaming",
                    billingStrategy,
                    res,
                );
            } else {
                // 阻塞响应
                const result = await this.AiAgentChatService.handleChat(
                    agent.id,
                    agentChatDto,
                    user,
                    "blocking",
                    billingStrategy,
                );
                return res.json(result);
            }
        } catch (error) {
            throw HttpErrorFactory.business(error.message);
        }
    }

    /**
     * API认证方式对话
     *
     * @param dto 对话DTO
     * @param res 响应对象
     * @param req 请求对象
     */
    @Post("chat")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async apiChat(@Body() dto: AgentChatDto, @Res() res: Response, @Req() req: Request) {
        const { responseMode = "streaming" } = dto;

        if (!req.accessToken) {
            throw HttpErrorFactory.unauthorized("API密钥不能为空");
        }

        const agent = await this.AiAgentService.getAgentByApiKey(req.accessToken);

        await this.AiAgentPublicChatService.checkRateLimit(agent);
        const agentChatDto = this.AiAgentPublicChatService.convertToAgentChatDto(dto, agent);
        const apiKeyUser = this.AiAgentPublicChatService.createApiKeyUser(req.accessToken);

        if (responseMode === "streaming") {
            // 流式响应
            return await this.AiAgentChatService.handleChat(
                agent.id,
                agentChatDto,
                apiKeyUser,
                "streaming",
                new CreatorBillingStrategy(),
                res,
            );
        } else {
            // 阻塞响应
            const result = await this.AiAgentChatService.handleChat(
                agent.id,
                agentChatDto,
                apiKeyUser,
                "blocking",
                new CreatorBillingStrategy(),
            );
            return res.json(result);
        }
    }

    /**
     * 获取对话记录列表 (使用 API Key)
     *
     * @param query 查询参数
     * @param req 请求对象
     * @returns 对话记录列表
     */
    @Get("conversations")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async getApiConversations(@Query() query: PaginationDto, @Req() req: Request) {
        return this.AiAgentPublicChatService.getConversationsByApiKey(req.accessToken!, query);
    }

    /**
     * 获取对话消息 (使用 API Key)
     *
     * @param conversationId 对话ID
     * @param query 查询参数
     * @param req 请求对象
     * @returns 对话消息列表
     */
    @Get("conversations/:conversationId/messages")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async getApiMessages(
        @Param("conversationId") conversationId: string,
        @Query() query: PaginationDto,
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.getMessagesByApiKey(
            req.accessToken!,
            conversationId,
            query,
        );
    }

    /**
     * 删除对话记录 (使用 API Key)
     *
     * @param conversationId 对话ID
     * @param req 请求对象
     * @returns 删除结果
     */
    @Delete("conversations/:conversationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async deleteApiConversation(
        @Param("conversationId") conversationId: string,
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.deleteConversationByApiKey(
            req.accessToken!,
            conversationId,
        );
    }

    /**
     * 更新对话记录 (使用 API Key)
     *
     * @param conversationId 对话ID
     * @param body 更新数据
     * @param req 请求对象
     * @returns 更新结果
     */
    @Put("conversations/:conversationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async updateApiConversation(
        @Param("conversationId") conversationId: string,
        @Body() body: { title?: string },
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.updateConversationByApiKey(
            req.accessToken!,
            conversationId,
            body,
        );
    }

    /**
     * 获取对话记录列表 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param query 查询参数
     * @param req 请求对象
     * @returns 对话记录列表
     */
    @Get(":publishToken/conversations")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async getPublicAgentConversations(
        @Param("publishToken") publishToken: string,
        @Query() query: { page?: number; pageSize?: number },
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.getConversationsByAccessToken(
            publishToken,
            req.accessToken!,
            query,
            req.user,
        );
    }

    /**
     * 获取对话消息 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param conversationId 对话ID
     * @param query 查询参数
     * @returns 对话消息列表
     */
    @Get(":publishToken/conversations/:conversationId/messages")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async getPublicAgentMessages(
        @Param("publishToken") publishToken: string,
        @Param("conversationId") conversationId: string,
        @Query() query: PaginationDto,
    ) {
        return this.AiAgentPublicChatService.getMessagesByAccessToken(
            publishToken,
            conversationId,
            query,
        );
    }

    /**
     * 删除对话记录 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param conversationId 对话ID
     * @param req 请求对象
     * @returns 删除结果
     */
    @Delete(":publishToken/conversations/:conversationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async deletePublicAgentConversation(
        @Param("publishToken") publishToken: string,
        @Param("conversationId") conversationId: string,
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.deleteConversationByAccessToken(
            publishToken,
            req.accessToken!,
            conversationId,
            req.user,
        );
    }

    /**
     * 更新对话记录 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param conversationId 对话ID
     * @param body 更新数据
     * @param req 请求对象
     * @returns 更新结果
     */
    @Put(":publishToken/conversations/:conversationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async updatePublicAgentConversation(
        @Param("publishToken") publishToken: string,
        @Param("conversationId") conversationId: string,
        @Body() body: { title?: string },
        @Req() req: Request,
    ) {
        return this.AiAgentPublicChatService.updateConversationByAccessToken(
            publishToken,
            req.accessToken!,
            conversationId,
            body,
            req.user,
        );
    }

    /**
     * 创建标注 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param dto 创建标注DTO
     * @param req 请求对象
     * @returns 创建的标注
     */
    @Post(":publishToken/annotations")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async createAnnotation(
        @Param("publishToken") publishToken: string,
        @Body() dto: CreateAgentAnnotationDto,
        @Req() req: Request,
    ) {
        // 获取智能体信息
        const agent = await this.AiAgentService.getPublicAgentByToken(publishToken);

        // 创建匿名用户上下文
        const anonymousUser = {
            id: req.accessToken!,
            username: `anonymous_${Date.now()}`,
            isRoot: 0 as const,
            role: {} as any,
            permissions: [],
        };

        return await this.annotationService.createAnnotation(agent.id, dto, anonymousUser);
    }

    /**
     * 获取标注详情 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param annotationId 标注ID
     * @returns 标注详情
     */
    @Get(":publishToken/annotations/:annotationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async getAnnotationDetail(
        @Param("publishToken") publishToken: string,
        @Param("annotationId") annotationId: string,
    ) {
        // 获取智能体信息
        const agent = await this.AiAgentService.getPublicAgentByToken(publishToken);

        // 验证标注是否属于该智能体
        const annotation = await this.annotationService.getAnnotationById(annotationId);
        if (annotation.agentId !== agent.id) {
            throw new Error("标注不存在或无权访问");
        }

        return annotation;
    }

    /**
     * 更新标注 (使用访问令牌)
     *
     * @param publishToken 发布令牌
     * @param annotationId 标注ID
     * @param dto 更新标注DTO
     * @param req 请求对象
     * @returns 更新后的标注
     */
    @Put(":publishToken/annotations/:annotationId")
    @Public()
    @UseGuards(PublicAccessTokenGuard)
    async updateAnnotation(
        @Param("publishToken") publishToken: string,
        @Param("annotationId") annotationId: string,
        @Body() dto: UpdateAgentAnnotationDto,
        @Req() req: Request,
    ) {
        // 创建匿名用户上下文
        const anonymousUser = {
            id: req.accessToken!,
            username: `anonymous_${Date.now()}`,
            isRoot: 0 as const,
            role: {} as any,
            permissions: [],
        };

        return await this.annotationService.updateAnnotation(annotationId, dto, anonymousUser);
    }
}
