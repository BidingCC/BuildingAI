import { BaseService } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ChatMessage } from "@buildingai/types/ai/agent-config.interface";
import { extractTextFromMessageContent } from "@buildingai/utils";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";

import { AgentChatDto, AgentChatResponse } from "../dto/agent";
import { AnnotationHandler } from "../handlers/annotation.handler";
import { BillingHandler } from "../handlers/billing.handler";
import { ChatContextBuilder } from "../handlers/chat-context.builder";
import { KnowledgeRetrievalHandler } from "../handlers/knowledge-retrieval.handler";
import { McpServerHandler } from "../handlers/mcp-server.handler";
// 导入所有处理器
import { MessageHandler } from "../handlers/message.handler";
import { QuickCommandHandler } from "../handlers/quick-command.handler";
import { ResponseHandler } from "../handlers/response.handler";
import { ThirdPartyIntegrationHandler } from "../handlers/third-party-integration.handler";
import { BillingStrategy } from "../interfaces/billing-strategy.interface";
import { UserUtil } from "../utils/user.util";
// 导入服务依赖
import { AiAgentService } from "./ai-agent.service";
import { AiAgentChatRecordService } from "./ai-agent-chat-record.service";

/**
 * 重构后的智能体聊天服务
 * 使用处理器模式，将复杂逻辑拆分为多个专门的处理器
 */
@Injectable()
export class AiAgentChatService extends BaseService<AgentChatRecord> {
    protected readonly logger = new Logger(AiAgentChatService.name);

    constructor(
        @InjectRepository(AgentChatRecord)
        protected readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AgentChatMessage)
        protected readonly chatMessageRepository: Repository<AgentChatMessage>,
        @InjectRepository(Agent)
        protected readonly agentRepository: Repository<Agent>,
        @InjectRepository(User)
        protected readonly userRepository: Repository<User>,

        // 服务依赖
        protected readonly AiAgentService: AiAgentService,
        protected readonly AiAgentChatRecordService: AiAgentChatRecordService,

        // 处理器依赖
        private readonly messageHandler: MessageHandler,
        private readonly quickCommandHandler: QuickCommandHandler,
        private readonly annotationHandler: AnnotationHandler,
        private readonly knowledgeRetrievalHandler: KnowledgeRetrievalHandler,
        private readonly thirdPartyIntegrationHandler: ThirdPartyIntegrationHandler,
        private readonly chatContextBuilder: ChatContextBuilder,
        private readonly billingHandler: BillingHandler,
        private readonly responseHandler: ResponseHandler,
        private readonly mcpServerHandler: McpServerHandler,
    ) {
        super(chatRecordRepository);
    }

    /**
     * 处理智能体聊天
     */
    async handleChat(
        agentId: string,
        dto: AgentChatDto,
        user: UserPlayground,
        responseMode: "blocking" | "streaming",
        billingStrategy: BillingStrategy,
        res?: Response,
    ): Promise<AgentChatResponse | void> {
        // 验证参数
        if (responseMode === "streaming" && !res) {
            throw new Error("Streaming mode requires response object");
        }

        // 设置流式响应头
        if (responseMode === "streaming") {
            this.setupStreamingHeaders(res!);
        }

        // Create AbortController for cancellation (streaming mode only)
        const abortController = responseMode === "streaming" ? new AbortController() : null;
        let isClientDisconnected = false;

        // Listen for client disconnect (streaming mode only)
        if (responseMode === "streaming" && res) {
            res.on("close", () => {
                if (!res.writableEnded) {
                    isClientDisconnected = true;
                    this.logger.debug("🔌 Client disconnected, cancelling request");
                    abortController?.abort();
                }
            });
        }

        // 获取智能体信息
        const agentInfo = await this.AiAgentService.findOneById(agentId);
        if (!agentInfo) {
            throw HttpErrorFactory.notFound("智能体不存在");
        }

        // 确保 agentInfo 是完整的 Agent 对象
        if (!agentInfo.id) {
            throw HttpErrorFactory.notFound("智能体信息不完整");
        }

        const startTime = Date.now();

        // 初始化聊天环境
        const { finalConfig, conversationRecord } = await this.initializeChat(agentId, dto, user);
        let conversationId = conversationRecord?.id || dto.conversationId;

        // 获取最后一条用户消息
        const lastUserMessage = dto.messages.filter((m) => m.role === "user").slice(-1)[0] as
            | ChatMessage
            | undefined;

        const isAnonymous = UserUtil.isAnonymousUser(user);

        // 保存用户消息
        if (lastUserMessage && conversationRecord && dto.saveConversation !== false) {
            await this.messageHandler.saveUserMessage(
                conversationId!,
                agentId,
                user.id,
                lastUserMessage.content,
                dto.formVariables,
                dto.formFieldsInputs,
                isAnonymous ? user.id : undefined,
            );
        }

        // 处理快捷命令
        const quickCommandResult = this.quickCommandHandler.handleQuickCommand(
            dto,
            lastUserMessage,
        );
        if (quickCommandResult.matched && quickCommandResult.response) {
            return await this.quickCommandHandler.generateQuickCommandResponse(
                quickCommandResult.response,
                conversationRecord,
                agentId,
                user,
                dto,
                finalConfig,
                startTime,
                { responseMode, res },
            );
        }

        // 修改DTO（如果快捷命令匹配了内容替换）
        const modifiedDto = this.applyQuickCommandContent(dto, quickCommandResult);
        const updatedLastUserMessage = quickCommandResult.content || lastUserMessage;

        // 处理注解匹配
        const annotationMatch = updatedLastUserMessage
            ? await this.annotationHandler.matchUserQuestion(
                  agentId,
                  typeof updatedLastUserMessage === "string"
                      ? updatedLastUserMessage
                      : extractTextFromMessageContent(updatedLastUserMessage.content),
              )
            : { matched: false };

        if (annotationMatch.matched && annotationMatch.annotation) {
            return await this.annotationHandler.generateAnnotationResponse(
                annotationMatch.annotation,
                conversationRecord,
                agentId,
                user,
                modifiedDto,
                finalConfig,
                startTime,
                { responseMode, res },
            );
        }

        // 检查第三方集成
        if (this.thirdPartyIntegrationHandler.isThirdPartyIntegrationEnabled(finalConfig, dto)) {
            this.logger.log(
                `[ThirdParty] Using third party platform: ${finalConfig.createMode} for agent ${agentId}`,
            );

            this.thirdPartyIntegrationHandler.validateThirdPartyConfig(finalConfig, dto);

            // 获取积分策略结果
            const billingResult = await billingStrategy.determineBillTo(
                agentInfo as Agent,
                user,
                this.userRepository,
            );

            return await this.thirdPartyIntegrationHandler.handleThirdPartyIntegrationChat(
                finalConfig,
                modifiedDto,
                user,
                {
                    responseMode,
                    res,
                    billingResult,
                    billingStrategy,
                    billingHandler: this.billingHandler,
                },
                conversationRecord,
            );
        }

        // 传统聊天处理
        return await this.handleTraditionalChat(
            agentInfo as Agent,
            finalConfig,
            modifiedDto,
            user,
            responseMode,
            billingStrategy,
            conversationRecord,
            updatedLastUserMessage,
            startTime,
            res,
            abortController,
            () => isClientDisconnected,
        );
    }

    /**
     * 处理传统聊天（非第三方集成）
     */
    private async handleTraditionalChat(
        agentInfo: Agent,
        finalConfig: Agent,
        dto: AgentChatDto,
        user: UserPlayground,
        responseMode: "blocking" | "streaming",
        billingStrategy: BillingStrategy,
        conversationRecord: AgentChatRecord | null,
        lastUserMessage: ChatMessage | string | undefined,
        startTime: number,
        res?: Response,
        abortController?: AbortController | null,
        getIsClientDisconnected?: () => boolean,
    ): Promise<AgentChatResponse | void> {
        // 检查模型配置
        if (!finalConfig.modelConfig?.id) {
            throw new BadRequestException("智能体需要配置模型");
        }

        // 准备聊天上下文
        let { messages, retrievalResults, model } = await this.prepareChatContext(
            finalConfig,
            dto,
            lastUserMessage,
        );

        // 检查是否需要积分并进行预检查（阻塞模式）
        const billingResult = await billingStrategy.determineBillTo(
            agentInfo,
            user,
            this.userRepository,
        );

        if (responseMode === "blocking") {
            if (
                billingResult.billToUser &&
                agentInfo.billingConfig?.price > billingResult.billToUser.power
            ) {
                throw HttpErrorFactory.forbidden(`${billingResult.billingContext}不足，请充值`);
            }
        }

        // 初始化MCP服务器和工具（从智能体配置中获取）
        const mcpServerIds = finalConfig.mcpServerIds || dto.mcpServers || [];
        this.logger.log(`MCP Server IDs: ${JSON.stringify(mcpServerIds)}`);
        const { mcpServers, tools, toolToServerMap } =
            await this.mcpServerHandler.initializeMcpServers(mcpServerIds);
        this.logger.log(`MCP Servers initialized: ${mcpServers.length}, Tools: ${tools.length}`);

        // 获取AI客户端和配置
        const { client, requestOpts, modelName } = await this.chatContextBuilder.getAIClient(
            model,
            finalConfig,
            dto,
        );

        const shouldIncludeReferences = dto.includeReferences ?? finalConfig.showReference;

        // 构建响应上下文
        const responseContext = {
            conversationId: conversationRecord?.id,
            agentId: finalConfig.id,
            user,
            agent: agentInfo,
            dto,
            finalConfig,
            retrievalResults,
            model,
            conversationRecord,
            startTime,
            shouldIncludeReferences,
            lastUserMessage:
                typeof lastUserMessage === "string"
                    ? { role: "user" as const, content: lastUserMessage }
                    : lastUserMessage,
            billingResult,
            tools,
            toolToServerMap,
            mcpServers,
            abortSignal: abortController?.signal,
        };

        try {
            let result: AgentChatResponse | void;

            // 根据响应模式处理
            if (responseMode === "streaming") {
                await this.responseHandler.handleStreamingResponse(
                    client,
                    modelName,
                    messages,
                    requestOpts,
                    res!,
                    responseContext,
                );
            } else {
                result = await this.responseHandler.handleBlockingResponse(
                    client,
                    modelName,
                    messages,
                    requestOpts,
                    responseContext,
                );
            }

            // 扣除积分
            await this.billingHandler.deductAgentChatPower(
                agentInfo,
                billingResult.billToUser,
                user,
                conversationRecord,
            );

            return result;
        } catch (error) {
            // Handle user cancellation silently
            if (getIsClientDisconnected?.()) {
                this.logger.debug("🚫 User cancelled the request, ending silently");
                return;
            }

            this.logger.error(`智能体对话失败: ${error.message}`);

            if (responseMode === "streaming") {
                // 流式模式的错误处理已在 ResponseHandler 中处理
                throw error;
            } else {
                throw HttpErrorFactory.business("对话处理失败");
            }
        } finally {
            // 清理MCP服务器连接
            if (mcpServers && mcpServers.length > 0) {
                await this.mcpServerHandler.cleanupMcpServers(mcpServers);
            }
        }
    }

    /**
     * 准备聊天上下文（整合知识库检索）
     */
    private async prepareChatContext(
        config: Agent,
        dto: AgentChatDto,
        lastUserMessage?: ChatMessage | string,
    ) {
        // 获取基础聊天上下文
        const baseContext = await this.chatContextBuilder.prepareChatContext(config, dto);

        let retrievalResults = baseContext.retrievalResults;

        // 执行知识库检索
        if (config.datasetIds?.length && lastUserMessage) {
            const userQuery =
                typeof lastUserMessage === "string"
                    ? lastUserMessage
                    : extractTextFromMessageContent(lastUserMessage.content);

            const shouldRetrieve = await this.knowledgeRetrievalHandler.shouldPerformRetrieval(
                userQuery,
                baseContext.model,
                config,
                dto,
            );

            if (shouldRetrieve) {
                retrievalResults = await this.knowledgeRetrievalHandler.performKnowledgeRetrieval(
                    config.datasetIds,
                    userQuery,
                );
            }
        }

        // 重新构建包含检索结果的消息
        const messages = this.chatContextBuilder.buildChatsMessages(
            baseContext.systemPrompt,
            this.limitMessagesByContext(
                dto.messages as ChatMessage[],
                baseContext.model.maxContext,
            ),
            retrievalResults,
        );

        return {
            ...baseContext,
            retrievalResults,
            messages,
        };
    }

    /**
     * 应用快捷命令的内容替换
     */
    private applyQuickCommandContent(
        dto: AgentChatDto,
        quickCommandResult: { matched: boolean; content?: string },
    ): AgentChatDto {
        if (!quickCommandResult.matched || !quickCommandResult.content) {
            return dto;
        }

        return {
            ...dto,
            messages: [
                ...dto.messages.slice(0, -1),
                { role: "user" as const, content: quickCommandResult.content },
            ],
        };
    }

    /**
     * 初始化聊天环境
     */
    private async initializeChat(
        agentId: string,
        dto: AgentChatDto,
        user: UserPlayground,
    ): Promise<{
        agent: Agent;
        finalConfig: Agent;
        conversationRecord: AgentChatRecord | null;
    }> {
        const agent = await this.AiAgentService.getAgentDetail(agentId);
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const finalConfig = this.mergeConfigurations(agent, dto);
        let conversationRecord: AgentChatRecord | null = null;

        if (dto.conversationId) {
            conversationRecord = await this.AiAgentChatRecordService.getChatRecordDetail(
                dto.conversationId,
                user,
            );
        } else if (dto.saveConversation !== false) {
            const title = this.generateConversationTitle(
                extractTextFromMessageContent(dto.messages[0]?.content) || "新对话",
            );
            conversationRecord = await this.AiAgentChatRecordService.createChatRecord(
                agentId,
                UserUtil.isAnonymousUser(user) ? undefined : user.id,
                title,
                UserUtil.isAnonymousUser(user) ? user.id : undefined,
            );
        }

        return { agent, finalConfig, conversationRecord };
    }

    /**
     * 设置流式响应头
     */
    private setupStreamingHeaders(res: Response): void {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
        res.flushHeaders(); // 立即发送响应头
    }

    /**
     * Merge configurations
     * Combines agent configuration with DTO parameters
     */
    private mergeConfigurations(agent: Agent, dto: AgentChatDto): Agent {
        // Handle special field mapping
        const dtoConfig = {
            ...dto,
            mcpServerIds: dto.mcpServers, // Map field name
        };

        // Filter out undefined values, keep only valid configurations
        const validConfig = Object.fromEntries(
            Object.entries(dtoConfig).filter(([_, value]) => value !== undefined),
        );

        return {
            ...agent,
            ...validConfig,
        };
    }

    /**
     * 生成对话标题
     */
    private generateConversationTitle(message: string): string {
        return message.length > 20 ? message.substring(0, 20) + "..." : message;
    }

    /**
     * 限制消息数量以适应上下文长度
     */
    private limitMessagesByContext(messages: ChatMessage[], maxContext?: number): ChatMessage[] {
        if (!maxContext || messages.length <= maxContext) return messages;
        return messages.slice(-maxContext);
    }

    /**
     * 检查是否为匿名用户
     */
}
