import {
    closeMcpClients,
    createClientsFromServerConfigs,
    extractTextFromParts,
    formatMessagesForTokenCount,
    getProvider,
    type McpClient,
    type McpServerConfig,
    mergeMcpTools,
    normalizeChatUsage,
    withEstimatedUsage,
} from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import type { LanguageModel } from "ai";
import {
    convertToModelMessages,
    createUIMessageStream,
    generateText,
    pipeUIMessageStreamToResponse,
    stepCountIs,
    ToolLoopAgent,
} from "ai";
import type { ServerResponse } from "http";
import { In } from "typeorm";
import { validate as isUUID } from "uuid";

import { AiMcpServerService } from "../../mcp/services/ai-mcp-server.service";
import { AiModelService } from "../../model/services/ai-model.service";
import { getWeather } from "../tools/weather.tools";
import type { ChatCompletionParams, UIMessage } from "../types/chat.types";
import { AiChatsMessageService } from "./ai-chat-message.service";
import { AiChatRecordService } from "./ai-chat-record.service";

type PartWithState = { type?: string; state?: string };

const VALID_PART_TYPES = new Set([
    "text",
    "file",
    "image",
    "reasoning",
    "tool-call",
    "tool-result",
    "step-start",
    "step-finish",
]);

@Injectable()
export class ChatCompletionService {
    private readonly logger = new Logger(ChatCompletionService.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly aiChatRecordService: AiChatRecordService,
        private readonly aiChatsMessageService: AiChatsMessageService,
        private readonly aiMcpServerService: AiMcpServerService,
    ) {}

    async streamChat(params: ChatCompletionParams, response: ServerResponse): Promise<void> {
        let conversationId = params.conversationId;
        const { isToolApprovalFlow = false } = params;
        const isNewConversation = !conversationId && params.saveConversation !== false;
        const shouldGenerateTitle = isNewConversation && !params.title;

        try {
            if (isNewConversation) {
                conversationId = (
                    await this.aiChatRecordService.createConversation(params.userId, {
                        title: params.title,
                    })
                ).id;
            }

            const model = await this.aiModelService.findOne({
                where: { id: params.modelId, isActive: true },
                relations: ["provider"],
            });

            if (!model?.provider?.isActive) {
                throw HttpErrorFactory.badRequest("模型或 Provider 不存在或未激活");
            }

            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId,
            );

            const provider = getProvider(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });

            const allMessages = isToolApprovalFlow
                ? await this.buildToolApprovalMessages(conversationId!, params.messages[0])
                : params.messages;

            const cleanedMessages = allMessages.map(({ id: _id, ...msg }) => ({
                ...msg,
                parts:
                    msg.parts?.filter((part) => {
                        const type = typeof part.type === "string" ? part.type : "";
                        return (
                            VALID_PART_TYPES.has(part.type) ||
                            type.startsWith("tool-") ||
                            type.startsWith("step-")
                        );
                    }) || [],
            }));

            const modelMessages = await convertToModelMessages(cleanedMessages);
            const messages = params.systemPrompt
                ? [{ role: "system" as const, content: params.systemPrompt }, ...modelMessages]
                : modelMessages;
            const promptTextForUsage = formatMessagesForTokenCount(messages);

            const { clients: mcpClients, tools: mcpTools } = await this.initializeMcpClients(
                params.mcpServerIds,
            );

            if (Object.keys(mcpTools).length > 0) {
                this.logger.log(
                    `MCP tools loaded: ${Object.keys(mcpTools).join(", ")} (${Object.keys(mcpTools).length} tools)`,
                );
            }

            const stream = createUIMessageStream({
                originalMessages: isToolApprovalFlow ? allMessages : undefined,
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({ type: "data-conversation-id", data: conversationId });
                    }

                    if (params.abortSignal?.aborted) {
                        await closeMcpClients(mcpClients);
                        return;
                    }

                    try {
                        const supportsToolCall = model.features?.some((f) => f.includes("tool"));

                        const agent = new ToolLoopAgent({
                            model: provider(model.model).model,
                            ...(supportsToolCall && {
                                tools: {
                                    getWeather,
                                    ...mcpTools,
                                },
                            }),
                            // 允许多步：tool call -> tool result -> 继续生成最终回复
                            // 使用 stepCountIs 确保工具调用后继续生成最终回复
                            // 设置为 10 步，允许多次工具调用和最终回复生成
                            stopWhen: stepCountIs(10),
                        });

                        const result = await agent.stream({
                            messages,
                            abortSignal: params.abortSignal,
                        });
                        result.consumeStream();

                        const uiMessageStream = result.toUIMessageStream({
                            originalMessages: allMessages,
                            onFinish: async ({
                                messages: finishedMessages,
                                responseMessage,
                                isAborted,
                            }) => {
                                try {
                                    if (params.saveConversation === false || !conversationId) {
                                        return;
                                    }

                                    const { textText, reasoningText, fullText } =
                                        extractTextFromParts(
                                            (responseMessage?.parts ?? []) as Array<{
                                                type?: unknown;
                                                text?: string;
                                            }>,
                                        );

                                    const rawUsage = await withEstimatedUsage(result, {
                                        model: model.model,
                                        inputText: promptTextForUsage,
                                        outputTextPromise: Promise.resolve(fullText),
                                    }).usage;

                                    const usage = normalizeChatUsage({
                                        rawUsage,
                                        model: model.model,
                                        textText,
                                        reasoningText,
                                    });

                                    writer.write({ type: "data-usage", data: usage });

                                    if (isToolApprovalFlow) {
                                        await this.saveToolApprovalMessages(
                                            finishedMessages,
                                            conversationId,
                                        );
                                    } else if (finishedMessages.length > 0) {
                                        await this.saveNormalFlowMessages(
                                            responseMessage,
                                            params,
                                            conversationId,
                                            usage,
                                            isAborted,
                                            writer,
                                        );

                                        if (shouldGenerateTitle && conversationId) {
                                            const firstUserMessage = allMessages.find(
                                                (m) => m.role === "user",
                                            );
                                            if (firstUserMessage) {
                                                await this.generateConversationTitle({
                                                    conversationId,
                                                    userId: params.userId,
                                                    message: firstUserMessage,
                                                    model: provider(model.model).model,
                                                }).catch(() => {});
                                            }
                                        }
                                    }
                                } catch (error) {
                                    this.logger.error(
                                        `Failed to save messages: ${error instanceof Error ? error.message : String(error)}`,
                                        error instanceof Error ? error.stack : undefined,
                                    );
                                } finally {
                                    // 确保在所有工具调用完成后再关闭 MCP 客户端连接
                                    await closeMcpClients(mcpClients);
                                }
                            },
                            onError: (error) => {
                                const errorMessage =
                                    error instanceof Error ? error.message : "An error occurred.";
                                this.logger.error(
                                    `Stream error: ${errorMessage}`,
                                    error instanceof Error ? error.stack : undefined,
                                );
                                // 出错时也要关闭 MCP 客户端连接
                                closeMcpClients(mcpClients).catch((closeError) => {
                                    this.logger.warn(
                                        `Failed to close MCP clients: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
                                    );
                                });
                                return errorMessage;
                            },
                        });

                        writer.merge(uiMessageStream);
                    } catch (error) {
                        // 如果发生错误，立即关闭客户端
                        await closeMcpClients(mcpClients);
                        throw error;
                    }
                },
            });

            pipeUIMessageStreamToResponse({ stream, response });
        } catch (error) {
            this.logger.error(
                `Stream chat error: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            this.handleError(error, response);
        }
    }

    private async initializeMcpClients(
        mcpServerIds?: string[],
    ): Promise<{ clients: McpClient[]; tools: Record<string, unknown> }> {
        if (!mcpServerIds?.length) {
            return { clients: [], tools: {} };
        }

        try {
            const mcpServers = await this.aiMcpServerService.findAll({
                where: {
                    id: In(mcpServerIds),
                    isDisabled: false,
                },
            });

            const serverConfigs: McpServerConfig[] = mcpServers
                .filter((server) => server.url && server.communicationType)
                .map((server) => ({
                    id: server.id,
                    name: server.name,
                    description: server.description || undefined,
                    url: server.url,
                    communicationType: server.communicationType,
                    customHeaders: server.customHeaders || undefined,
                }));

            if (!serverConfigs.length) {
                return { clients: [], tools: {} };
            }

            const clients = await createClientsFromServerConfigs(serverConfigs);
            const tools = await mergeMcpTools(clients);
            return { clients, tools };
        } catch (error) {
            this.logger.warn(
                `Failed to initialize MCP clients: ${error instanceof Error ? error.message : String(error)}`,
            );
            return { clients: [], tools: {} };
        }
    }

    private async buildToolApprovalMessages(
        conversationId: string,
        approvalMessage: UIMessage,
    ): Promise<UIMessage[]> {
        const historyMessages = await this.aiChatsMessageService.findAll({
            where: { conversationId },
            order: { sequence: "ASC" },
        });

        return historyMessages.map((m) => {
            const msg = m.message as UIMessage;
            const hasApprovalRequested =
                msg.role === "assistant" &&
                msg.parts?.some((part) => (part as PartWithState).state === "approval-requested");

            if (hasApprovalRequested && approvalMessage?.role === "assistant") {
                return approvalMessage;
            }
            return msg;
        });
    }

    private async saveToolApprovalMessages(
        finishedMessages: UIMessage[],
        conversationId: string,
    ): Promise<void> {
        const dbMessages = await this.aiChatsMessageService.findAll({
            where: { conversationId },
            order: { sequence: "DESC" },
        });

        const approvalDbMsg = dbMessages.find((m) => {
            const msg = m.message as UIMessage;
            return (
                msg.role === "assistant" &&
                msg.parts?.some((part) => (part as PartWithState).state === "approval-requested")
            );
        });

        if (!approvalDbMsg) return;

        const lastAssistantMsg = finishedMessages.findLast((m) => m.role === "assistant");
        if (!lastAssistantMsg) return;

        const cleanedParts = lastAssistantMsg.parts?.filter(
            (part) => !(part as PartWithState).type?.startsWith("data-"),
        );

        await this.aiChatsMessageService.updateMessage(approvalDbMsg.id, {
            message: { ...lastAssistantMsg, parts: cleanedParts },
        });
    }

    private async saveNormalFlowMessages(
        responseMessage: UIMessage | undefined,
        params: ChatCompletionParams,
        conversationId: string,
        usage:
            | {
                  inputTokens?: number;
                  outputTokens?: number;
                  totalTokens?: number;
                  cachedTokens?: number;
              }
            | undefined,
        isAborted: boolean,
        writer: { write: (part: { type: `data-${string}`; data: unknown }) => void },
    ): Promise<void> {
        const userMessageId = await this.ensureUserMessageSaved(params, conversationId, writer);

        if (!responseMessage?.parts?.length) return;

        const savedAssistantMessage = await this.aiChatsMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: responseMessage,
            tokens: usage
                ? {
                      inputTokens: usage.inputTokens ?? 0,
                      outputTokens: usage.outputTokens ?? 0,
                      totalTokens: usage.totalTokens ?? 0,
                  }
                : undefined,
            parentId: userMessageId,
        });

        if (isAborted) {
            await this.aiChatsMessageService.updateMessage(savedAssistantMessage.id, {
                status: "failed",
            });
        }

        writer.write({ type: "data-assistant-message-id", data: savedAssistantMessage.id });
    }

    private async ensureUserMessageSaved(
        params: ChatCompletionParams,
        conversationId: string,
        writer: { write: (part: { type: `data-${string}`; data: unknown }) => void },
    ): Promise<string | undefined> {
        if (params.isRegenerate) return params.regenerateParentId;

        const userMessage = [...params.messages].reverse().find((m) => m.role === "user");
        if (!userMessage) return undefined;

        if (isUUID(userMessage.id)) {
            writer.write({ type: "data-user-message-id", data: userMessage.id });
            return userMessage.id;
        }

        const existingMessage = await this.aiChatsMessageService.findByFrontendId(
            conversationId,
            userMessage.id,
        );
        if (existingMessage) {
            writer.write({ type: "data-user-message-id", data: existingMessage.id });
            return existingMessage.id;
        }

        const savedUserMessage = await this.aiChatsMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: userMessage,
            parentId: params.parentId,
        });

        writer.write({ type: "data-user-message-id", data: savedUserMessage.id });
        return savedUserMessage.id;
    }

    private async generateConversationTitle(args: {
        conversationId: string;
        userId: string;
        message: UIMessage;
        model: LanguageModel;
    }): Promise<void> {
        const { conversationId, userId, message, model } = args;

        const { fullText } = extractTextFromParts(
            (message.parts ?? []) as Array<{ type?: unknown; text?: string }>,
        );
        const input = fullText.trim().slice(0, 200);
        if (!input) return;

        const result = await generateText({
            model,
            prompt: `请为以下对话内容生成一个简洁的标题。要求：
1. 标题要简洁明了，不超过10个字
2. 准确概括对话的核心主题
3. 使用与对话内容相同的语言
4. 只输出标题，不要包含任何其他文字、标点或说明

对话内容：
${input}

标题：`,
        });
        const title = result.text
            .trim()
            .replace(/^["'「」『』]|["'「」『』]$/g, "")
            .slice(0, 200);
        if (!title) return;

        await this.aiChatRecordService.updateConversation(conversationId, userId, { title });
    }

    private handleError(error: unknown, response: ServerResponse): void {
        const errorMessage = error instanceof Error ? error.message : "An error occurred.";
        if (response.headersSent) return;

        response.writeHead(500, { "Content-Type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`);
        response.end();
    }
}
