import {
    extractTextFromParts,
    formatMessagesForTokenCount,
    getProvider,
    getReasoningOptions,
    normalizeChatUsage,
    withEstimatedUsage,
} from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { AiModelService } from "@modules/ai/model/services/ai-model.service";
import { Injectable, Logger } from "@nestjs/common";
import type { LanguageModel } from "ai";
import type { UIMessage } from "ai";
import {
    convertToModelMessages,
    createIdGenerator,
    createUIMessageStream,
    generateText,
    pipeUIMessageStreamToResponse,
    stepCountIs,
    tool,
    ToolLoopAgent,
} from "ai";
import type { ServerResponse } from "http";
import { validate as isUUID } from "uuid";
import { z } from "zod";

import type { DatasetsChatCompletionParams } from "../dto/datasets-chat.dto";
import { DatasetsChatMessageService } from "./datasets-chat-message.service";
import { DatasetsChatRecordService } from "./datasets-chat-record.service";
import { DatasetMemberService } from "./datasets-member.service";
import { DatasetsRetrievalService } from "./datasets-retrieval.service";

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

/**
 * 知识库 RAG 对话流式完成服务
 *
 * 参考 modules/ai/chat 的 ChatCompletionService，使用 getInformation 工具从知识库检索后再回答。
 * 仅支持文本消息，不处理文件解析与 MCP。
 */
@Injectable()
export class DatasetsChatCompletionService {
    private readonly logger = new Logger(DatasetsChatCompletionService.name);

    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly datasetsChatRecordService: DatasetsChatRecordService,
        private readonly datasetsChatMessageService: DatasetsChatMessageService,
        private readonly datasetsRetrievalService: DatasetsRetrievalService,
        private readonly datasetMemberService: DatasetMemberService,
    ) {}

    private getErrorMsg(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    async streamChat(
        params: DatasetsChatCompletionParams,
        response: ServerResponse,
    ): Promise<void> {
        let conversationId = params.conversationId;
        const isNew = !conversationId && params.saveConversation !== false;
        const needTitle = isNew && !params.title;

        try {
            await this.datasetMemberService.requireMember(params.datasetId, params.userId);

            if (isNew) {
                const record = await this.datasetsChatRecordService.createConversation(
                    params.datasetId,
                    params.userId,
                    { title: params.title, modelId: params.modelId },
                );
                conversationId = record.id;
            }

            const model = await this.aiModelService.findOne({
                where: { id: params.modelId, isActive: true },
                relations: ["provider"],
            });

            if (!model?.provider?.isActive) {
                throw HttpErrorFactory.badRequest("模型或 Provider 不存在或未激活");
            }

            const providerSecret = await this.secretService.getConfigKeyValuePairs(
                model.provider.bindSecretId!,
            );
            const provider = getProvider(model.provider.provider, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret) || undefined,
            });

            const cleaned = this.clean(params.messages);
            const modelMsgs = await convertToModelMessages(cleaned);
            const systemPrompt = `You are a helpful assistant. Check your knowledge base before answering any questions.
Only respond to questions using information from tool calls.
If no relevant information is found in the tool calls, respond "Sorry, I don't know."`;
            const finalMessages = [
                { role: "system" as const, content: systemPrompt },
                ...modelMsgs,
            ];
            const promptText = formatMessagesForTokenCount(finalMessages);

            const getInformationTool = tool({
                description: "Get information from the knowledge base to answer questions.",
                inputSchema: z.object({
                    question: z.string().describe("The user's question"),
                }),
                execute: async ({ question }) => {
                    const result = await this.datasetsRetrievalService.retrieve(
                        params.datasetId,
                        question,
                        4,
                        0.5,
                    );
                    return result.chunks.map((chunk) => ({
                        name: chunk.content,
                        similarity: chunk.score,
                    }));
                },
            });

            const agent = new ToolLoopAgent({
                model: provider(model.model).model,
                providerOptions: getReasoningOptions(model.provider.provider, {
                    thinking: params.feature?.thinking ?? false,
                }),
                tools: { getInformation: getInformationTool },
                stopWhen: stepCountIs(5),
            });

            const stream = createUIMessageStream({
                originalMessages: cleaned,
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({ type: "data-conversation-id", data: conversationId });
                    }
                    writer.write({
                        type: "start",
                        messageId: createIdGenerator() as unknown as string,
                    });

                    const result = await agent.stream({
                        messages: finalMessages,
                        abortSignal: params.abortSignal,
                    });
                    result.consumeStream();

                    const uiMessageStream = result.toUIMessageStream({
                        sendStart: false,
                        originalMessages: cleaned,
                        onFinish: async ({
                            messages: finished,
                            responseMessage: responseMsg,
                            isAborted: aborted,
                        }) => {
                            try {
                                if (params.saveConversation === false || !conversationId) return;

                                const { fullText } = extractTextFromParts(
                                    (responseMsg?.parts ?? []) as Array<{
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
                                    textText: fullText,
                                    reasoningText: "",
                                });
                                writer.write({ type: "data-usage", data: usage });

                                if (finished.length > 0) {
                                    await this.saveMessages(
                                        responseMsg,
                                        finished,
                                        params,
                                        conversationId,
                                        usage,
                                        aborted,
                                        writer,
                                    );
                                    if (needTitle && conversationId) {
                                        const firstUserMsg = params.messages.find(
                                            (m) => m.role === "user",
                                        );
                                        if (firstUserMsg) {
                                            this.generateTitle({
                                                datasetId: params.datasetId,
                                                conversationId,
                                                userId: params.userId,
                                                message: firstUserMsg,
                                                model: provider(model.model).model,
                                                providerId: model.provider.provider,
                                            }).catch(() => {});
                                        }
                                    }
                                    await this.datasetsChatRecordService.updateConversationStats(
                                        conversationId,
                                    );
                                }
                            } catch (err) {
                                this.logger.error(
                                    `Save datasets chat failed: ${this.getErrorMsg(err)}`,
                                    err instanceof Error ? err.stack : undefined,
                                );
                            }
                        },
                        onError: (error) => {
                            this.logger.error(
                                `Stream error: ${this.getErrorMsg(error)}`,
                                error instanceof Error ? error.stack : undefined,
                            );
                            return this.getErrorMsg(error);
                        },
                    });

                    writer.merge(uiMessageStream);
                },
            });

            pipeUIMessageStreamToResponse({ stream, response });
        } catch (error) {
            this.logger.error(
                `Stream datasets chat error: ${this.getErrorMsg(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            this.handleError(error, response);
        }
    }

    private async saveMessages(
        response: UIMessage | undefined,
        finished: UIMessage[],
        params: DatasetsChatCompletionParams,
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

        const saved = await this.datasetsChatMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: response,
            tokens: usage
                ? {
                      inputTokens: usage.inputTokens ?? 0,
                      outputTokens: usage.outputTokens ?? 0,
                      totalTokens: usage.totalTokens ?? 0,
                  }
                : undefined,
            parentId: userMsgId,
        });

        if (aborted) {
            await this.datasetsChatMessageService.updateMessage(saved.id, { status: "failed" });
        }
        writer.write({ type: "data-assistant-message-id", data: saved.id });
    }

    private async saveUserMessage(
        finished: UIMessage[],
        params: DatasetsChatCompletionParams,
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

        const existing = await this.datasetsChatMessageService.findByFrontendId(
            conversationId,
            userMsg.id,
        );
        if (existing) {
            writer.write({ type: "data-user-message-id", data: existing.id });
            return existing.id;
        }

        const saved = await this.datasetsChatMessageService.createMessage({
            conversationId,
            modelId: params.modelId,
            message: userMsg,
            parentId: params.parentId,
        });
        writer.write({ type: "data-user-message-id", data: saved.id });
        return saved.id;
    }

    private async generateTitle(args: {
        datasetId: string;
        conversationId: string;
        userId: string;
        message: UIMessage;
        model: LanguageModel;
        providerId: string;
    }): Promise<void> {
        const { datasetId, conversationId, userId, message, model, providerId } = args;
        const { fullText } = extractTextFromParts(
            (message.parts ?? []) as Array<{ type?: unknown; text?: string }>,
        );
        const input = fullText.trim().slice(0, 50);
        if (!input) return;

        const result = await generateText({
            model,
            prompt: `请为以下对话内容生成一个简洁的标题。要求：
1. 标题要简洁明了，不超过10个字
2. 只输出标题，不要包含任何其他文字、标点或说明

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

        await this.datasetsChatRecordService.updateConversation(conversationId, datasetId, userId, {
            title,
        });
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
                    const type = String((part as { type?: string }).type ?? "");
                    return (
                        VALID_PART_TYPES.has(type) ||
                        type.startsWith("tool-") ||
                        type.startsWith("step-")
                    );
                }) ?? [],
        }));
    }
}
