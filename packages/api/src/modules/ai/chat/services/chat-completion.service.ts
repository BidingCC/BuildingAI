/**
 * AI SDK 标准对话服务
 *
 * 完全使用 AI SDK 的 streamText / generateText 函数
 * 返回的流可以直接通过 pipeUIMessageStreamToResponse 写入响应
 */

import {
    generateText,
    getProviderForText,
    streamText,
    type StreamTextResult,
} from "@buildingai/ai-sdk-new";
import { BaseService } from "@buildingai/base";
import { SecretService } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiChatMessage, AiChatRecord, AiModel, AiProvider } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";
import type { ModelMessage, UIMessage } from "ai";

import type {
    ChatCompletionParams,
    ChatContext,
    ConversationResult,
    ModelWithProvider,
    SaveMessageParams,
    TokenUsage,
} from "../types/chat.types";
import { calculatePower, convertUsage } from "../types/chat.types";

/**
 * 对话完成服务
 * 完全基于 AI SDK 标准实现
 */
@Injectable()
export class ChatCompletionService extends BaseService<AiChatMessage> {
    protected readonly logger = new Logger(ChatCompletionService.name);

    constructor(
        @InjectRepository(AiChatMessage)
        private readonly messageRepository: Repository<AiChatMessage>,
        @InjectRepository(AiChatRecord)
        private readonly conversationRepository: Repository<AiChatRecord>,
        @InjectRepository(AiModel)
        private readonly modelRepository: Repository<AiModel>,
        @InjectRepository(AiProvider)
        private readonly providerRepository: Repository<AiProvider>,
        private readonly secretService: SecretService,
    ) {
        super(messageRepository);
    }

    /**
     * 流式对话 - 返回 AI SDK StreamTextResult
     * 可以直接使用 result.pipeUIMessageStreamToResponse(res) 写入响应
     */
    async streamChat(params: ChatCompletionParams): Promise<{
        stream: StreamTextResult<Record<string, never>, never>;
        context: ChatContext;
        userMessageId: string;
    }> {
        const startTime = Date.now();

        // 1. 获取模型配置
        const modelConfig = await this.getModelConfig(params.modelId);

        // 2. 获取或创建对话
        const { conversation } = await this.getOrCreateConversation(
            params.userId,
            params.conversationId,
            params.title,
            modelConfig.model.id,
        );

        // 3. 构建上下文
        const context: ChatContext = {
            conversationId: conversation.id,
            userId: params.userId,
            modelConfig,
            saveConversation: params.saveConversation !== false,
            startTime,
            abortSignal: params.abortSignal,
        };

        // 4. 保存用户消息
        let userMessageId: string | undefined;
        if (context.saveConversation && params.messages.length > 0) {
            const lastUserMessage = params.messages[params.messages.length - 1];
            if (lastUserMessage.role === "user") {
                const userMessage = await this.saveMessage({
                    conversationId: context.conversationId,
                    modelId: modelConfig.model.id,
                    role: "user",
                    content: this.extractTextFromUIMessage(lastUserMessage),
                    status: "completed",
                });
                userMessageId = userMessage.id;
            }
        }

        // 5. 转换消息格式
        const modelMessages = this.convertToModelMessages(params.messages, params.systemPrompt);

        // 6. 获取 Provider
        const providerFn = getProviderForText(modelConfig.provider.provider, {
            apiKey: modelConfig.apiKey,
            baseURL: modelConfig.baseURL,
        });
        const { model } = providerFn(modelConfig.model.model);

        // 7. 调用 AI SDK streamText
        const stream = streamText({
            model,
            messages: modelMessages,
            abortSignal: params.abortSignal,
            onFinish: async ({ text, usage, finishReason }) => {
                // 流结束时保存助手消息
                if (context.saveConversation) {
                    const tokenUsage = convertUsage(usage);
                    const consumedPower = calculatePower(tokenUsage, modelConfig.model.billingRule);
                    const processingTime = Date.now() - startTime;

                    await this.saveMessage({
                        conversationId: context.conversationId,
                        modelId: modelConfig.model.id,
                        role: "assistant",
                        content: text,
                        usage: tokenUsage,
                        finishReason,
                        consumedPower,
                        processingTime,
                        status: "completed",
                        parentMessageId: userMessageId,
                    });

                    // 更新对话统计
                    await this.updateConversationStats(context.conversationId, tokenUsage);

                    // TODO: 扣费逻辑
                    this.logger.debug(`对话完成，消耗积分: ${consumedPower}`);
                }
            },
        });

        return {
            stream: stream as unknown as StreamTextResult<Record<string, never>, never>,
            context,
            userMessageId: userMessageId || "",
        };
    }

    /**
     * 非流式对话 - 返回完整结果
     */
    async generateChat(params: ChatCompletionParams): Promise<{
        conversationId: string;
        messageId: string;
        content: string;
        usage: TokenUsage;
        finishReason: string;
        consumedPower: number;
        processingTime: number;
    }> {
        const startTime = Date.now();

        // 1. 获取模型配置
        const modelConfig = await this.getModelConfig(params.modelId);

        // 2. 获取或创建对话
        const { conversation } = await this.getOrCreateConversation(
            params.userId,
            params.conversationId,
            params.title,
            modelConfig.model.id,
        );

        // 3. 保存用户消息
        let userMessageId: string | undefined;
        if (params.saveConversation !== false && params.messages.length > 0) {
            const lastUserMessage = params.messages[params.messages.length - 1];
            if (lastUserMessage.role === "user") {
                const userMessage = await this.saveMessage({
                    conversationId: conversation.id,
                    modelId: modelConfig.model.id,
                    role: "user",
                    content: this.extractTextFromUIMessage(lastUserMessage),
                    status: "completed",
                });
                userMessageId = userMessage.id;
            }
        }

        // 4. 转换消息格式
        const modelMessages = this.convertToModelMessages(params.messages, params.systemPrompt);

        // 5. 获取 Provider
        const providerFn = getProviderForText(modelConfig.provider.provider, {
            apiKey: modelConfig.apiKey,
            baseURL: modelConfig.baseURL,
        });
        const { model } = providerFn(modelConfig.model.model);

        // 6. 调用 AI SDK generateText
        const result = await generateText({
            model,
            messages: modelMessages,
            abortSignal: params.abortSignal,
        });

        const processingTime = Date.now() - startTime;
        const tokenUsage = convertUsage(result.usage);
        const consumedPower = calculatePower(tokenUsage, modelConfig.model.billingRule);

        // 7. 保存助手消息
        let assistantMessageId = "";
        if (params.saveConversation !== false) {
            const assistantMessage = await this.saveMessage({
                conversationId: conversation.id,
                modelId: modelConfig.model.id,
                role: "assistant",
                content: result.text,
                usage: tokenUsage,
                finishReason: result.finishReason,
                consumedPower,
                processingTime,
                status: "completed",
                parentMessageId: userMessageId,
            });
            assistantMessageId = assistantMessage.id;

            // 更新对话统计
            await this.updateConversationStats(conversation.id, tokenUsage);
        }

        return {
            conversationId: conversation.id,
            messageId: assistantMessageId,
            content: result.text,
            usage: tokenUsage,
            finishReason: result.finishReason,
            consumedPower,
            processingTime,
        };
    }

    /**
     * 续流 - 继续之前的对话
     */
    async continueChat(
        userId: string,
        conversationId: string,
        abortSignal?: AbortSignal,
    ): Promise<{
        stream: StreamTextResult<Record<string, never>, never>;
        context: ChatContext;
    }> {
        // 1. 获取对话
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId, isDeleted: false },
        });

        if (!conversation) {
            throw HttpErrorFactory.notFound("对话不存在");
        }

        // 2. 获取历史消息
        const messages = await this.messageRepository.find({
            where: { conversationId },
            order: { sequence: "ASC" },
        });

        if (messages.length === 0) {
            throw HttpErrorFactory.badRequest("对话没有消息记录");
        }

        // 3. 转换为 UIMessage 格式
        const uiMessages: UIMessage[] = messages.map((msg) => {
            const content =
                typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            return {
                id: msg.id,
                role: msg.role as UIMessage["role"],
                parts: [{ type: "text", text: content }],
            };
        });

        // 4. 获取模型配置（使用最后一条消息的模型）
        const lastMessage = messages[messages.length - 1];
        const modelConfig = await this.getModelConfig(lastMessage.modelId);

        // 5. 调用流式对话
        return this.streamChat({
            userId,
            conversationId,
            modelId: modelConfig.model.id,
            messages: uiMessages,
            saveConversation: true,
            abortSignal,
        });
    }

    // ==================== Private Methods ====================

    /**
     * 获取模型配置（包含 Provider 和 API Key）
     */
    private async getModelConfig(modelId: string): Promise<ModelWithProvider> {
        const model = await this.modelRepository.findOne({
            where: { id: modelId, isActive: true },
            relations: ["provider"],
        });

        if (!model) {
            throw HttpErrorFactory.notFound("模型不存在或未启用");
        }

        const provider = model.provider;
        if (!provider || !provider.isActive) {
            throw HttpErrorFactory.badRequest("模型关联的供应商不存在或未启用");
        }

        // 获取 API Key
        let apiKey = "";
        let baseURL: string | undefined;

        if (provider.bindSecretId) {
            const secretConfig = await this.secretService.getConfigKeyValuePairs(
                provider.bindSecretId,
            );
            apiKey = secretConfig["apiKey"]?.value || secretConfig["api_key"]?.value || "";
            baseURL = secretConfig["baseURL"]?.value || secretConfig["base_url"]?.value;
        }

        if (!apiKey) {
            throw HttpErrorFactory.badRequest(`供应商 ${provider.name} 未配置 API Key`);
        }

        return {
            model,
            provider,
            apiKey,
            baseURL,
        };
    }

    /**
     * 获取或创建对话
     */
    private async getOrCreateConversation(
        userId: string,
        conversationId?: string,
        title?: string,
        modelId?: string,
    ): Promise<ConversationResult> {
        if (conversationId) {
            const conversation = await this.conversationRepository.findOne({
                where: { id: conversationId, userId, isDeleted: false },
            });

            if (conversation) {
                return { conversation, isNew: false };
            }
        }

        // 创建新对话
        const conversation = this.conversationRepository.create({
            userId,
            title: title || "新对话",
            status: "active",
            messageCount: 0,
            totalTokens: 0,
            modelId,
        });

        const saved = await this.conversationRepository.save(conversation);
        return { conversation: saved, isNew: true };
    }

    /**
     * 保存消息
     */
    private async saveMessage(params: SaveMessageParams): Promise<AiChatMessage> {
        // 获取下一个序号
        const lastMessage = await this.messageRepository.findOne({
            where: { conversationId: params.conversationId },
            order: { sequence: "DESC" },
        });

        const sequence = (lastMessage?.sequence || 0) + 1;

        const message = this.messageRepository.create({
            conversationId: params.conversationId,
            modelId: params.modelId,
            role: params.role,
            content: params.content,
            messageType: "text",
            usage: params.usage,
            finishReason: params.finishReason,
            userConsumedPower: params.consumedPower,
            processingTime: params.processingTime,
            status: params.status || "completed",
            errorMessage: params.errorMessage,
            parentMessageId: params.parentMessageId,
            sequence,
        });

        return await this.messageRepository.save(message);
    }

    /**
     * 更新对话统计信息
     */
    private async updateConversationStats(
        conversationId: string,
        usage: TokenUsage,
    ): Promise<void> {
        try {
            const conversation = await this.conversationRepository.findOne({
                where: { id: conversationId },
            });

            if (conversation) {
                await this.conversationRepository.update(conversationId, {
                    messageCount: (conversation.messageCount || 0) + 2, // user + assistant
                    totalTokens: (conversation.totalTokens || 0) + usage.totalTokens,
                    updatedAt: new Date(),
                });
            }
        } catch (error) {
            this.logger.error(`更新对话统计失败: ${error.message}`);
        }
    }

    /**
     * 将 UIMessage[] 转换为 ModelMessage[]
     */
    private convertToModelMessages(messages: UIMessage[], systemPrompt?: string): ModelMessage[] {
        const modelMessages: ModelMessage[] = [];

        // 添加系统提示词
        if (systemPrompt) {
            modelMessages.push({
                role: "system",
                content: systemPrompt,
            });
        }

        // 转换用户消息
        for (const msg of messages) {
            if (msg.role === "user" || msg.role === "assistant") {
                modelMessages.push({
                    role: msg.role,
                    content: this.extractTextFromUIMessage(msg),
                });
            } else if (msg.role === "system") {
                modelMessages.push({
                    role: "system",
                    content: this.extractTextFromUIMessage(msg),
                });
            }
        }

        return modelMessages;
    }

    /**
     * 从 UIMessage 中提取文本内容
     */
    private extractTextFromUIMessage(message: UIMessage): string {
        if (!message.parts || message.parts.length === 0) {
            return "";
        }

        return message.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join("");
    }
}
