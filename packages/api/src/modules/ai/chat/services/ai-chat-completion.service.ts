import { getProvider } from "@buildingai/ai-sdk-new";
import { SecretService } from "@buildingai/core/modules";
import { AiChatMessage } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { getProviderSecret } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";
import {
    convertToModelMessages,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    streamText,
} from "ai";
import type { ServerResponse } from "http";

import { AiModelService } from "../../model/services/ai-model.service";
import { ChatCompletionParams, SaveMessageParams } from "../types/chat.types";
import { AiChatsMessageService } from "./ai-chat-message.service";
import { AiChatRecordService } from "./ai-chat-record.service";

const VALID_PART_TYPES = new Set([
    "text",
    "file",
    "image",
    "reasoning",
    "tool-call",
    "tool-result",
]);

@Injectable()
export class ChatCompletionService {
    constructor(
        private readonly aiModelService: AiModelService,
        private readonly secretService: SecretService,
        private readonly aiChatRecordService: AiChatRecordService,
        private readonly aiChatsMessageService: AiChatsMessageService,
    ) {}

    async streamChat(params: ChatCompletionParams, response: ServerResponse): Promise<void> {
        let conversationId = params.conversationId;

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

            const cleanedMessages = params.messages.map(({ id: _id, ...msg }) => ({
                ...msg,
                parts: msg.parts?.filter((part) => VALID_PART_TYPES.has(part.type)) || [],
            }));

            const modelMessages = await convertToModelMessages(cleanedMessages);
            const messages = params.systemPrompt
                ? [{ role: "system" as const, content: params.systemPrompt }, ...modelMessages]
                : modelMessages;

            const result = streamText({
                ...provider(model.model),
                messages,
                abortSignal: params.abortSignal,
            });

            const stream = createUIMessageStream({
                execute: async ({ writer }) => {
                    if (conversationId) {
                        writer.write({ type: "data-conversation-id", data: conversationId });
                    }

                    const uiMessageStream = result.toUIMessageStream({
                        originalMessages: params.messages,
                        onFinish: async (event) => {
                            if (params.saveConversation === false || !conversationId) return;

                            try {
                                const finalResult = await result;
                                let userMessageId: string | undefined;

                                if (params.isRegenerate) {
                                    userMessageId = params.regenerateParentId;
                                } else {
                                    const userMessage = params.messages[params.messages.length - 1];
                                    if (userMessage?.role === "user") {
                                        const savedUserMessage =
                                            await this.aiChatsMessageService.createMessage({
                                                conversationId,
                                                modelId: params.modelId,
                                                message: userMessage,
                                                parentId: params.parentId,
                                            });
                                        userMessageId = savedUserMessage.id;
                                        writer.write({
                                            type: "data-user-message-id",
                                            data: savedUserMessage.id,
                                        });
                                    }
                                }

                                const savedAssistantMessage = await this.saveMessage({
                                    conversationId,
                                    modelId: params.modelId,
                                    message: event.responseMessage,
                                    usage: await finalResult.usage,
                                    status: event.isAborted ? "failed" : "completed",
                                    parentId: userMessageId,
                                });

                                writer.write({
                                    type: "data-assistant-message-id",
                                    data: savedAssistantMessage.id,
                                });
                            } catch (error) {
                                console.error("保存消息失败:", error);
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
            console.error("streamChat error:", error);
            this.handleError(error, response);
        }
    }

    private handleError(error: unknown, response: ServerResponse): void {
        const errorMessage = error instanceof Error ? error.message : "An error occurred.";
        response.writeHead(500, { "Content-Type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`);
        response.end();
    }

    private async saveMessage(params: SaveMessageParams): Promise<AiChatMessage> {
        return this.aiChatsMessageService.createMessage({
            conversationId: params.conversationId,
            modelId: params.modelId,
            message: params.message,
            errorMessage: params.errorMessage,
            tokens: params.usage,
            userConsumedPower: params.consumedPower,
            parentId: params.parentId,
        });
    }
}
