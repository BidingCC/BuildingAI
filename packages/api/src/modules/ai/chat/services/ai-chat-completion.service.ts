import {
    closeMcpClients,
    createClientsFromServerConfigs,
    extractTextFromParts,
    formatMessagesForTokenCount,
    getProvider,
    getReasoningOptions,
    type McpClient,
    type McpServerConfig,
    mergeMcpTools,
    normalizeChatUsage,
    withEstimatedUsage,
} from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { llmFileParser } from "@buildingai/llm-file-parser";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import type { LanguageModel, Tool } from "ai";
import {
    convertToModelMessages,
    createIdGenerator,
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
import {
    createDalle2ImageGenerationTool,
    createDalle3ImageGenerationTool,
    createGptImageGenerationTool,
} from "../tools/openai-image.tools";
import { createDeepResearchTool } from "../tools/openai-research.tools";
import { getWeather } from "../tools/weather.tools";
import type { ChatCompletionParams, UIMessage } from "../types/chat.types";
import { AiChatsMessageService } from "./ai-chat-message.service";
import { AiChatRecordService } from "./ai-chat-record.service";

type PartWithState = { type?: string; state?: string };
type FilePart = { type: "file"; url: string; mediaType?: string; filename?: string };
type DataWriter = { write: (part: { type: `data-${string}`; data: unknown }) => void };
type ParseProgressPart = {
    type: "data-file-parse-progress" | "data-file-parse-metadata";
    data: unknown;
};
type ParseFileResult = {
    content: string;
    filename: string;
    progressParts: ParseProgressPart[];
};
type ProcessFilesResult = {
    messages: UIMessage[];
    documentContents: Array<{ filename: string; content: string }>;
};

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

    private getErrorMsg(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
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

            const stream = createUIMessageStream({
                originalMessages: isToolApprovalFlow ? messages : undefined,
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({ type: "data-conversation-id", data: conversationId });
                    }
                    writer.write({
                        type: "start",
                        messageId: createIdGenerator() as unknown as string,
                    });

                    if (params.abortSignal?.aborted) {
                        await closeMcpClients(mcpClients);
                        return;
                    }

                    try {
                        const { messages: processed, documentContents } = await this.processFiles(
                            cleaned,
                            writer,
                        );

                        const systemPrompt = this.buildSystemPrompt(
                            params.systemPrompt,
                            documentContents,
                        );
                        const modelMsgs = await convertToModelMessages(processed);
                        const finalMessages = systemPrompt
                            ? [{ role: "system" as const, content: systemPrompt }, ...modelMsgs]
                            : modelMsgs;
                        const promptText = formatMessagesForTokenCount(finalMessages);

                        const hasTools = model.features?.some((f) => f.includes("tool"));
                        const tools = this.buildTools(model.provider.provider, provider, mcpTools);

                        const agent = new ToolLoopAgent({
                            model: provider(model.model).model,
                            providerOptions: {
                                ...getReasoningOptions(model.provider.provider, {
                                    thinking: params.feature?.thinking ?? false,
                                }),
                            },
                            ...(hasTools && { tools }),
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

                                    const usage = normalizeChatUsage({
                                        rawUsage,
                                        model: model.model,
                                        textText,
                                        reasoningText,
                                    });

                                    writer.write({ type: "data-usage", data: usage });

                                    if (isToolApprovalFlow) {
                                        await this.saveApprovalMessages(finished, conversationId);
                                    } else if (finished.length > 0) {
                                        console.log("finished", JSON.stringify(finished));
                                        await this.saveMessages(
                                            response,
                                            finished,
                                            params,
                                            conversationId,
                                            usage,
                                            aborted,
                                            writer,
                                        );

                                        if (needTitle && conversationId) {
                                            const firstUserMsg = messages.find(
                                                (m) => m.role === "user",
                                            );
                                            if (firstUserMsg) {
                                                this.generateTitle({
                                                    conversationId,
                                                    userId: params.userId,
                                                    message: firstUserMsg,
                                                    model: provider(model.model).model,
                                                    providerId: model.provider.provider,
                                                }).catch(() => {});
                                            }
                                        }
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

        await this.aiChatsMessageService.updateMessage(approvalMsg.id, {
            message: { ...lastAssistant, parts: cleanedParts },
        });
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
        aborted: boolean,
        writer: DataWriter,
    ): Promise<void> {
        const userMsgId = await this.saveUserMessage(finished, params, conversationId, writer);

        if (!response?.parts?.length) return;

        const userMsg = finished.findLast((m) => m.role === "user");
        const fileParseParts = userMsg?.parts?.filter(
            (part) => typeof part.type === "string" && part.type.startsWith("data-file-parse-"),
        );

        const messageToSave: UIMessage =
            fileParseParts?.length && response.parts
                ? { ...response, parts: [...fileParseParts, ...response.parts] }
                : response;

        const saved = await this.aiChatsMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: messageToSave,
            tokens: usage && {
                inputTokens: usage.inputTokens ?? 0,
                outputTokens: usage.outputTokens ?? 0,
                totalTokens: usage.totalTokens ?? 0,
            },
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

        const userMsg = finished.findLast((m) => m.role === "user");
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
            message: userMsg,
            parentId: params.parentId,
        });

        writer.write({ type: "data-user-message-id", data: saved.id });
        return saved.id;
    }

    private async generateTitle(args: {
        conversationId: string;
        userId: string;
        message: UIMessage;
        model: LanguageModel;
        providerId: string;
    }): Promise<void> {
        const { conversationId, userId, message, model, providerId } = args;
        const { fullText } = extractTextFromParts(
            (message.parts ?? []) as Array<{ type?: unknown; text?: string }>,
        );
        const input = fullText.trim().slice(0, 50);
        if (!input) return;

        const result = await generateText({
            model,
            prompt: `请为以下对话内容生成一个简洁的标题。要求：
1. 标题要简洁明了，不超过10个字
2. 标题要使用相关关键词，不要使用对话内容中的具体内容
3. 使用与对话内容相同的语言
4. 只输出标题，不要包含任何其他文字、标点或说明

对话内容：
${input}

标题：`,
            providerOptions: getReasoningOptions(providerId, { thinking: false }),
        });

        const title = result.text
            .trim()
            .replace(/^["'「」『』]|["'「」『』]$/g, "")
            .slice(0, 20);
        if (!title) return;

        await this.aiChatRecordService.updateConversation(conversationId, userId, { title });
    }

    private async parseFile(
        filePart: FilePart,
        writer: DataWriter,
        shouldStream: boolean = true,
    ): Promise<ParseFileResult> {
        const filename = filePart.filename || "未命名文件";
        const progressParts: ParseProgressPart[] = [];

        try {
            const { stream, result } = await llmFileParser.streamParseFromUrl(filePart.url);

            const typeMap = {
                progress: "data-file-parse-progress",
                metadata: "data-file-parse-metadata",
            } as const;

            for await (const chunk of stream) {
                const chunkType = chunk.type as keyof typeof typeMap;
                if (typeMap[chunkType] && chunk[chunkType]) {
                    const data = chunk[chunkType];
                    const partType = typeMap[chunkType];
                    if (shouldStream) {
                        writer.write({ type: partType, data });
                    }
                    progressParts.push({ type: partType, data });
                }
            }

            const content = llmFileParser.formatForLLM(await result);
            this.logger.log(`文件解析完成: ${filename}, 内容长度: ${content.length} 字符`);

            return {
                content,
                filename,
                progressParts,
            };
        } catch (error) {
            const errorMsg = this.getErrorMsg(error);
            this.logger.error(`文件解析失败: ${filename}, 错误: ${errorMsg}`);

            return {
                content: `[无法解析文档: ${filename}。错误: ${errorMsg}]`,
                filename,
                progressParts,
            };
        }
    }

    private buildSystemPrompt(
        basePrompt?: string,
        documents?: Array<{ filename: string; content: string }>,
    ): string {
        if (!documents?.length) return basePrompt || "";

        const docTexts = documents.map((d) => `[文档: ${d.filename}]\n\n${d.content}`);
        const docsText = docTexts.join("\n\n");
        return basePrompt ? `${basePrompt}\n\n${docsText}` : docsText;
    }

    private async processFiles(
        messages: UIMessage[],
        writer: DataWriter,
    ): Promise<ProcessFilesResult> {
        const isMedia = (type?: string) =>
            type?.startsWith("image/") || type?.startsWith("video/") || type?.startsWith("audio/");

        const documents: Array<{ filename: string; content: string }> = [];

        const processed = await Promise.all(
            messages.map(async (msg, index) => {
                if (!msg.parts?.length) return msg;

                const parts: UIMessage["parts"] = [];
                const isLastMessage = index === messages.length - 1;
                const hasFile = msg.parts.some(
                    (part) => part.type === "file" && !isMedia((part as FilePart).mediaType),
                );
                const shouldStream = isLastMessage && msg.role === "user" && hasFile;

                for (const part of msg.parts) {
                    if (part.type !== "file") {
                        parts.push(part);
                        continue;
                    }

                    const file = part as FilePart;
                    if (isMedia(file.mediaType)) {
                        parts.push(part);
                    } else {
                        const { content, filename, progressParts } = await this.parseFile(
                            file,
                            writer,
                            shouldStream,
                        );
                        documents.push({ filename, content });
                        if (shouldStream) {
                            parts.push(...progressParts, part);
                        } else {
                            parts.push(part);
                        }
                    }
                }

                return { ...msg, parts };
            }),
        );

        return { messages: processed, documentContents: documents };
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
    ): Record<string, Tool> {
        const tools: Record<string, Tool> = {
            getWeather,
            ...mcpTools,
        };

        if (providerId === "openai") {
            tools.dalle2ImageGeneration = createDalle2ImageGenerationTool(provider);
            tools.dalle3ImageGeneration = createDalle3ImageGenerationTool(provider);
            tools.gptImageGeneration = createGptImageGenerationTool(provider);
            tools.deepResearch = createDeepResearchTool(provider);
        }

        return tools;
    }
}
