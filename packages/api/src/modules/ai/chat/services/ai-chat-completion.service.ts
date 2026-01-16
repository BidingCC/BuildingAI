import { getProvider } from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable, Logger } from "@nestjs/common";
import {
    convertToModelMessages,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    streamText,
} from "ai";
import type { ServerResponse } from "http";
import { validate as isUUID } from "uuid";

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
    ) {}

    async streamChat(params: ChatCompletionParams, response: ServerResponse): Promise<void> {
        let conversationId = params.conversationId;
        const { isToolApprovalFlow = false } = params;

        try {
            if (!conversationId && params.saveConversation !== false) {
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

            const stream = createUIMessageStream({
                originalMessages: isToolApprovalFlow ? allMessages : undefined,
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({ type: "data-conversation-id", data: conversationId });
                    }

                    if (params.abortSignal?.aborted) return;

                    const result = streamText({
                        model: provider(model.model).model,
                        messages,
                        tools: { getWeather },
                        abortSignal: params.abortSignal,
                        // experimental_download: async (requested) => {
                        //     return requested.map((req) => {
                        //         return undefined;
                        //     });
                        // },
                    });

                    result.consumeStream();

                    const uiMessageStream = result.toUIMessageStream({
                        originalMessages: allMessages,
                        onFinish: async ({
                            messages: finishedMessages,
                            responseMessage,
                            isAborted,
                        }) => {
                            if (params.saveConversation === false || !conversationId) return;

                            try {
                                let finalResult: Awaited<ReturnType<typeof streamText>> | null =
                                    null;
                                try {
                                    finalResult = (await result) as unknown as Awaited<
                                        ReturnType<typeof streamText>
                                    >;
                                } catch {
                                    finalResult = null;
                                }

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
                                        finalResult,
                                        isAborted,
                                        writer,
                                    );
                                }
                            } catch (error) {
                                this.logger.error(
                                    `Failed to save messages: ${error instanceof Error ? error.message : String(error)}`,
                                    error instanceof Error ? error.stack : undefined,
                                );
                            }
                        },
                        onError: (error) =>
                            error instanceof Error ? error.message : "An error occurred.",
                    });

                    writer.merge(uiMessageStream);
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
        finalResult: Awaited<ReturnType<typeof streamText>> | null,
        isAborted: boolean,
        writer: { write: (part: { type: `data-${string}`; data: unknown }) => void },
    ): Promise<void> {
        const userMessageId = await this.ensureUserMessageSaved(params, conversationId, writer);

        if (!responseMessage?.parts?.length) return;

        let usage;
        try {
            usage = finalResult ? await finalResult.usage : undefined;
        } catch {
            usage = undefined;
        }

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

    private handleError(error: unknown, response: ServerResponse): void {
        const errorMessage = error instanceof Error ? error.message : "An error occurred.";
        if (response.headersSent) return;

        response.writeHead(500, { "Content-Type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`);
        response.end();
    }
}
