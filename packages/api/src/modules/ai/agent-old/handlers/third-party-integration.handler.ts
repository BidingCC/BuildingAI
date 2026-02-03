import { type UserPlayground } from "@buildingai/db";
import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { extractFilesFromMessageContent, extractTextFromMessageContent } from "@buildingai/utils";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";

import { AgentChatDto, AgentChatResponse } from "../dto/agent";
import {
    IThirdPartyIntegrationHandler,
    ResponseHandlerOptions,
} from "../interfaces/chat-handlers.interface";
import { AiAgentChatRecordService } from "../services/ai-agent-chat-record.service";
import { BillingHandler } from "./billing.handler";
import { MessageHandler } from "./message.handler";

/**
 * 第三方平台集成配置接口
 */
interface ThirdPartyConfig {
    apiKey: string;
    baseURL: string;
    appId?: string;
    extendedConfig?: Record<string, any>;
    useExternalConversation?: boolean;
}

/**
 * Dify API 响应接口
 */
interface DifyResponse {
    answer: string;
    conversation_id: string;
    message_id: string;
    metadata?: {
        usage?: {
            total_tokens?: number;
            prompt_tokens?: number;
            completion_tokens?: number;
        };
    };
}

/**
 * Dify 流式事件接口
 * @see https://docs.dify.ai/api-reference/chat/send-chat-message
 */
interface DifyStreamEvent {
    event: string;
    conversation_id?: string;
    message_id?: string;
    task_id?: string;
    id?: string;
    answer?: string;
    metadata?: Record<string, any>;
    // agent_thought 事件相关字段
    position?: number;
    thought?: string;
    observation?: string;
    tool?: string;
    tool_input?: string;
    message_files?: string[];
    // workflow 相关字段
    data?: {
        id?: string;
        node_id?: string;
        node_type?: string;
        title?: string;
        index?: number;
        inputs?: Record<string, any>;
        outputs?: Record<string, any>;
        status?: string;
        elapsed_time?: number;
    };
}

/**
 * Dify 应用参数响应接口
 */
interface DifyParametersResponse {
    opening_statement?: string;
    suggested_questions?: string[];
    suggested_questions_after_answer?: {
        enabled: boolean;
    };
    speech_to_text?: {
        enabled: boolean;
    };
    retriever_resource?: {
        enabled: boolean;
    };
    annotation_reply?: {
        enabled: boolean;
    };
    user_input_form?: Array<{
        [key: string]: {
            label: string;
            variable: string;
            required: boolean;
            default?: string;
        };
    }>;
    file_upload?: {
        enabled?: boolean;
        allowed_file_types?: string[];
        allowed_file_extensions?: string[];
        allowed_file_upload_methods?: string[];
        number_limits?: number;
        image?: {
            enabled: boolean;
            number_limits?: number;
            transfer_methods?: string[];
        };
    };
    system_parameters?: {
        image_file_size_limit?: string;
        file_size_limit?: number;
    };
}

/**
 * Coze Bot 信息响应接口
 * @see https://www.coze.cn/docs/developer_guides/retrieve_bot
 */
interface CozeBotInfoResponse {
    code: number;
    msg: string;
    data?: {
        bot_id: string;
        name: string;
        description?: string;
        icon_url?: string;
        create_time?: number;
        update_time?: number;
        version?: string;
        /** 开场白配置 */
        onboarding_info?: {
            /** 开场白 */
            prologue?: string;
            /** 开场问题列表 */
            suggested_questions?: string[];
        };
        /** Bot 模式 */
        bot_mode?: number;
        /** 插件信息 */
        plugin_info_list?: Array<{
            plugin_id: string;
            name: string;
            description?: string;
            icon_url?: string;
            api_info_list?: Array<{
                api_id: string;
                name: string;
                description?: string;
            }>;
        }>;
        /** 模型信息 */
        model_info?: {
            model_id: string;
            model_name: string;
        };
        /** Prompt 信息 */
        prompt_info?: {
            prompt: string;
        };
    };
}

/**
 * 通用第三方平台集成处理器
 * 支持多种第三方平台集成：Dify、Coze、自定义平台等
 */
@Injectable()
export class ThirdPartyIntegrationHandler implements IThirdPartyIntegrationHandler {
    private readonly logger = new Logger(ThirdPartyIntegrationHandler.name);

    constructor(
        private readonly aiAgentChatRecordService: AiAgentChatRecordService,
        private readonly messageHandler: MessageHandler,
        private readonly billingHandler: BillingHandler,
    ) {}

    /**
     * 获取 Dify 应用参数
     * 调用 Dify /parameters 接口获取应用配置
     * @param config 第三方配置（包含 apiKey 和 baseURL）
     * @returns 应用参数（opening_statement、suggested_questions、suggested_questions_after_answer、file_upload）
     */
    async fetchDifyParameters(config: { apiKey: string; baseURL: string }): Promise<{
        openingStatement?: string;
        openingQuestions?: string[];
        autoQuestionsEnabled?: boolean;
        fileUploadConfig?: {
            enabled?: boolean;
            allowedFileExtensions?: string[];
            allowedFileTypes?: string[];
            numberLimits?: number;
            fileSizeLimit?: number;
        };
    }> {
        const url = `${config.baseURL}/parameters`;

        this.logger.log(`[Dify] Fetching parameters from: ${url}`);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(
                    `[Dify] Failed to fetch parameters: ${response.status} - ${errorText}`,
                );
                throw new BadRequestException(`获取 Dify 应用参数失败: ${response.status}`);
            }

            const data = (await response.json()) as DifyParametersResponse;
            this.logger.log(
                `[Dify] Parameters fetched successfully: opening_statement=${data.opening_statement?.substring(0, 50) || "none"}, suggested_questions=${data.suggested_questions?.length || 0}, suggested_questions_after_answer=${data.suggested_questions_after_answer?.enabled || false}, file_upload=${JSON.stringify(data.file_upload || {})}`,
            );

            // 构建文件上传配置
            let fileUploadConfig:
                | {
                      enabled?: boolean;
                      allowedFileExtensions?: string[];
                      allowedFileTypes?: string[];
                      numberLimits?: number;
                      fileSizeLimit?: number;
                  }
                | undefined;

            if (data.file_upload) {
                fileUploadConfig = {
                    enabled: data.file_upload.enabled ?? data.file_upload.image?.enabled,
                    allowedFileExtensions: data.file_upload.allowed_file_extensions,
                    allowedFileTypes: data.file_upload.allowed_file_types,
                    numberLimits:
                        data.file_upload.number_limits ?? data.file_upload.image?.number_limits,
                    fileSizeLimit: data.system_parameters?.file_size_limit,
                };
            }

            return {
                openingStatement: data.opening_statement || undefined,
                openingQuestions: data.suggested_questions || undefined,
                autoQuestionsEnabled: data.suggested_questions_after_answer?.enabled,
                fileUploadConfig,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[Dify] Error fetching parameters: ${error.message}`);
            throw new BadRequestException(`获取 Dify 应用参数失败: ${error.message}`);
        }
    }

    /**
     * 获取 Dify 消息的推荐问题（自动追问）
     * 调用 Dify /messages/{message_id}/suggested 接口
     * @param config 第三方配置（包含 apiKey 和 baseURL）
     * @param messageId 消息ID
     * @param userId 用户ID
     * @returns 推荐问题列表
     */
    async fetchDifySuggestedQuestions(
        config: { apiKey: string; baseURL: string },
        messageId: string,
        userId: string,
    ): Promise<string[]> {
        // Dify API 要求传递 user 参数
        const url = `${config.baseURL}/messages/${messageId}/suggested?user=${encodeURIComponent(userId)}`;

        this.logger.log(`[Dify] Fetching suggested questions from: ${url}`);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn(
                    `[Dify] Failed to fetch suggested questions: ${response.status} - ${errorText}`,
                );
                return [];
            }

            const data = (await response.json()) as { result: string; data: string[] };
            this.logger.log(
                `[Dify] Suggested questions fetched: ${data.data?.length || 0} questions`,
            );

            return data.data || [];
        } catch (error) {
            this.logger.warn(`[Dify] Error fetching suggested questions: ${error.message}`);
            return [];
        }
    }

    /**
     * 获取 Coze Bot 参数
     * 调用 Coze /v1/bot/get_online_info 接口获取 Bot 配置
     * @param config 第三方配置（包含 apiKey、baseURL 和 appId/botId）
     * @returns Bot 参数（开场白、开场问题等）
     */
    async fetchCozeParameters(config: { apiKey: string; baseURL: string; botId: string }): Promise<{
        openingStatement?: string;
        openingQuestions?: string[];
        botName?: string;
        botDescription?: string;
    }> {
        // Coze API: GET /v1/bot/get_online_info?bot_id=xxx
        const url = `${config.baseURL}/v1/bot/get_online_info?bot_id=${config.botId}`;

        this.logger.log(`[Coze] Fetching bot info from: ${url}`);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(
                    `[Coze] Failed to fetch bot info: ${response.status} - ${errorText}`,
                );
                throw new BadRequestException(`获取 Coze Bot 信息失败: ${response.status}`);
            }

            const data = (await response.json()) as CozeBotInfoResponse;

            if (data.code !== 0) {
                this.logger.error(`[Coze] API error: ${data.code} - ${data.msg}`);
                throw new BadRequestException(`获取 Coze Bot 信息失败: ${data.msg}`);
            }

            const botData = data.data;
            const onboardingInfo = botData?.onboarding_info;

            this.logger.log(
                `[Coze] Bot info fetched successfully: name=${botData?.name || "unknown"}, prologue=${onboardingInfo?.prologue?.substring(0, 50) || "none"}, suggested_questions=${onboardingInfo?.suggested_questions?.length || 0}`,
            );

            return {
                openingStatement: onboardingInfo?.prologue || undefined,
                openingQuestions: onboardingInfo?.suggested_questions || undefined,
                botName: botData?.name,
                botDescription: botData?.description,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[Coze] Error fetching bot info: ${error.message}`);
            throw new BadRequestException(`获取 Coze Bot 信息失败: ${error.message}`);
        }
    }

    /**
     * 检查是否启用第三方集成
     * 当 createMode 不是 direct 时，即视为第三方集成模式
     */
    isThirdPartyIntegrationEnabled(agent: Agent, _dto: AgentChatDto): boolean {
        // 只要 createMode 存在且不是 direct，就认为是第三方集成
        return !!agent.createMode && agent.createMode !== "direct";
    }

    /**
     * 验证第三方配置
     */
    validateThirdPartyConfig(agent: Agent, dto: AgentChatDto): void {
        // 如果 createMode 是 direct 或 null，则不需要第三方配置
        if (!agent.createMode || agent.createMode === "direct") {
            return;
        }

        // 第三方平台需要配置（优先使用 dto 中的配置，如果没有则使用 agent 中的配置）
        const thirdPartyConfig = dto.thirdPartyIntegration || agent.thirdPartyIntegration;
        if (!thirdPartyConfig) {
            throw new BadRequestException("第三方集成配置缺失");
        }
    }

    /**
     * 处理第三方集成聊天
     * @param agent 智能体配置
     * @param dto 聊天请求DTO
     * @param user 用户信息
     * @param options 响应处理选项
     * @param conversationRecord 对话记录
     */
    async handleThirdPartyIntegrationChat(
        agent: Agent,
        dto: AgentChatDto,
        user: UserPlayground,
        options: ResponseHandlerOptions,
        conversationRecord?: AgentChatRecord | null,
    ): Promise<AgentChatResponse | void> {
        const { responseMode, res, billingResult } = options;
        const platform = this.getThirdPartyPlatform(agent);
        const startTime = Date.now();

        this.logger.log(`[ThirdParty] Using platform: ${platform} for agent ${agent.id}`);

        // 获取第三方配置
        const thirdPartyConfig = this.getThirdPartyConfig(agent, dto);
        if (!thirdPartyConfig) {
            throw new BadRequestException("第三方集成配置缺失");
        }

        // 阻塞模式处理
        if (responseMode === "blocking") {
            return await this.handleBlockingMode(
                agent,
                dto,
                user,
                platform,
                thirdPartyConfig,
                conversationRecord,
                billingResult,
                startTime,
            );
        }

        // 流式模式处理
        return await this.handleStreamingMode(
            agent,
            dto,
            user,
            platform,
            thirdPartyConfig,
            conversationRecord,
            billingResult,
            res!,
            startTime,
        );
    }

    /**
     * 处理阻塞模式的第三方对话
     */
    private async handleBlockingMode(
        agent: Agent,
        dto: AgentChatDto,
        user: UserPlayground,
        platform: string,
        config: ThirdPartyConfig,
        conversationRecord: AgentChatRecord | null | undefined,
        billingResult: ResponseHandlerOptions["billingResult"],
        startTime: number,
    ): Promise<AgentChatResponse> {
        // 检查积分
        if (
            billingResult?.billToUser &&
            agent.billingConfig?.price > billingResult.billToUser.power
        ) {
            throw new BadRequestException(`${billingResult.billingContext}不足，请充值`);
        }

        // 准备第三方对话上下文
        const enhancedDto = await this.prepareThirdPartyContext(dto, conversationRecord, platform);

        // 获取用户消息（包含文本和文件）
        const { text: userMessage, files: userFiles } = this.extractUserMessageWithFiles(dto);

        // 调用第三方平台 API
        const result = await this.callThirdPartyAPI(
            platform,
            config,
            userMessage,
            enhancedDto.conversationId,
            userFiles,
            user.id,
        );

        // 保存第三方对话ID到metadata
        if (result.conversationId && conversationRecord) {
            await this.saveThirdPartyConversationId(conversationRecord, platform, result);
        }

        // 保存助手消息
        if (conversationRecord) {
            await this.messageHandler.saveAssistantMessage(
                conversationRecord.id,
                agent.id,
                user.id,
                result.response,
                result.tokenUsage,
                { platform, thirdPartyConversationId: result.conversationId },
            );

            // 更新对话记录统计信息
            await this.aiAgentChatRecordService.updateChatRecordStats(
                conversationRecord.id,
                conversationRecord.messageCount + 2,
                conversationRecord.totalTokens + (result.tokenUsage?.totalTokens || 0),
            );
        }

        // 扣除积分
        await this.billingHandler.deductAgentChatPower(
            agent,
            billingResult?.billToUser || null,
            user,
            conversationRecord,
        );

        return {
            conversationId: conversationRecord?.id || result.conversationId,
            response: result.response,
            tokenUsage: result.tokenUsage,
            responseTime: Date.now() - startTime,
        };
    }

    /**
     * 处理流式模式的第三方对话
     */
    private async handleStreamingMode(
        agent: Agent,
        dto: AgentChatDto,
        user: UserPlayground,
        platform: string,
        config: ThirdPartyConfig,
        conversationRecord: AgentChatRecord | null | undefined,
        billingResult: ResponseHandlerOptions["billingResult"],
        res: Response,
        startTime: number,
    ): Promise<void> {
        this.logger.log(
            `[ThirdParty] handleStreamingMode started for platform: ${platform}, agent: ${agent.id}`,
        );

        // 检查积分
        if (
            billingResult?.billToUser &&
            agent.billingConfig?.price > billingResult.billToUser.power
        ) {
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: {
                        message: `${billingResult.billingContext}不足，请充值`,
                        code: 40602,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }

        // 发送系统对话ID（如果是新创建的）
        if (conversationRecord && !dto.conversationId) {
            res.write(
                `data: ${JSON.stringify({ type: "conversation_id", data: conversationRecord.id })}\n\n`,
            );
        }

        try {
            // 准备第三方对话上下文
            const enhancedDto = await this.prepareThirdPartyContext(
                dto,
                conversationRecord,
                platform,
            );

            // 获取用户消息（包含文本和文件）
            const { text: userMessage, files: userFiles } = this.extractUserMessageWithFiles(dto);

            // 调用第三方平台流式 API
            const result = await this.callThirdPartyStreamAPI(
                platform,
                config,
                userMessage,
                enhancedDto.conversationId,
                res,
                agent,
                userFiles,
                user.id,
            );

            // 保存第三方对话ID到metadata
            if (result.conversationId && conversationRecord) {
                await this.saveThirdPartyConversationId(conversationRecord, platform, {
                    conversationId: result.conversationId,
                });
            }

            // 保存助手消息
            if (conversationRecord) {
                await this.messageHandler.saveAssistantMessage(
                    conversationRecord.id,
                    agent.id,
                    user.id,
                    result.fullContent,
                    result.tokenUsage,
                    { platform, thirdPartyConversationId: result.conversationId },
                );

                // 更新对话记录统计信息
                await this.aiAgentChatRecordService.updateChatRecordStats(
                    conversationRecord.id,
                    conversationRecord.messageCount + 2,
                    conversationRecord.totalTokens + (result.tokenUsage?.totalTokens || 0),
                );
            }

            // 扣除积分
            await this.billingHandler.deductAgentChatPower(
                agent,
                billingResult?.billToUser || null,
                user,
                conversationRecord,
            );

            // 发送完成事件
            res.write(
                `data: ${JSON.stringify({
                    type: "done",
                    data: {
                        conversationId: conversationRecord?.id,
                        responseTime: Date.now() - startTime,
                    },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
        } catch (error) {
            this.logger.error(`第三方流式处理失败: ${error.message}`);
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    data: { message: error.message, code: 50000 },
                })}\n\n`,
            );
            res.write("data: [DONE]\n\n");
            res.end();
        }
    }

    /**
     * 获取第三方配置
     */
    private getThirdPartyConfig(agent: Agent, dto: AgentChatDto): ThirdPartyConfig | null {
        const config = dto.thirdPartyIntegration || agent.thirdPartyIntegration;
        if (!config?.apiKey || !config?.baseURL) {
            return null;
        }
        return config as ThirdPartyConfig;
    }

    /**
     * 提取用户消息（文本和文件）
     * @param dto 聊天请求DTO
     * @returns 包含文本消息和文件列表的对象
     */
    private extractUserMessageWithFiles(dto: AgentChatDto): {
        text: string;
        files: Array<{ type: string; url: string }>;
    } {
        const lastUserMessage = dto.messages.filter((m) => m.role === "user").slice(-1)[0];
        if (!lastUserMessage) {
            throw new BadRequestException("消息列表中没有用户消息");
        }

        const text = extractTextFromMessageContent(lastUserMessage.content);
        // 优先使用 dto.files，如果没有则从消息内容中提取
        const files =
            dto.files && dto.files.length > 0
                ? dto.files
                : extractFilesFromMessageContent(lastUserMessage.content);

        return { text, files };
    }

    /**
     * 提取用户消息（仅文本）
     * @deprecated 使用 extractUserMessageWithFiles 代替
     */
    private extractUserMessage(dto: AgentChatDto): string {
        const lastUserMessage = dto.messages.filter((m) => m.role === "user").slice(-1)[0];
        if (!lastUserMessage) {
            throw new BadRequestException("消息列表中没有用户消息");
        }
        return extractTextFromMessageContent(lastUserMessage.content);
    }

    /**
     * 调用第三方平台 API（阻塞模式）
     * @param platform 平台类型
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callThirdPartyAPI(
        platform: string,
        config: ThirdPartyConfig,
        query: string,
        conversationId?: string,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        response: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        switch (platform) {
            case "dify":
                return await this.callDifyAPI(config, query, conversationId, files, userId);
            case "coze":
                return await this.callCozeAPI(config, query, conversationId, files, userId);
            default:
                throw new BadRequestException(`不支持的第三方平台: ${platform}`);
        }
    }

    /**
     * 调用第三方平台流式 API
     * @param platform 平台类型
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param res 响应对象
     * @param agent 智能体配置（用于获取自动追问配置）
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callThirdPartyStreamAPI(
        platform: string,
        config: ThirdPartyConfig,
        query: string,
        conversationId: string | undefined,
        res: Response,
        agent?: Agent,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        fullContent: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        switch (platform) {
            case "dify":
                return await this.callDifyStreamAPI(
                    config,
                    query,
                    conversationId,
                    res,
                    agent,
                    files,
                    userId,
                );
            case "coze":
                return await this.callCozeStreamAPI(
                    config,
                    query,
                    conversationId,
                    res,
                    files,
                    userId,
                );
            default:
                throw new BadRequestException(`不支持的第三方平台: ${platform}`);
        }
    }

    /**
     * 将文件类型映射到 Dify 支持的类型
     * Dify 支持: image, document, audio, video, custom
     */
    private mapFileToDifyType(fileType: string): string {
        const type = fileType.toLowerCase();
        if (type.startsWith("image") || type === "image") {
            return "image";
        }
        if (type.startsWith("audio") || type === "audio") {
            return "audio";
        }
        if (type.startsWith("video") || type === "video") {
            return "video";
        }
        // 文档类型（pdf, doc, docx, txt, md, etc.）
        if (
            type.startsWith("document") ||
            type === "document" ||
            type.includes("pdf") ||
            type.includes("doc") ||
            type.includes("txt") ||
            type.includes("text")
        ) {
            return "document";
        }
        // 默认为文档类型
        return "document";
    }

    /**
     * 将文件类型映射到 Coze 支持的类型
     * Coze object_string 支持: text, file, image, audio
     */
    private mapFileToCozeType(fileType: string): string {
        const type = fileType.toLowerCase();
        if (type.startsWith("image") || type === "image") {
            return "image";
        }
        if (type.startsWith("audio") || type === "audio") {
            return "audio";
        }
        // Coze 使用 "file" 类型处理文档和其他文件
        return "file";
    }

    /**
     * 调用 Dify API（阻塞模式）
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callDifyAPI(
        config: ThirdPartyConfig,
        query: string,
        conversationId?: string,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        response: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        const url = `${config.baseURL}/chat-messages`;

        const body: Record<string, any> = {
            inputs: {},
            query,
            response_mode: "blocking",
            user: userId,
        };

        if (conversationId) {
            body.conversation_id = conversationId;
        }

        // 添加文件（附件）支持
        if (files && files.length > 0) {
            body.files = files.map((file) => ({
                type: this.mapFileToDifyType(file.type),
                transfer_method: "remote_url",
                url: file.url,
            }));
            this.logger.log(`[Dify] Sending ${files.length} files with blocking request`);
        }

        this.logger.debug(`[Dify] Calling API: ${url}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`[Dify] API error: ${response.status} - ${errorText}`);
            throw new BadRequestException(`Dify API 调用失败: ${response.status}`);
        }

        const data = (await response.json()) as DifyResponse;

        return {
            response: data.answer,
            conversationId: data.conversation_id,
            tokenUsage: data.metadata?.usage
                ? {
                      totalTokens: data.metadata.usage.total_tokens || 0,
                      promptTokens: data.metadata.usage.prompt_tokens || 0,
                      completionTokens: data.metadata.usage.completion_tokens || 0,
                  }
                : undefined,
        };
    }

    /**
     * 调用 Dify 流式 API
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param res 响应对象
     * @param agent 智能体配置（用于获取自动追问配置）
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callDifyStreamAPI(
        config: ThirdPartyConfig,
        query: string,
        conversationId: string | undefined,
        res: Response,
        agent?: Agent,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        fullContent: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        const url = `${config.baseURL}/chat-messages`;

        const body: Record<string, any> = {
            inputs: {},
            query,
            response_mode: "streaming",
            user: userId,
        };

        if (conversationId) {
            body.conversation_id = conversationId;
        }

        // 添加文件（附件）支持
        // Dify 文件格式: { type: "image"|"document"|..., transfer_method: "remote_url", url: "..." }
        if (files && files.length > 0) {
            body.files = files.map((file) => ({
                type: this.mapFileToDifyType(file.type),
                transfer_method: "remote_url",
                url: file.url,
            }));
            this.logger.log(`[Dify] Sending ${files.length} files with request`);
        }

        this.logger.log(`[Dify] Calling Stream API: ${url}, query: ${query.substring(0, 50)}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`[Dify] Stream API error: ${response.status} - ${errorText}`);
            throw new BadRequestException(`Dify API 调用失败: ${response.status}`);
        }

        let fullContent = "";
        let thirdPartyConversationId = conversationId || "";
        let tokenUsage: AgentChatResponse["tokenUsage"] | undefined;
        let messageId = ""; // 用于获取推荐问题

        const reader = response.body?.getReader();
        if (!reader) {
            throw new BadRequestException("无法读取 Dify 流式响应");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    // Dify SSE 格式: "data: {json}" 或 "data:{json}"
                    let jsonStr = "";
                    if (trimmedLine.startsWith("data:")) {
                        // 统一处理 "data:" 和 "data: " 两种格式
                        jsonStr = trimmedLine.substring(5).trim();
                    }

                    if (!jsonStr || jsonStr === "[DONE]") continue;

                    try {
                        const event = JSON.parse(jsonStr) as DifyStreamEvent;

                        if (event.conversation_id) {
                            thirdPartyConversationId = event.conversation_id;
                        }

                        // Dify 流式事件处理
                        if (event.event === "message" && event.answer) {
                            // 普通消息事件包含增量内容
                            fullContent += event.answer;
                            res.write(
                                `data: ${JSON.stringify({
                                    type: "chunk",
                                    data: event.answer,
                                })}\n\n`,
                            );
                        } else if (event.event === "agent_message" && event.answer) {
                            // Agent 模式的消息事件
                            fullContent += event.answer;
                            res.write(
                                `data: ${JSON.stringify({
                                    type: "chunk",
                                    data: event.answer,
                                })}\n\n`,
                            );
                        } else if (event.event === "agent_thought") {
                            // Agent 思考过程事件（包含工具调用信息）
                            // 注意：只有在有工具调用时才发送 reasoning，避免误显示"已深度思考"
                            try {
                                const toolId = event.id || event.message_id || `tool_${Date.now()}`;
                                const toolName = event.tool || "unknown_tool";

                                // 只有在有工具调用时才发送思考过程
                                if (event.thought && event.tool) {
                                    // 转发思考过程作为 reasoning（仅在工具调用时）
                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "reasoning",
                                            data: event.thought,
                                        })}\n\n`,
                                    );
                                }
                                if (event.tool) {
                                    // 工具调用开始 - 使用与前端 McpToolCall 兼容的格式
                                    let toolInput = {};
                                    try {
                                        toolInput = event.tool_input
                                            ? JSON.parse(event.tool_input)
                                            : {};
                                    } catch {
                                        toolInput = { raw: event.tool_input };
                                    }

                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "mcp_tool_call",
                                            data: {
                                                id: toolId,
                                                mcpServer: { name: "Dify", id: "dify" },
                                                tool: { name: toolName, description: "" },
                                                input: toolInput,
                                                output: null,
                                                timestamp: Date.now(),
                                                status: "pending",
                                            },
                                        })}\n\n`,
                                    );
                                }
                                if (event.observation) {
                                    // 工具调用结果 - 更新状态为 success
                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "mcp_tool_result",
                                            data: {
                                                id: toolId,
                                                mcpServer: { name: "Dify", id: "dify" },
                                                tool: { name: toolName, description: "" },
                                                input: {},
                                                output: event.observation,
                                                timestamp: Date.now(),
                                                status: "success",
                                            },
                                        })}\n\n`,
                                    );
                                }
                            } catch (thoughtError) {
                                this.logger.warn(
                                    `[Dify] Failed to process agent_thought: ${thoughtError}`,
                                );
                            }
                        } else if (event.event === "message_end") {
                            // 记录 message_id 用于获取推荐问题
                            if (event.message_id) {
                                messageId = event.message_id;
                            }
                            const usage = (event.metadata as any)?.usage;
                            if (usage) {
                                tokenUsage = {
                                    totalTokens: usage.total_tokens || 0,
                                    promptTokens: usage.prompt_tokens || 0,
                                    completionTokens: usage.completion_tokens || 0,
                                };
                            }
                        }
                    } catch (_parseError) {
                        this.logger.warn(`[Dify] Failed to parse event: ${jsonStr}`);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // 如果启用了自动追问且有 message_id，获取推荐问题
        if (agent?.autoQuestions?.enabled && messageId && config.apiKey && config.baseURL) {
            try {
                const suggestedQuestions = await this.fetchDifySuggestedQuestions(
                    { apiKey: config.apiKey, baseURL: config.baseURL },
                    messageId,
                    userId,
                );

                if (suggestedQuestions.length > 0) {
                    this.logger.log(
                        `[Dify] Sending ${suggestedQuestions.length} suggested questions to client`,
                    );
                    res.write(
                        `data: ${JSON.stringify({
                            type: "suggestions",
                            data: suggestedQuestions,
                        })}\n\n`,
                    );
                }
            } catch (error) {
                this.logger.warn(`[Dify] Failed to fetch suggested questions: ${error.message}`);
            }
        }

        return {
            fullContent,
            conversationId: thirdPartyConversationId,
            tokenUsage,
        };
    }

    /**
     * 调用 Coze API（阻塞模式）
     * Coze API 文档: https://www.coze.cn/docs/developer_guides/chat_v3
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callCozeAPI(
        config: ThirdPartyConfig,
        query: string,
        conversationId?: string,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        response: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        const url = `${config.baseURL}/v3/chat`;

        // 构建消息内容
        let messageContent: string | object[];
        let contentType = "text";

        if (files && files.length > 0) {
            // 使用 object_string 格式发送文件
            const contentParts: object[] = [];

            if (query) {
                contentParts.push({
                    type: "text",
                    text: query,
                });
            }

            for (const file of files) {
                const cozeFileType = this.mapFileToCozeType(file.type);
                contentParts.push({
                    type: cozeFileType,
                    file_url: file.url,
                });
            }

            messageContent = contentParts;
            contentType = "object_string";
            this.logger.log(`[Coze] Sending ${files.length} files with blocking request`);
        } else {
            messageContent = query;
        }

        const body: Record<string, any> = {
            bot_id: config.appId || config.extendedConfig?.botId,
            user_id: userId,
            stream: false,
            auto_save_history: true,
            additional_messages: [
                {
                    role: "user",
                    content:
                        contentType === "object_string"
                            ? JSON.stringify(messageContent)
                            : messageContent,
                    content_type: contentType,
                },
            ],
        };

        if (conversationId) {
            body.conversation_id = conversationId;
        }

        this.logger.debug(`[Coze] Calling API: ${url}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`[Coze] API error: ${response.status} - ${errorText}`);
            throw new BadRequestException(`Coze API 调用失败: ${response.status}`);
        }

        const data = await response.json();

        // Coze 返回格式处理
        const answer =
            data.data?.messages?.find((m: any) => m.role === "assistant" && m.type === "answer")
                ?.content || "";

        return {
            response: answer,
            conversationId: data.data?.conversation_id || conversationId || "",
            tokenUsage: data.data?.usage
                ? {
                      totalTokens: data.data.usage.token_count || 0,
                      promptTokens: data.data.usage.input_count || 0,
                      completionTokens: data.data.usage.output_count || 0,
                  }
                : undefined,
        };
    }

    /**
     * 调用 Coze 流式 API
     * @param config 第三方配置
     * @param query 用户查询
     * @param conversationId 会话ID
     * @param res 响应对象
     * @param files 文件列表（附件）
     * @param userId 用户ID
     */
    private async callCozeStreamAPI(
        config: ThirdPartyConfig,
        query: string,
        conversationId: string | undefined,
        res: Response,
        files?: Array<{ type: string; url: string }>,
        userId?: string,
    ): Promise<{
        fullContent: string;
        conversationId: string;
        tokenUsage?: AgentChatResponse["tokenUsage"];
    }> {
        const url = `${config.baseURL}/v3/chat`;

        // 构建消息内容
        // Coze 支持 object_string 格式来发送多模态内容（包括文件）
        let messageContent: string | object[];
        let contentType = "text";

        if (files && files.length > 0) {
            // 使用 object_string 格式发送文件
            // 格式: [{ type: "text", text: "..." }, { type: "file", file_url: "..." }, { type: "image", file_url: "..." }]
            const contentParts: object[] = [];

            // 添加文本部分
            if (query) {
                contentParts.push({
                    type: "text",
                    text: query,
                });
            }

            // 添加文件部分
            for (const file of files) {
                const cozeFileType = this.mapFileToCozeType(file.type);
                contentParts.push({
                    type: cozeFileType,
                    file_url: file.url,
                });
            }

            messageContent = contentParts;
            contentType = "object_string";
            this.logger.log(
                `[Coze] Sending ${files.length} files with request using object_string format`,
            );
        } else {
            messageContent = query;
        }

        const body: Record<string, any> = {
            bot_id: config.appId || config.extendedConfig?.botId,
            user_id: userId,
            stream: true,
            auto_save_history: true,
            additional_messages: [
                {
                    role: "user",
                    content:
                        contentType === "object_string"
                            ? JSON.stringify(messageContent)
                            : messageContent,
                    content_type: contentType,
                },
            ],
        };

        if (conversationId) {
            body.conversation_id = conversationId;
        }

        this.logger.debug(`[Coze] Calling Stream API: ${url}`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(`[Coze] Stream API error: ${response.status} - ${errorText}`);
            throw new BadRequestException(`Coze API 调用失败: ${response.status}`);
        }

        let fullContent = "";
        let thirdPartyConversationId = conversationId || "";
        let tokenUsage: AgentChatResponse["tokenUsage"] | undefined;

        const reader = response.body?.getReader();
        if (!reader) {
            throw new BadRequestException("无法读取 Coze 流式响应");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        // Coze SSE 格式: "event: xxx\ndata: {json}"
        // 需要同时解析 event 行和 data 行
        let currentEventType = "";

        // 追踪工具调用，用于匹配 function_call 和 tool_response
        // key: function_call 的消息 ID，value: { toolId, toolName, input }
        const pendingToolCalls: Map<
            string,
            { toolId: string; toolName: string; input: Record<string, any> }
        > = new Map();
        // 按顺序存储待处理的工具调用 ID（用于顺序匹配）
        const pendingToolCallIds: string[] = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    // 解析 event 行
                    if (trimmedLine.startsWith("event:")) {
                        currentEventType = trimmedLine.slice(6).trim();
                        continue;
                    }

                    // 解析 data 行
                    if (trimmedLine.startsWith("data:")) {
                        const jsonStr = trimmedLine.slice(5).trim();
                        if (!jsonStr || jsonStr === "[DONE]") continue;

                        try {
                            const data = JSON.parse(jsonStr);

                            // 获取 conversation_id
                            if (data.conversation_id) {
                                thirdPartyConversationId = data.conversation_id;
                            }

                            // Coze 流式事件处理
                            // data 直接包含 type, role, content 等字段
                            const messageType = data.type;
                            const messageRole = data.role;

                            if (
                                currentEventType === "conversation.message.delta" &&
                                messageRole === "assistant" &&
                                messageType === "answer"
                            ) {
                                // 消息增量
                                const content = data.content || "";
                                fullContent += content;
                                res.write(
                                    `data: ${JSON.stringify({
                                        type: "chunk",
                                        data: content,
                                    })}\n\n`,
                                );
                            } else if (
                                currentEventType === "conversation.message.completed" &&
                                messageRole === "assistant"
                            ) {
                                // 消息完成事件
                                if (messageType === "function_call") {
                                    // 工具调用 - 使用与前端 McpToolCall 兼容的格式
                                    try {
                                        const funcCall = JSON.parse(data.content || "{}");
                                        const toolId = data.id || `tool_${Date.now()}`;
                                        const toolName = funcCall.name || "unknown_tool";
                                        const toolInput = funcCall.arguments || {};

                                        // 保存工具调用信息，用于后续 tool_response 匹配
                                        pendingToolCalls.set(toolId, {
                                            toolId,
                                            toolName,
                                            input: toolInput,
                                        });
                                        pendingToolCallIds.push(toolId);

                                        res.write(
                                            `data: ${JSON.stringify({
                                                type: "mcp_tool_call",
                                                data: {
                                                    id: toolId,
                                                    mcpServer: { name: "Coze", id: "coze" },
                                                    tool: { name: toolName, description: "" },
                                                    input: toolInput,
                                                    output: null,
                                                    timestamp: Date.now(),
                                                    status: "pending",
                                                },
                                            })}\n\n`,
                                        );
                                    } catch {
                                        this.logger.warn(
                                            `[Coze] Failed to parse function_call: ${data.content}`,
                                        );
                                    }
                                } else if (
                                    messageType === "tool_output" ||
                                    messageType === "tool_response"
                                ) {
                                    // 工具输出结果 - 更新状态为 success
                                    // Coze 的 tool_response/tool_output 可能没有直接关联到 function_call 的 ID
                                    // 按顺序匹配：取第一个待处理的工具调用
                                    let matchedToolId = pendingToolCallIds.shift();
                                    let matchedToolInfo = matchedToolId
                                        ? pendingToolCalls.get(matchedToolId)
                                        : null;

                                    if (!matchedToolId) {
                                        // 如果没有待处理的工具调用，使用当前消息 ID
                                        matchedToolId = data.id || `tool_${Date.now()}`;
                                    }

                                    if (matchedToolInfo) {
                                        pendingToolCalls.delete(matchedToolInfo.toolId);
                                    }

                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "mcp_tool_result",
                                            data: {
                                                id: matchedToolId,
                                                mcpServer: { name: "Coze", id: "coze" },
                                                tool: {
                                                    name: matchedToolInfo?.toolName || "tool",
                                                    description: "",
                                                },
                                                input: matchedToolInfo?.input || {},
                                                output: data.content,
                                                timestamp: Date.now(),
                                                status: "success",
                                            },
                                        })}\n\n`,
                                    );
                                } else if (messageType === "verbose") {
                                    // Verbose 消息（流式 plugin 等场景）
                                    try {
                                        const verboseData = JSON.parse(data.content || "{}");
                                        if (verboseData.msg_type === "reasoning") {
                                            res.write(
                                                `data: ${JSON.stringify({
                                                    type: "reasoning",
                                                    data: verboseData.data,
                                                })}\n\n`,
                                            );
                                        }
                                    } catch {
                                        // 忽略解析失败
                                    }
                                } else if (messageType === "knowledge") {
                                    // 知识库召回
                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "context",
                                            data: data.content,
                                        })}\n\n`,
                                    );
                                } else if (messageType === "follow_up") {
                                    // 推荐问题（Coze 的自动追问）
                                    res.write(
                                        `data: ${JSON.stringify({
                                            type: "suggestions",
                                            data: [data.content],
                                        })}\n\n`,
                                    );
                                }
                            } else if (currentEventType === "conversation.chat.completed") {
                                if (data.usage) {
                                    tokenUsage = {
                                        totalTokens: data.usage.token_count || 0,
                                        promptTokens: data.usage.input_tokens || 0,
                                        completionTokens: data.usage.output_tokens || 0,
                                    };
                                }
                            }
                        } catch (_parseError) {
                            this.logger.warn(`[Coze] Failed to parse event: ${jsonStr}`);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return {
            fullContent,
            conversationId: thirdPartyConversationId,
            tokenUsage,
        };
    }

    /**
     * 获取第三方平台类型
     */
    private getThirdPartyPlatform(agent: Agent): string {
        return agent.createMode;
    }

    /**
     * 准备第三方对话上下文
     * 从 metadata 中获取第三方对话ID并设置到 DTO 中
     */
    private async prepareThirdPartyContext(
        dto: AgentChatDto,
        conversationRecord: AgentChatRecord | null,
        platform: string,
    ): Promise<AgentChatDto> {
        if (!conversationRecord?.metadata) {
            return {
                ...dto,
                conversationId: undefined,
            };
        }

        const thirdPartyConversationKey = `${platform}_conversation_id`;
        const thirdPartyConversationId = conversationRecord.metadata[thirdPartyConversationKey];

        if (thirdPartyConversationId) {
            return {
                ...dto,
                conversationId: thirdPartyConversationId,
            };
        }

        return {
            ...dto,
            conversationId: undefined,
        };
    }

    /**
     * 保存第三方对话ID到对话记录的metadata中
     */
    private async saveThirdPartyConversationId(
        conversationRecord: AgentChatRecord,
        platform: string,
        result: any,
    ): Promise<void> {
        if (!result?.conversationId) {
            return;
        }

        const thirdPartyConversationKey = `${platform}_conversation_id`;
        const updatedMetadata = {
            ...conversationRecord.metadata,
            [thirdPartyConversationKey]: result.conversationId,
            [`${platform}_last_updated`]: new Date().toISOString(),
        };

        try {
            await this.aiAgentChatRecordService.updateMetadata(
                conversationRecord.id,
                updatedMetadata,
            );
            this.logger.log(
                `[ThirdParty] Saved ${platform} conversation ID: ${result.conversationId} to record ${conversationRecord.id}`,
            );
        } catch (error) {
            this.logger.error(
                `[ThirdParty] Failed to save ${platform} conversation ID: ${error.message}`,
            );
        }
    }

    /**
     * 创建保存助手消息的回调函数（包含第三方对话ID处理）
     */
    private createSaveAssistantMessageCallbackWithThirdPartyId(
        conversationRecord: AgentChatRecord | null,
        platform: string,
    ) {
        return async (
            conversationId: string,
            agentId: string,
            userId: string,
            content: string,
            usage?: Record<string, any>,
            rawResponse?: Record<string, any>,
            metadata?: Record<string, any>,
            anonymousIdentifier?: string,
        ) => {
            // 提取第三方对话ID并保存到对话记录的metadata中
            // 优先从 metadata 中获取，其次从 rawResponse 中获取
            const thirdPartyConversationId =
                metadata?.conversationId || rawResponse?.conversationId;
            if (conversationRecord && thirdPartyConversationId) {
                this.logger.log(
                    `[ThirdParty] Saving ${platform} conversation ID: ${thirdPartyConversationId} for record ${conversationRecord.id}`,
                );
                await this.saveThirdPartyConversationId(conversationRecord, platform, {
                    conversationId: thirdPartyConversationId,
                });
            } else {
                this.logger.warn(
                    `[ThirdParty] No conversation ID found to save. metadata: ${JSON.stringify(metadata)}, rawResponse: ${JSON.stringify(rawResponse)}`,
                );
            }

            // 直接调用 messageHandler 保存消息，确保使用我们系统的对话记录ID
            return await this.messageHandler.saveAssistantMessage(
                conversationRecord ? conversationRecord.id : conversationId, // 确保使用系统内部ID
                agentId,
                userId,
                content,
                usage,
                rawResponse,
                metadata,
                anonymousIdentifier,
            );
        };
    }
}
