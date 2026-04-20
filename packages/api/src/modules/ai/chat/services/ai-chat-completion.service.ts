import {
    closeMcpClients,
    createClientsFromServerConfigs,
    getProvider,
    getReasoningOptions,
    type McpClient,
    type McpServerConfig,
    mergeMcpTools,
} from "@buildingai/ai-sdk";
import { withEstimatedUsage } from "@buildingai/ai-sdk/utils/text-with-usage";
import {
    extractTextFromParts,
    formatMessagesForTokenCount,
    normalizeChatUsage,
} from "@buildingai/ai-sdk/utils/token-usage";
import {
    buildAttachedFilesSection,
    buildUserPreferencesSection,
} from "@buildingai/ai-toolkit/prompts";
import {
    createDalle2ImageGenerationTool,
    createDalle3ImageGenerationTool,
    createDeepResearchTool,
    createGptImageGenerationTool,
    createReadAttachedFileTool,
    getWeather,
} from "@buildingai/ai-toolkit/tools";
import {
    parseFile,
    processFiles as processFilesUtil,
    type ProcessFilesWriter,
    stripLocalhostFileParts,
} from "@buildingai/ai-toolkit/utils";
import { SecretService } from "@buildingai/core/modules";
import { UserDictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import type { ChatMessageUsage } from "@buildingai/types";
import type { ChatUIMessage } from "@buildingai/types";
import { getProviderSecret } from "@buildingai/utils";
import { UserService } from "@modules/user/services/user.service";
import { Injectable, Logger } from "@nestjs/common";
import type { LanguageModel, Tool } from "ai";
import {
    convertToModelMessages,
    createUIMessageStream,
    generateId,
    pipeUIMessageStreamToResponse,
    stepCountIs,
    ToolLoopAgent,
} from "ai";
import type { ServerResponse } from "http";
import { In } from "typeorm";
import { validate as isUUID } from "uuid";

import { FollowUpSuggestionsHandler } from "../../agents/handlers/follow-up-suggestions";
import { AiMcpServerService } from "../../mcp/services/ai-mcp-server.service";
import { MemoryService } from "../../memory/services/memory.service";
import { MemoryExtractionService } from "../../memory/services/memory-extraction.service";
import { AiModelService } from "../../model/services/ai-model.service";
import { ChatBillingHandler } from "../handlers/chat-billing.handler";
import { ChatTitleHandler } from "../handlers/chat-title.handler";
import type { ChatCompletionParams, UIMessage } from "../types/chat.types";
import { AiChatsMessageService } from "./ai-chat-message.service";
import { AiChatRecordService } from "./ai-chat-record.service";
import { ChatConfigService } from "./chat-config.service";

type PartWithState = { type?: string; state?: string };
type DataWriter = { write: (part: { type: `data-${string}`; data: unknown }) => void };
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
        private readonly chatBillingHandler: ChatBillingHandler,
        private readonly chatTitleHandler: ChatTitleHandler,
        private readonly memoryService: MemoryService,
        private readonly memoryExtractionService: MemoryExtractionService,
        private readonly userDictService: UserDictService,
        private readonly chatConfigService: ChatConfigService,
        private readonly userService: UserService,
        private readonly followUpSuggestionsHandler: FollowUpSuggestionsHandler,
    ) {}

    private getErrorMsg(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private async getLanguageModelByModelId(modelId: string): Promise<{
        model: LanguageModel;
        providerId: string;
        billingRule?: { power: number; tokens: number };
    } | null> {
        if (!modelId?.trim()) return null;
        const model = await this.aiModelService.findOne({
            where: { id: modelId.trim(), isActive: true },
            relations: ["provider"],
        });
        if (!model?.provider?.isActive) return null;
        const providerSecret = await this.secretService.getConfigKeyValuePairs(
            model.provider.bindSecretId,
        );
        const provider = getProvider(model.provider.provider, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
        });
        return {
            model: provider(model.model).model,
            providerId: model.provider.provider,
            billingRule: model.billingRule ?? undefined,
        };
    }

    async streamChat(params: ChatCompletionParams, response: ServerResponse): Promise<void> {
        let conversationId = params.conversationId;
        const { isToolApprovalFlow = false } = params;
        const isNew = !conversationId && params.saveConversation !== false;
        const needTitle = isNew && !params.title;

        try {
            if (isNew) {
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

            const messages = isToolApprovalFlow
                ? await this.buildApprovalMessages(conversationId!, params.messages[0])
                : params.messages;

            const cleaned = this.clean(messages);

            const { clients: mcpClients, tools: mcpTools } = await this.initMcpClients(
                params.mcpServerIds,
            );

            const chatConfig = await this.chatConfigService.getChatConfig();

            const stream = createUIMessageStream({
                originalMessages: isToolApprovalFlow ? messages : undefined,
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({
                            type: "data-conversation-id",
                            data: conversationId,
                            transient: true,
                        } as any);
                    }
                    const assistantMessageId = isToolApprovalFlow
                        ? (messages.findLast((message) => message.role === "assistant")?.id ??
                          generateId())
                        : generateId();

                    writer.write({
                        type: "start",
                        messageId: assistantMessageId,
                    });

                    if (params.abortSignal?.aborted) {
                        await closeMcpClients(mcpClients);
                        return;
                    }

                    try {
                        if (params.userId && model.membershipLevel?.length > 0) {
                            await this.validateUserMembershipForModel(
                                params.userId,
                                model.membershipLevel,
                            );
                        }

                        if (params.userId && model.billingRule) {
                            await this.chatBillingHandler.validateUserPower(
                                params.userId,
                                model.billingRule,
                            );
                        }
                        const { messages: processed, documentContents } = await processFilesUtil(
                            cleaned,
                            writer as ProcessFilesWriter,
                            parseFile,
                        );

                        const hasToolSupport = Boolean(
                            model.features?.some((f) => f.includes("tool")),
                        );
                        const useToolForDocuments = hasToolSupport && documentContents.length > 0;

                        const userPrefs = params.userId
                            ? await this.userDictService.getGroupValues<string | boolean>(
                                  params.userId,
                                  "ai",
                              )
                            : ({} as Record<string, string | boolean>);
                        const referSavedMemories = userPrefs.referSavedMemories !== false;
                        const userMemories =
                            params.userId && referSavedMemories
                                ? await this.memoryService.getUserMemories(params.userId, 20)
                                : [];
                        const systemPrompt = this.buildSystemPrompt(
                            params.systemPrompt,
                            documentContents,
                            useToolForDocuments,
                            userMemories,
                            (userPrefs.chatStyle as string) ?? undefined,
                            (userPrefs.customInstruction as string) ?? undefined,
                        );
                        const modelMsgs = (
                            await convertToModelMessages(stripLocalhostFileParts(processed))
                        ).filter(
                            // Drop ghost assistant messages produced when data-only
                            // parts appear before a step-start boundary
                            (msg) =>
                                msg.role !== "assistant" ||
                                (Array.isArray(msg.content) && msg.content.length > 0),
                        );
                        const finalMessages = systemPrompt
                            ? [{ role: "system" as const, content: systemPrompt }, ...modelMsgs]
                            : modelMsgs;
                        const promptText = formatMessagesForTokenCount(finalMessages);

                        const tools = this.buildTools(
                            model.provider.provider,
                            provider,
                            mcpTools,
                            useToolForDocuments ? documentContents : undefined,
                        );

                        const providerOptions = model.enableThinkingParam
                            ? getReasoningOptions(model.provider.provider, {
                                  thinking: params.feature?.thinking ?? false,
                              })
                            : {};

                        const agent = new ToolLoopAgent({
                            model: provider(model.model).model,
                            ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
                            ...(hasToolSupport && Object.keys(tools).length > 0 && { tools }),
                            stopWhen: stepCountIs(10),
                        });

                        const result = await agent.stream({
                            messages: finalMessages,
                            abortSignal: params.abortSignal,
                        });
                        result.consumeStream();

                        const uiMessageStream = result.toUIMessageStream({
                            sendStart: false,
                            originalMessages: processed,
                            onFinish: async ({
                                messages: finished,
                                responseMessage: response,
                                isAborted: aborted,
                            }) => {
                                try {
                                    if (params.saveConversation === false || !conversationId) {
                                        return;
                                    }

                                    const { textText, reasoningText, fullText } =
                                        extractTextFromParts(
                                            (response?.parts ?? []) as Array<{
                                                type?: unknown;
                                                text?: string;
                                            }>,
                                        );

                                    const rawUsage = await withEstimatedUsage(result, {
                                        model: model.model,
                                        inputText: promptText,
                                        outputTextPromise: Promise.resolve(fullText),
                                    }).usage;

                                    const baseUsage = normalizeChatUsage({
                                        rawUsage,
                                        model: model.model,
                                        textText,
                                        reasoningText,
                                    }) as ChatMessageUsage;

                                    const totalUsage: ChatMessageUsage = { ...baseUsage };

                                    let userConsumedPower = 0;

                                    const hasPendingApproval = this.hasPendingApproval(response);
                                    const previousApprovalUsage =
                                        isToolApprovalFlow && conversationId
                                            ? await this.getPendingApprovalUsage(conversationId)
                                            : undefined;
                                    const billingUsage = isToolApprovalFlow
                                        ? this.mergeUsage(previousApprovalUsage, baseUsage)
                                        : baseUsage;

                                    if (!hasPendingApproval && model.billingRule && billingUsage) {
                                        try {
                                            userConsumedPower =
                                                await this.chatBillingHandler.deduct({
                                                    userId: params.userId,
                                                    conversationId,
                                                    usage: billingUsage,
                                                    billingRule: model.billingRule,
                                                });
                                        } catch (err) {
                                            this.logger.warn(
                                                `Chat billing deduct failed: ${this.getErrorMsg(err)}`,
                                            );
                                        }
                                    }

                                    if (!isToolApprovalFlow && finished.length > 0) {
                                        const { extraTokens, extraPower } =
                                            await this.applyPostProcessingUsage({
                                                needTitle,
                                                chatConfig,
                                                messages,
                                                finished,
                                                fullText,
                                                params,
                                                conversationId,
                                            });
                                        if (extraTokens > 0) {
                                            totalUsage.totalTokens =
                                                (totalUsage.totalTokens ?? 0) + extraTokens;
                                            totalUsage.extraTokens = extraTokens;
                                        }
                                        if (extraPower > 0) {
                                            userConsumedPower += extraPower;
                                        }
                                    }

                                    let followUpExtraPower = 0;
                                    if (
                                        !isToolApprovalFlow &&
                                        finished.length > 0 &&
                                        !aborted &&
                                        fullText?.trim() &&
                                        chatConfig.followUpModelId &&
                                        conversationId &&
                                        params.abortSignal?.aborted !== true
                                    ) {
                                        const lastUserText = this.extractLastUserText(messages);
                                        if (lastUserText.trim()) {
                                            const followModel =
                                                await this.getLanguageModelByModelId(
                                                    chatConfig.followUpModelId,
                                                );
                                            if (followModel) {
                                                try {
                                                    const suggestions =
                                                        await this.followUpSuggestionsHandler.generateSuggestions(
                                                            lastUserText,
                                                            fullText,
                                                            followModel.model,
                                                            followModel.providerId,
                                                        );
                                                    if (suggestions.length > 0) {
                                                        writer.write({
                                                            type: "data-follow-up-suggestions",
                                                            data: suggestions,
                                                        });
                                                    }
                                                    if (params.userId && followModel.billingRule) {
                                                        try {
                                                            followUpExtraPower =
                                                                await this.chatBillingHandler.deductForFollowUpSuggestions(
                                                                    params.userId,
                                                                    conversationId,
                                                                    followModel.billingRule,
                                                                );
                                                        } catch (err) {
                                                            this.logger.warn(
                                                                `Chat follow-up billing failed: ${this.getErrorMsg(err)}`,
                                                            );
                                                        }
                                                    }
                                                } catch (err) {
                                                    this.logger.warn(
                                                        `Follow-up suggestions failed: ${this.getErrorMsg(err)}`,
                                                    );
                                                }
                                            }
                                        }
                                    }

                                    if (followUpExtraPower > 0) {
                                        userConsumedPower += followUpExtraPower;
                                    }

                                    writer.write({
                                        type: "data-usage",
                                        data: {
                                            ...totalUsage,
                                            userConsumedPower,
                                        },
                                    });

                                    if (isToolApprovalFlow) {
                                        await this.saveApprovalMessages(
                                            finished,
                                            conversationId,
                                            totalUsage,
                                            userConsumedPower,
                                        );
                                    } else if (finished.length > 0) {
                                        const responseWithId = response
                                            ? { ...response, id: assistantMessageId }
                                            : response;
                                        await this.saveMessages(
                                            responseWithId,
                                            finished,
                                            params,
                                            conversationId,
                                            totalUsage,
                                            userConsumedPower,
                                            aborted,
                                            writer,
                                        );
                                    }
                                } catch (error) {
                                    this.logger.error(
                                        `Failed to save messages: ${this.getErrorMsg(error)}`,
                                        error instanceof Error ? error.stack : undefined,
                                    );
                                } finally {
                                    await closeMcpClients(mcpClients);
                                }
                            },
                            onError: (error) => {
                                const errorMsg = this.getErrorMsg(error);
                                const errorObj: Record<string, unknown> = {
                                    name: error instanceof Error ? error.name : "Error",
                                    message: errorMsg,
                                    ...(error instanceof Error &&
                                        error.cause && { cause: error.cause }),
                                };

                                this.logger.error(
                                    `Stream error: ${errorMsg}\nDetails: ${JSON.stringify(errorObj, null, 2)}`,
                                    error instanceof Error ? error.stack : undefined,
                                );

                                closeMcpClients(mcpClients).catch((closeError) => {
                                    this.logger.warn(
                                        `Failed to close MCP clients: ${this.getErrorMsg(closeError)}`,
                                    );
                                });
                                return errorMsg;
                            },
                        });

                        writer.merge(uiMessageStream);
                    } catch (error) {
                        await closeMcpClients(mcpClients);
                        throw error;
                    }
                },
            });

            pipeUIMessageStreamToResponse({ stream, response });
        } catch (error) {
            const errorMsg = this.getErrorMsg(error);
            this.logger.error(
                `Stream chat error: ${errorMsg}`,
                error instanceof Error ? error.stack : undefined,
            );
            this.handleError(error, response);
        }
    }

    private async initMcpClients(
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
                    description: server.description ?? undefined,
                    url: server.url,
                    communicationType: server.communicationType,
                    headers: server.headers ?? undefined,
                }));

            if (!serverConfigs.length) {
                return { clients: [], tools: {} };
            }

            const clients = await createClientsFromServerConfigs(serverConfigs);
            const tools = await mergeMcpTools(clients);
            return { clients, tools };
        } catch (error) {
            this.logger.warn(`Failed to initialize MCP clients: ${this.getErrorMsg(error)}`);
            return { clients: [], tools: {} };
        }
    }

    private needsApproval(msg: UIMessage): boolean {
        return (
            msg.role === "assistant" &&
            msg.parts?.some((part) => (part as PartWithState).state === "approval-requested")
        );
    }

    private hasPendingApproval(msg?: UIMessage): boolean {
        return !!msg?.parts?.some((part) => (part as PartWithState).state === "approval-requested");
    }

    private async getPendingApprovalUsage(
        conversationId: string,
    ): Promise<ChatMessageUsage | undefined> {
        const dbMsgs = await this.aiChatsMessageService.findAll({
            where: { conversationId },
            order: { sequence: "DESC" },
        });
        const approvalMsg = dbMsgs.find((m) => this.needsApproval(m.message as UIMessage));
        return (approvalMsg?.message as ChatUIMessage | undefined)?.usage;
    }

    private async buildApprovalMessages(
        conversationId: string,
        approvalMsg: UIMessage,
    ): Promise<UIMessage[]> {
        const history = await this.aiChatsMessageService.findAll({
            where: { conversationId },
            order: { sequence: "ASC" },
        });

        return history.map((m) => {
            const msg = m.message as UIMessage;
            return this.needsApproval(msg) && approvalMsg?.role === "assistant" ? approvalMsg : msg;
        });
    }

    private async saveApprovalMessages(
        finished: UIMessage[],
        conversationId: string,
        usage?: ChatMessageUsage,
        userConsumedPower?: number,
    ): Promise<void> {
        const dbMsgs = await this.aiChatsMessageService.findAll({
            where: { conversationId },
            order: { sequence: "DESC" },
        });

        const approvalMsg = dbMsgs.find((m) => this.needsApproval(m.message as UIMessage));
        const lastAssistant = finished.findLast((m) => m.role === "assistant");

        if (!approvalMsg || !lastAssistant) return;

        const cleanedParts = lastAssistant.parts?.filter(
            (part) => !(part as PartWithState).type?.startsWith("data-"),
        );

        const previousMessage = approvalMsg.message as ChatUIMessage;
        const mergedUsage = this.mergeUsage(previousMessage.usage, usage);
        const mergedUserConsumedPower =
            previousMessage.userConsumedPower != null || userConsumedPower != null
                ? (previousMessage.userConsumedPower ?? 0) + (userConsumedPower ?? 0)
                : undefined;

        const messageToSave: ChatUIMessage = {
            ...lastAssistant,
            parts: cleanedParts,
            ...(mergedUsage && { usage: mergedUsage }),
            ...(mergedUserConsumedPower != null && { userConsumedPower: mergedUserConsumedPower }),
        } as ChatUIMessage;

        await this.aiChatsMessageService.updateMessage(approvalMsg.id, {
            message: messageToSave,
        });
    }

    private mergeUsage(
        previous?: ChatMessageUsage,
        current?: ChatMessageUsage,
    ): ChatMessageUsage | undefined {
        if (!previous) return current;
        if (!current) return previous;

        return {
            ...previous,
            ...current,
            inputTokens: (previous.inputTokens ?? 0) + (current.inputTokens ?? 0),
            outputTokens: (previous.outputTokens ?? 0) + (current.outputTokens ?? 0),
            totalTokens: (previous.totalTokens ?? 0) + (current.totalTokens ?? 0),
            extraTokens: (previous.extraTokens ?? 0) + (current.extraTokens ?? 0),
            reasoningTokens: (previous.reasoningTokens ?? 0) + (current.reasoningTokens ?? 0),
            cachedInputTokens: (previous.cachedInputTokens ?? 0) + (current.cachedInputTokens ?? 0),
            inputTokenDetails: {
                noCacheTokens:
                    (previous.inputTokenDetails?.noCacheTokens ?? 0) +
                    (current.inputTokenDetails?.noCacheTokens ?? 0),
                cacheReadTokens:
                    (previous.inputTokenDetails?.cacheReadTokens ?? 0) +
                    (current.inputTokenDetails?.cacheReadTokens ?? 0),
                cacheWriteTokens:
                    (previous.inputTokenDetails?.cacheWriteTokens ?? 0) +
                    (current.inputTokenDetails?.cacheWriteTokens ?? 0),
            },
            outputTokenDetails: {
                textTokens:
                    (previous.outputTokenDetails?.textTokens ?? 0) +
                    (current.outputTokenDetails?.textTokens ?? 0),
                reasoningTokens:
                    (previous.outputTokenDetails?.reasoningTokens ?? 0) +
                    (current.outputTokenDetails?.reasoningTokens ?? 0),
            },
            raw: current.raw ?? previous.raw,
        };
    }

    private async saveMessages(
        response: UIMessage | undefined,
        finished: UIMessage[],
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
        userConsumedPower: number,
        aborted: boolean,
        writer: DataWriter,
    ): Promise<void> {
        const userMsgId = await this.saveUserMessage(finished, params, conversationId, writer);

        if (!response?.parts?.length) return;

        const userMsg = finished.findLast((m) => m.role === "user");
        const fileParseParts = userMsg?.parts?.filter(
            (part) => typeof part.type === "string" && part.type.startsWith("data-file-parse-"),
        );

        const messageToSave: ChatUIMessage = {
            ...(fileParseParts?.length && response.parts
                ? { ...response, parts: [...fileParseParts, ...response.parts] }
                : response),
            usage,
            ...(userConsumedPower != null && { userConsumedPower }),
        } as ChatUIMessage;

        const saved = await this.aiChatsMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: messageToSave,
            parentId: userMsgId,
        });

        if (aborted) {
            await this.aiChatsMessageService.updateMessage(saved.id, {
                status: "failed",
            });
        }

        writer.write({ type: "data-assistant-message-id", data: saved.id });
    }

    private async saveUserMessage(
        finished: UIMessage[],
        params: ChatCompletionParams,
        conversationId: string,
        writer: DataWriter,
    ): Promise<string | undefined> {
        if (params.isRegenerate) return params.regenerateParentId;

        const userMsg =
            params.messages.findLast((m) => m.role === "user") ??
            finished.findLast((m) => m.role === "user");
        if (!userMsg) return undefined;

        if (isUUID(userMsg.id)) {
            writer.write({ type: "data-user-message-id", data: userMsg.id });
            return userMsg.id;
        }

        const existing = await this.aiChatsMessageService.findByFrontendId(
            conversationId,
            userMsg.id,
        );
        if (existing) {
            writer.write({ type: "data-user-message-id", data: existing.id });
            return existing.id;
        }

        const saved = await this.aiChatsMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: userMsg as ChatUIMessage,
            parentId: params.parentId,
        });

        writer.write({ type: "data-user-message-id", data: saved.id });
        return saved.id;
    }

    private buildConversationText(messages: UIMessage[]): string {
        const lastUser = messages.findLast((m) => m.role === "user");
        if (!lastUser) return "";
        const content = extractTextFromParts(lastUser.parts ?? []).fullText;
        return `user: ${content}`;
    }

    private extractLastUserText(messages: UIMessage[]): string {
        const lastUser = messages.findLast((m) => m.role === "user");
        return lastUser ? extractTextFromParts(lastUser.parts ?? []).fullText : "";
    }

    private async applyPostProcessingUsage(params: {
        needTitle: boolean;
        chatConfig: {
            memoryModelId?: string;
            titleModelId?: string;
            followUpModelId?: string;
        };
        messages: UIMessage[];
        finished: UIMessage[];
        fullText: string | undefined;
        conversationId: string;
        params: ChatCompletionParams;
    }): Promise<{ extraTokens: number; extraPower: number }> {
        const { needTitle, chatConfig, messages, finished, fullText, conversationId } = params;
        const { params: chatParams } = params;
        let extraTokens = 0;
        let extraPower = 0;

        if (needTitle && chatConfig.titleModelId) {
            const firstUserMsg = messages.find((m) => m.role === "user");
            if (firstUserMsg) {
                const firstUserText = extractTextFromParts(
                    (firstUserMsg.parts ?? []) as Array<{ type?: unknown; text?: string }>,
                ).fullText;
                const titleModel = await this.getLanguageModelByModelId(chatConfig.titleModelId);
                if (titleModel) {
                    const { title, usageTokens } = await this.chatTitleHandler.generateTitle(
                        firstUserText,
                        titleModel.model,
                        titleModel.providerId,
                    );
                    if (title) {
                        await this.aiChatRecordService.updateConversation(
                            conversationId,
                            chatParams.userId,
                            {
                                title,
                            },
                        );
                    }
                    if (usageTokens && usageTokens > 0) {
                        extraTokens += usageTokens;
                    }
                    if (chatParams.userId && titleModel.billingRule) {
                        try {
                            const power = await this.chatBillingHandler.deductForTitleGeneration(
                                chatParams.userId,
                                conversationId,
                                titleModel.billingRule,
                            );
                            if (power > 0) extraPower += power;
                        } catch (err) {
                            this.logger.warn(`Chat title billing error: ${this.getErrorMsg(err)}`);
                        }
                    }
                }
            }
        }

        if (fullText !== undefined && chatConfig.memoryModelId) {
            const conversationText = this.buildConversationText(finished);
            const memoryModel = await this.getLanguageModelByModelId(chatConfig.memoryModelId);
            if (memoryModel) {
                try {
                    const { usageTokens } =
                        await this.memoryExtractionService.extractAndSaveMemories({
                            userId: chatParams.userId,
                            conversationId,
                            conversationText,
                            model: memoryModel.model,
                            memoryConfig: {
                                maxUserMemories: 20,
                            },
                        });
                    if (usageTokens && usageTokens > 0) {
                        extraTokens += usageTokens;
                    }
                    if (chatParams.userId && memoryModel.billingRule) {
                        try {
                            const power = await this.chatBillingHandler.deductForMemoryExtraction(
                                chatParams.userId,
                                conversationId,
                                memoryModel.billingRule,
                            );
                            if (power > 0) extraPower += power;
                        } catch (err) {
                            this.logger.warn(`Chat memory billing error: ${this.getErrorMsg(err)}`);
                        }
                    }
                } catch (err) {
                    this.logger.warn(`Chat memory extraction error: ${this.getErrorMsg(err)}`);
                }
            }
        }

        return { extraTokens, extraPower };
    }

    private buildSystemPrompt(
        basePrompt?: string,
        documents?: Array<{ filename: string; content: string }>,
        useToolForDocuments?: boolean,
        userMemories?: Array<{ content: string }>,
        chatStyle?: string,
        customInstruction?: string,
    ): string {
        const sections: string[] = [];
        const prefsSection = buildUserPreferencesSection(chatStyle, customInstruction);
        if (prefsSection) sections.push(prefsSection);
        if (userMemories?.length) {
            const memoryLines = userMemories.map((m) => `- ${m.content}`).join("\n");
            sections.push(
                `<user_memory>\nHere is what I know about the user from previous interactions:\n${memoryLines}\n</user_memory>`,
            );
        }
        if (basePrompt) sections.push(basePrompt);
        if (documents?.length) {
            const attachedSection = buildAttachedFilesSection(
                documents,
                useToolForDocuments ?? false,
            );
            if (attachedSection) sections.push(attachedSection);
        }
        return sections.join("\n\n");
    }

    private handleError(error: unknown, response: ServerResponse): void {
        if (response.headersSent) return;

        response.writeHead(500, { "Content-Type": "text/event-stream" });
        response.write(
            `data: ${JSON.stringify({ type: "error", error: this.getErrorMsg(error) })}\n\n`,
        );
        response.end();
    }

    private clean(messages: UIMessage[]): UIMessage[] {
        return messages.map((msg) => ({
            ...msg,
            parts:
                msg.parts?.filter((part) => {
                    const type = String(part.type ?? "");
                    return (
                        VALID_PART_TYPES.has(type) ||
                        type.startsWith("tool-") ||
                        type.startsWith("step-") ||
                        type.startsWith("data-file-parse-")
                    );
                }) ?? [],
        }));
    }

    private buildTools(
        providerId: string,
        provider: ReturnType<typeof getProvider>,
        mcpTools: Record<string, unknown>,
        documentContents?: Array<{ filename: string; content: string }>,
    ): Record<string, Tool> {
        const tools: Record<string, Tool> = {
            getWeather,
            ...mcpTools,
        };

        if (documentContents?.length) {
            tools.read_attached_file = createReadAttachedFileTool({
                documents: documentContents,
            });
        }

        if (providerId === "openai") {
            tools.dalle2ImageGeneration = createDalle2ImageGenerationTool(provider);
            tools.dalle3ImageGeneration = createDalle3ImageGenerationTool(provider);
            tools.gptImageGeneration = createGptImageGenerationTool(provider);
            tools.deepResearch = createDeepResearchTool(provider);
        }

        return tools;
    }

    /**
     * 校验用户会员等级是否有权限使用指定模型
     *
     * @param userId 用户ID
     * @param requiredMembershipLevels 模型要求的会员等级ID列表
     * @throws 如果用户会员等级不满足要求，抛出错误
     */
    private async validateUserMembershipForModel(
        userId: string,
        requiredMembershipLevels: string[],
    ): Promise<void> {
        const userMembership = await this.userService.getUserMembershipLevel(userId);

        // 如果用户没有会员等级，或者用户的会员等级不在允许列表中
        if (!userMembership || !requiredMembershipLevels.includes(userMembership.id)) {
            // 获取模型要求的会员等级名称
            const requiredLevelNames = await this.getMembershipLevelNames(requiredMembershipLevels);
            const requiredLevelsText = requiredLevelNames.join("、");

            const errorMessage = userMembership
                ? `该模型仅限${requiredLevelsText}会员使用，请升级会员后再试`
                : `该模型仅限${requiredLevelsText}会员使用，请开通会员后再试`;

            throw HttpErrorFactory.forbidden(errorMessage);
        }
    }

    /**
     * 根据会员等级ID列表获取会员等级名称列表
     *
     * @param levelIds 会员等级ID列表
     * @returns 会员等级名称列表
     */
    private async getMembershipLevelNames(levelIds: string[]): Promise<string[]> {
        const levels = await this.userService.getMembershipLevelsByIds(levelIds);
        return levels.map((level) => level.name);
    }
}
