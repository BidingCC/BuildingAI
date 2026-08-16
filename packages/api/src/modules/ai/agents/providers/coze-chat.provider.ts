import { extractTextFromParts } from "@buildingai/ai-sdk/utils/token-usage";
import {
    type DocumentContent,
    parseFile,
    processFiles as processFilesUtil,
    type ProcessFilesWriter,
} from "@buildingai/ai-toolkit/utils";
import type { Agent } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import type { ChatUIMessage } from "@buildingai/types";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable, Logger } from "@nestjs/common";
import {
    createUIMessageStream,
    generateId,
    pipeUIMessageStreamToResponse,
    type UIMessage,
} from "ai";
import type { ServerResponse } from "http";
import { validate as isUUID } from "uuid";

import { AgentBillingHandler } from "../handlers/agent-billing";
import {
    CozeApiService,
    type CozeChatUsage,
    type CozeMessageObject,
    type CozeToolCallPart,
} from "../integrations/coze-api.service";
import type { AgentChatCompletionParams } from "../services/agent-chat-completion.service";
import { AgentChatMessageService } from "../services/agent-chat-message.service";
import { AgentChatRecordService } from "../services/agent-chat-record.service";

type ProviderWriter = {
    write: (part: Record<string, any>) => void;
};

/**
 * Coze 智能体聊天 Provider。
 */
@Injectable()
export class CozeChatProvider {
    private readonly logger = new Logger(CozeChatProvider.name);

    constructor(
        private readonly cozeApiService: CozeApiService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentChatMessageService: AgentChatMessageService,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly agentConfigService: AgentConfigService,
    ) {}

    /**
     * 处理 Coze 流式对话。
     * 根据 apiVersion 自动选择旧版（v1）或新版（v2）API。
     */
    async streamChat(
        agent: Agent,
        params: AgentChatCompletionParams,
        response: ServerResponse,
    ): Promise<void> {
        const apiVersion = agent.thirdPartyIntegration?.apiVersion || "v1";
        if (apiVersion === "v2") {
            return this.streamChatV2(agent, params, response);
        }
        return this.streamChatV1(agent, params, response);
    }

    /**
     * 处理 Coze 旧版 API (v3/chat) 流式对话。
     */
    private async streamChatV1(
        agent: Agent,
        params: AgentChatCompletionParams,
        response: ServerResponse,
    ): Promise<void> {
        const saveConversation = params.saveConversation !== false;
        let localConversationId = saveConversation
            ? await this.resolveLocalConversationId(params)
            : undefined;
        const lastUserMessage = params.messages.findLast((message) => message.role === "user");
        const initialTitle = lastUserMessage
            ? extractTextFromParts(lastUserMessage.parts ?? []).fullText
            : "";

        if (saveConversation && !localConversationId) {
            const record = await this.agentChatRecordService.createConversation({
                agentId: params.agentId,
                userId: params.userId,
                anonymousIdentifier: params.anonymousIdentifier,
                title: initialTitle,
            });
            localConversationId = record.id;
        }

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                if (localConversationId) {
                    writer.write({
                        type: "data-conversation-id",
                        data: localConversationId,
                        transient: true,
                    } as any);
                }

                const assistantMessageId = generateId();
                writer.write({ type: "start", messageId: assistantMessageId });
                writer.write({ type: "start-step" });

                const textId = "txt-0";
                let textStarted = false;

                const { messages: processedMessages, documentContents } = await processFilesUtil(
                    params.messages,
                    writer as unknown as ProcessFilesWriter,
                    parseFile,
                );

                const lastUser = processedMessages.findLast((message) => message.role === "user");
                let userText = lastUser ? extractTextFromParts(lastUser.parts ?? []).fullText : "";
                if (documentContents.length > 0) {
                    userText = this.appendDocumentContents(userText, documentContents);
                }

                const inputObjects = this.extractInputObjects(lastUser);
                if (!userText.trim() && inputObjects.length === 0) {
                    throw HttpErrorFactory.badRequest("Coze 对话内容不能为空");
                }

                const remoteConversationId = await this.resolveRemoteConversationId(
                    agent,
                    localConversationId,
                );
                const billingRule = await this.getBillingRule();
                const shouldCharge = params.isDebug !== true;
                if (shouldCharge && params.userId && billingRule) {
                    await this.agentBillingHandler.validateUserPower(params.userId, billingRule);
                }
                // 构建历史消息上下文(排除当前这一轮的用户消息)
                const historyMessages = params.messages
                    .slice(0, -1)
                    .map((msg) => ({
                        role: msg.role,
                        content: extractTextFromParts(msg.parts ?? []).fullText || "",
                        objects: this.extractInputObjects(msg),
                    }))
                    .filter((msg) => msg.content.trim() || msg.objects.length > 0);

                const cozeResponse = await this.cozeApiService.streamChat({
                    config: agent.thirdPartyIntegration,
                    userId: params.userId,
                    message: userText,
                    conversationId: remoteConversationId,
                    messages: historyMessages,
                    objects: inputObjects,
                });

                const reader = cozeResponse.body?.getReader();
                if (!reader) {
                    throw HttpErrorFactory.badRequest("Coze 未返回可读流");
                }

                const decoder = new TextDecoder();
                let buffer = "";
                let fullText = "";
                let completedText = "";
                let usage: CozeChatUsage | undefined;
                let cozeConversationId = remoteConversationId;
                let cozeChatId: string | undefined;
                const toolParts = new Map<string, CozeToolCallPart>();
                /** 已通过标准流协议发送过 tool-input-available 的 toolCallId 集合 */
                const emittedToolInputIds = new Set<string>();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!value) continue;

                    buffer += decoder.decode(value, { stream: true });
                    const chunks = buffer.split(/\n\n+/);
                    buffer = chunks.pop() ?? "";

                    for (const chunk of chunks) {
                        const parsed = this.cozeApiService.parseStreamEvent(chunk);
                        const identifiers = this.cozeApiService.extractIdentifiers(parsed.data);
                        cozeConversationId = identifiers.conversationId ?? cozeConversationId;
                        cozeChatId = identifiers.chatId ?? cozeChatId;

                        // ---- 工具调用：使用标准流协议事件 ----
                        const toolPart = this.cozeApiService.extractToolCallPart(
                            parsed.event,
                            parsed.data,
                        );
                        if (toolPart) {
                            toolParts.set(toolPart.toolCallId, toolPart);

                            // 首次出现：发送 tool-input-available
                            if (!emittedToolInputIds.has(toolPart.toolCallId)) {
                                emittedToolInputIds.add(toolPart.toolCallId);
                                writer.write({
                                    type: "tool-input-available",
                                    toolCallId: toolPart.toolCallId,
                                    toolName: toolPart.toolName,
                                    input: toolPart.input ?? {},
                                    dynamic: true,
                                } as any);
                            }

                            // 有输出：发送 tool-output-available
                            if (
                                toolPart.state === "output-available" &&
                                toolPart.output !== undefined
                            ) {
                                writer.write({
                                    type: "tool-output-available",
                                    toolCallId: toolPart.toolCallId,
                                    output: toolPart.output,
                                    dynamic: true,
                                } as any);
                            }

                            // 有错误：发送 tool-output-error
                            if (toolPart.state === "output-error" && toolPart.errorText) {
                                writer.write({
                                    type: "tool-output-error",
                                    toolCallId: toolPart.toolCallId,
                                    errorText: toolPart.errorText,
                                    dynamic: true,
                                } as any);
                            }
                        }

                        // ---- 文本 delta ----
                        const deltaText = this.cozeApiService.extractDeltaText(
                            parsed.event,
                            parsed.data,
                        );
                        if (deltaText) {
                            if (!textStarted) {
                                writer.write({ type: "text-start", id: textId });
                                textStarted = true;
                            }
                            fullText += deltaText;
                            writer.write({ type: "text-delta", id: textId, delta: deltaText });
                        }

                        const messageCompletedText = this.cozeApiService.extractCompletedText(
                            parsed.event,
                            parsed.data,
                        );
                        if (messageCompletedText) {
                            completedText = messageCompletedText;
                        }

                        usage = this.cozeApiService.extractUsage(parsed.data) ?? usage;
                    }
                }

                // fallback：无增量 delta 时使用 completedText
                if (!fullText && completedText) {
                    fullText = completedText;
                    if (!textStarted) {
                        writer.write({ type: "text-start", id: textId });
                        textStarted = true;
                    }
                    writer.write({ type: "text-delta", id: textId, delta: completedText });
                }

                // 确保 text-start / text-end 配对
                if (!textStarted) {
                    writer.write({ type: "text-start", id: textId });
                }
                writer.write({ type: "text-end", id: textId });
                writer.write({ type: "finish-step" });
                writer.write({ type: "finish", finishReason: "stop" });

                let userConsumedPower = 0;
                if (
                    shouldCharge &&
                    saveConversation &&
                    localConversationId &&
                    params.userId &&
                    billingRule &&
                    usage
                ) {
                    userConsumedPower = await this.agentBillingHandler.deduct({
                        userId: params.userId,
                        conversationId: localConversationId,
                        usage,
                        billingRule,
                    });
                }
                writer.write({
                    type: "data-usage",
                    data: {
                        inputTokens: usage?.inputTokens ?? 0,
                        outputTokens: usage?.outputTokens ?? 0,
                        totalTokens: usage?.totalTokens ?? 0,
                        raw: {
                            prompt_tokens: usage?.inputTokens ?? 0,
                            completion_tokens: usage?.outputTokens ?? 0,
                            total_tokens: usage?.totalTokens ?? 0,
                        },
                        userConsumedPower,
                    },
                });

                const toolCallParts = Array.from(toolParts.values());
                const responseMessage: UIMessage = {
                    id: assistantMessageId,
                    role: "assistant",
                    parts: [
                        ...toolCallParts,
                        ...(fullText || toolCallParts.length === 0
                            ? [{ type: "text", text: fullText }]
                            : []),
                    ] as unknown as UIMessage["parts"],
                };
                const finished = [...params.messages, responseMessage];
                writer.write({
                    type: "data-conversation-context",
                    data: {
                        messageId: assistantMessageId,
                        messages: finished.map((message) => ({
                            role: message.role,
                            content:
                                extractTextFromParts(message.parts ?? []).fullText ||
                                "(无文本内容)",
                        })),
                    },
                });

                if (localConversationId) {
                    await this.agentChatRecordService.updateMetadata(localConversationId, {
                        provider: "coze",
                        cozeConversationId,
                        cozeChatId,
                    });
                    await this.saveMessages({
                        conversationId: localConversationId,
                        params,
                        writer,
                        lastUser,
                        responseMessage,
                        usage,
                        userConsumedPower,
                        metadata: {
                            provider: "coze",
                            cozeConversationId,
                            cozeChatId,
                            toolCalls: toolCallParts,
                        },
                    });
                }
            },
            onError: (error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Coze chat stream error: ${message}`);
                return message;
            },
        });

        pipeUIMessageStreamToResponse({ stream, response });
    }

    /**
     * 处理 Coze 新版 API (stream_run) 流式对话。
     * 新版 API 使用按行解析 SSE，事件类型包括：message_start, answer, tool_request, tool_response, message_end, error
     */
    private async streamChatV2(
        agent: Agent,
        params: AgentChatCompletionParams,
        response: ServerResponse,
    ): Promise<void> {
        const saveConversation = params.saveConversation !== false;
        let localConversationId = saveConversation
            ? await this.resolveLocalConversationId(params)
            : undefined;
        const lastUserMessage = params.messages.findLast((message) => message.role === "user");
        const initialTitle = lastUserMessage
            ? extractTextFromParts(lastUserMessage.parts ?? []).fullText
            : "";

        if (saveConversation && !localConversationId) {
            const record = await this.agentChatRecordService.createConversation({
                agentId: params.agentId,
                userId: params.userId,
                anonymousIdentifier: params.anonymousIdentifier,
                title: initialTitle,
            });
            localConversationId = record.id;
        }

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                if (localConversationId) {
                    writer.write({
                        type: "data-conversation-id",
                        data: localConversationId,
                        transient: true,
                    } as any);
                }

                const assistantMessageId = generateId();
                writer.write({ type: "start", messageId: assistantMessageId });
                writer.write({ type: "start-step" });

                const textId = "txt-0";
                let textStarted = false;

                const { messages: processedMessages, documentContents } = await processFilesUtil(
                    params.messages,
                    writer as unknown as ProcessFilesWriter,
                    parseFile,
                );

                const lastUser = processedMessages.findLast((message) => message.role === "user");
                let userText = lastUser ? extractTextFromParts(lastUser.parts ?? []).fullText : "";
                if (documentContents.length > 0) {
                    userText = this.appendDocumentContents(userText, documentContents);
                }

                const inputObjects = this.extractInputObjects(lastUser);
                if (!userText.trim() && inputObjects.length === 0) {
                    throw HttpErrorFactory.badRequest("Coze 对话内容不能为空");
                }

                // 新版 API：使用 session_id 替代 conversation_id
                // 将 localConversationId 映射为 session_id
                const remoteSessionId = await this.resolveRemoteConversationId(
                    agent,
                    localConversationId,
                );
                const billingRule = await this.getBillingRule();
                const shouldCharge = params.isDebug !== true;
                if (shouldCharge && params.userId && billingRule) {
                    await this.agentBillingHandler.validateUserPower(params.userId, billingRule);
                }

                this.logger.log(`Coze streamChatV2: calling API, userText="${userText.slice(0, 50)}..."`);

                const cozeResponse = await this.cozeApiService.streamChatV2({
                    config: agent.thirdPartyIntegration,
                    userId: params.userId,
                    message: userText,
                    conversationId: remoteSessionId,
                    messages: [],
                    objects: inputObjects,
                });

                this.logger.log(`Coze streamChatV2: API responded with status=${cozeResponse.status}, contentType=${cozeResponse.headers.get("content-type")}`);

                const reader = cozeResponse.body?.getReader();
                if (!reader) {
                    throw HttpErrorFactory.badRequest("Coze 新版 API 未返回可读流");
                }

                const decoder = new TextDecoder();
                let buffer = "";
                let fullText = "";
                let usage: CozeChatUsage | undefined;
                let cozeSessionId = remoteSessionId;
                const toolParts = new Map<string, CozeToolCallPart>();
                const emittedToolInputIds = new Set<string>();
                let lineCount = 0;
                let answerCount = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        this.logger.log(`Coze streamChatV2: stream ended, total=${lineCount} lines, answerCount=${answerCount}, fullText="${fullText.slice(0, 50)}..."`);
                        break;
                    }
                    if (!value) continue;

                    buffer += decoder.decode(value, { stream: true });
                    // 新版 API 按行分割（每行一个 data: 事件）
                    const lines = buffer.split(/\r?\n/);
                    // 关键修复：保留最后一个不完整的行用于下次拼接
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        // 跳过空行和 event: 前缀行
                        if (!line.trim() || line.startsWith("event:")) continue;

                        lineCount++;
                        const parsed = this.cozeApiService.parseStreamEventV2(line);
                        if (!parsed.data) {
                            this.logger.debug(`Coze streamChatV2: unparsed line #${lineCount}: "${line.slice(0, 80)}"`);
                            continue;
                        }

                        // 记录事件类型（首次出现的 message_start 等）
                        if (parsed.type) {
                            this.logger.debug(`Coze streamChatV2: event #${lineCount}: type="${parsed.type}"`);
                        }

                        // 从 response 中提取 session_id（如果有）
                        const sessionId = this.cozeApiService.extractSessionIdV2(parsed.data);
                        if (sessionId) {
                            cozeSessionId = sessionId;
                        }

                        // ---- 工具调用 ----
                        const toolPart = this.cozeApiService.extractToolCallV2(parsed.data);
                        if (toolPart) {
                            toolParts.set(toolPart.toolCallId, toolPart);

                            if (!emittedToolInputIds.has(toolPart.toolCallId)) {
                                emittedToolInputIds.add(toolPart.toolCallId);
                                writer.write({
                                    type: "tool-input-available",
                                    toolCallId: toolPart.toolCallId,
                                    toolName: toolPart.toolName,
                                    input: toolPart.input ?? {},
                                    dynamic: true,
                                } as any);
                            }

                            if (
                                toolPart.state === "output-available" &&
                                toolPart.output !== undefined
                            ) {
                                writer.write({
                                    type: "tool-output-available",
                                    toolCallId: toolPart.toolCallId,
                                    output: toolPart.output,
                                    dynamic: true,
                                } as any);
                            }
                        }

                        // ---- 新版 answer 事件 ----
                        const answer = this.cozeApiService.extractAnswerTextV2(parsed.data);
                        if (answer.text) {
                            if (!textStarted) {
                                writer.write({ type: "text-start", id: textId });
                                textStarted = true;
                            }
                            answerCount++;
                            fullText += answer.text;
                            writer.write({ type: "text-delta", id: textId, delta: answer.text });
                        }

                        // ---- 新版 message_end 事件（token 用量 + 错误检查） ----
                        if (parsed.type === "message_end") {
                            const meContent = parsed.data.content?.message_end;
                            if (meContent) {
                                this.logger.debug(`Coze streamChatV2: message_end code=${meContent.code}, message="${meContent.message || ""}", token_cost=${JSON.stringify(meContent.token_cost || {})}`);
                            }
                        }
                        const usageV2 = this.cozeApiService.extractUsageV2(parsed.data);
                        if (usageV2) {
                            usage = usageV2;
                        }

                        // ---- error 事件 ----
                        if (parsed.type === "error") {
                            const errorMsg = parsed.data.content?.error?.message || "Coze 新版 API 返回错误";
                            this.logger.error(`Coze streamChatV2 error: ${errorMsg}`);
                            throw HttpErrorFactory.badRequest(errorMsg);
                        }
                    }
                }

                // fallback：无文本时使用空字符串
                if (!textStarted) {
                    writer.write({ type: "text-start", id: textId });
                }
                writer.write({ type: "text-end", id: textId });
                writer.write({ type: "finish-step" });
                writer.write({ type: "finish", finishReason: "stop" });

                let userConsumedPower = 0;
                if (
                    shouldCharge &&
                    saveConversation &&
                    localConversationId &&
                    params.userId &&
                    billingRule &&
                    usage
                ) {
                    userConsumedPower = await this.agentBillingHandler.deduct({
                        userId: params.userId,
                        conversationId: localConversationId,
                        usage,
                        billingRule,
                    });
                }
                writer.write({
                    type: "data-usage",
                    data: {
                        inputTokens: usage?.inputTokens ?? 0,
                        outputTokens: usage?.outputTokens ?? 0,
                        totalTokens: usage?.totalTokens ?? 0,
                        raw: {
                            prompt_tokens: usage?.inputTokens ?? 0,
                            completion_tokens: usage?.outputTokens ?? 0,
                            total_tokens: usage?.totalTokens ?? 0,
                        },
                        userConsumedPower,
                    },
                });

                const toolCallParts = Array.from(toolParts.values());
                const responseMessage: UIMessage = {
                    id: assistantMessageId,
                    role: "assistant",
                    parts: [
                        ...toolCallParts,
                        ...(fullText || toolCallParts.length === 0
                            ? [{ type: "text", text: fullText }]
                            : []),
                    ] as unknown as UIMessage["parts"],
                };
                const finished = [...params.messages, responseMessage];
                writer.write({
                    type: "data-conversation-context",
                    data: {
                        messageId: assistantMessageId,
                        messages: finished.map((message) => ({
                            role: message.role,
                            content:
                                extractTextFromParts(message.parts ?? []).fullText ||
                                "(无文本内容)",
                        })),
                    },
                });

                if (localConversationId) {
                    await this.agentChatRecordService.updateMetadata(localConversationId, {
                        provider: "coze_v2",
                        cozeConversationId: cozeSessionId,
                    });
                    await this.saveMessages({
                        conversationId: localConversationId,
                        params,
                        writer,
                        lastUser,
                        responseMessage,
                        usage,
                        userConsumedPower,
                        metadata: {
                            provider: "coze_v2",
                            cozeConversationId: cozeSessionId,
                            toolCalls: toolCallParts,
                        },
                    });
                }
            },
            onError: (error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Coze streamChatV2 stream error: ${message}`);
                if (error instanceof Error && error.stack) {
                    this.logger.debug(`Coze streamChatV2 error stack: ${error.stack.slice(0, 300)}`);
                }
                return message;
            },
        });

        pipeUIMessageStreamToResponse({ stream, response });
    }

    private async resolveLocalConversationId(
        params: AgentChatCompletionParams,
    ): Promise<string | undefined> {
        const requestedConversationId = params.conversationId;
        if (!requestedConversationId) {
            return undefined;
        }

        if (isUUID(requestedConversationId)) {
            return requestedConversationId;
        }

        const record = await this.agentChatRecordService.findConversationByCozeConversationId({
            agentId: params.agentId,
            userId: params.userId,
            cozeConversationId: requestedConversationId,
        });
        if (record?.id) {
            this.logger.warn(
                `Received remote Coze conversation id as local conversationId, remapped to local record: ${requestedConversationId} -> ${record.id}`,
            );
            return record.id;
        }

        this.logger.warn(
            `Received non-UUID conversationId but no local record was found, a new local conversation will be created: ${requestedConversationId}`,
        );
        return undefined;
    }

    private async resolveRemoteConversationId(
        agent: Agent,
        localConversationId?: string,
    ): Promise<string | undefined> {
        if (agent.thirdPartyIntegration?.useExternalConversation === false) {
            return undefined;
        }
        if (!localConversationId) {
            return undefined;
        }

        const record = await this.agentChatRecordService.getConversation(localConversationId);
        const remoteConversationId = record?.metadata?.cozeConversationId;
        return typeof remoteConversationId === "string" ? remoteConversationId : undefined;
    }

    private async saveMessages(params: {
        conversationId: string;
        params: AgentChatCompletionParams;
        writer: ProviderWriter;
        lastUser?: UIMessage;
        responseMessage: UIMessage;
        usage?: CozeChatUsage;
        userConsumedPower?: number;
        metadata?: Record<string, any>;
    }): Promise<void> {
        const {
            conversationId,
            params: chatParams,
            writer,
            lastUser,
            responseMessage,
            usage,
            userConsumedPower,
        } = params;
        const safeConversationId = isUUID(conversationId)
            ? conversationId
            : (
                  await this.agentChatRecordService.findConversationByCozeConversationId({
                      agentId: chatParams.agentId,
                      userId: chatParams.userId,
                      cozeConversationId: conversationId,
                  })
              )?.id;

        if (!safeConversationId) {
            throw HttpErrorFactory.badRequest("Coze 本地会话不存在，无法保存消息");
        }

        let userMessageId: string | undefined;
        if (chatParams.isRegenerate) {
            userMessageId = chatParams.regenerateParentId;
        } else if (lastUser) {
            const savedUserMessage = await this.agentChatMessageService.createMessage({
                conversationId: safeConversationId,
                agentId: chatParams.agentId,
                userId: chatParams.userId,
                message: lastUser,
                formVariables: chatParams.formVariables,
                formFieldsInputs: chatParams.formFieldsInputs,
                parentId: chatParams.parentId,
            });
            userMessageId = savedUserMessage.id;
            writer.write({ type: "data-user-message-id", data: savedUserMessage.id });
        }

        const savedAssistantMessage = await this.agentChatMessageService.createMessage({
            conversationId: safeConversationId,
            agentId: chatParams.agentId,
            userId: chatParams.userId,
            message: {
                ...(responseMessage as ChatUIMessage),
                ...(usage ? { usage } : {}),
                ...(userConsumedPower != null ? { userConsumedPower } : {}),
            } as ChatUIMessage,
            parentId: userMessageId,
        });

        writer.write({
            type: "data-assistant-message-id",
            data: savedAssistantMessage.id,
        });
        await this.agentChatRecordService.updateStats(safeConversationId);
    }

    private async getBillingRule(): Promise<{ power: number; tokens: number } | undefined> {
        const config = await this.agentConfigService.getConfig();
        const item = config.createTypes.find((current) => current.key === "coze");
        if (!item?.enabled || item.billingMode !== "points") {
            return undefined;
        }

        const points = Math.max(0, Number(item.points ?? 0) || 0);
        if (points <= 0) {
            return undefined;
        }

        return {
            power: points,
            tokens: 1000,
        };
    }

    /**
     * Append parsed document contents to user message text.
     * Truncates per-document to avoid exceeding third-party length limits.
     */
    private appendDocumentContents(userText: string, documents: DocumentContent[]): string {
        const MAX_CHARS_PER_DOC = 30_000;
        const parts = documents.map((doc) => {
            const content =
                doc.content.length > MAX_CHARS_PER_DOC
                    ? doc.content.slice(0, MAX_CHARS_PER_DOC) + "\n...(truncated)"
                    : doc.content;
            return `<document name="${doc.filename}">\n${content}\n</document>`;
        });
        return `${userText}\n\n[Attached Documents]\n${parts.join("\n\n")}`;
    }

    /**
     * 从用户消息中提取 Coze 所需的多模态对象列表。
     */
    private extractInputObjects(message?: UIMessage): CozeMessageObject[] {
        if (!message?.parts?.length) {
            return [];
        }

        const objects: CozeMessageObject[] = [];

        for (const part of message.parts as Array<Record<string, any>>) {
            if (part?.type !== "file") {
                continue;
            }

            const url = typeof part.url === "string" ? part.url.trim() : "";
            if (!url) {
                continue;
            }

            const mediaType = typeof part.mediaType === "string" ? part.mediaType : undefined;
            const filename = typeof part.filename === "string" ? part.filename : undefined;
            const isImage = mediaType?.toLowerCase().startsWith("image/") ?? false;

            objects.push({
                type: isImage ? "image" : "file",
                file_url: url,
                url,
                ...(filename ? { name: filename } : {}),
                ...(mediaType ? { mime_type: mediaType } : {}),
            });
        }

        return objects;
    }
}
