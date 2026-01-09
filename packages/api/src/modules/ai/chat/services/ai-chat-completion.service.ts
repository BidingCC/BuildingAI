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
        let messagesToSend = params.messages;
        let parentId: string | undefined;

        try {
            if (params.isRegenerate && params.regenerateMessageId) {
                const regenerateMessage = await this.aiChatsMessageService.findOneById(
                    params.regenerateMessageId,
                );

                if (!regenerateMessage) {
                    throw HttpErrorFactory.notFound("要重写的消息不存在");
                }

                conversationId = regenerateMessage.conversationId;

                // 判断 regenerateMessageId 是用户消息还是 assistant 消息
                const messageRole = regenerateMessage.message.role;

                if (messageRole === "user") {
                    // 如果传递的是用户消息ID，直接使用它作为 parentId
                    parentId = regenerateMessage.id;
                } else if (messageRole === "assistant") {
                    // 如果传递的是 assistant 消息ID，获取它的 parentId（用户消息）
                    parentId = regenerateMessage.parentId;

                    if (!parentId) {
                        throw HttpErrorFactory.badRequest("该 assistant 消息没有父消息，无法重写");
                    }
                } else {
                    throw HttpErrorFactory.badRequest("只能重写用户消息或 assistant 消息");
                }

                // 验证 parentId 对应的消息存在（应该是用户消息）
                const parentMessage = await this.aiChatsMessageService.findOneById(parentId);
                if (!parentMessage) {
                    throw HttpErrorFactory.notFound("父消息不存在");
                }

                if (parentMessage.message.role !== "user") {
                    throw HttpErrorFactory.badRequest("父消息必须是用户消息");
                }

                // 获取所有消息并截取到 parentId 位置
                const allMessages = await this.aiChatsMessageService.findAll({
                    where: { conversationId },
                    order: { sequence: "ASC" },
                });

                const parentIndex = allMessages.findIndex((m) => m.id === parentId);
                if (parentIndex === -1) {
                    throw HttpErrorFactory.notFound("父消息在对话中不存在");
                }

                // 截取消息到 parentId 位置（包含该用户消息）
                messagesToSend = allMessages.slice(0, parentIndex + 1).map((m) => ({
                    ...m.message,
                    id: m.id,
                }));
            }

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

            const modelMessages = await convertToModelMessages(
                messagesToSend.map(({ id: _id, ...msg }) => msg),
            );

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
                        writer.write({
                            type: "data-conversation-id",
                            data: conversationId,
                        });
                    }

                    const uiMessageStream = result.toUIMessageStream({
                        originalMessages: messagesToSend,
                        onFinish: async (event) => {
                            if (params.saveConversation !== false && conversationId) {
                                try {
                                    const finalResult = await result;
                                    let userMessageId: string | undefined;

                                    if (params.isRegenerate && parentId) {
                                        userMessageId = parentId;
                                    } else {
                                        const userMessage =
                                            messagesToSend[messagesToSend.length - 1];
                                        if (userMessage && userMessage.role === "user") {
                                            // 普通发送时：user 消息的 parentId 应该是“当前分支的最后一条 assistant”
                                            // 这样才能在数据库中形成正确的树形分支结构（在不同版本下继续对话）
                                            const lastAssistantId = [...messagesToSend]
                                                .reverse()
                                                .find((m) => m.role === "assistant")?.id;
                                            const savedUserMessage =
                                                await this.aiChatsMessageService.createMessage({
                                                    conversationId,
                                                    modelId: params.modelId,
                                                    message: userMessage,
                                                    parentId: lastAssistantId || undefined,
                                                });
                                            userMessageId = savedUserMessage.id;
                                        }
                                    }

                                    await this.saveMessage({
                                        conversationId,
                                        modelId: params.modelId,
                                        message: event.responseMessage,
                                        usage: await finalResult.usage,
                                        status: event.isAborted ? "failed" : "completed",
                                        parentId: userMessageId,
                                    });
                                } catch (error) {
                                    console.error("保存消息失败:", error);
                                }
                            }
                        },
                        onError: (error) =>
                            error instanceof Error ? error.message : "An error occurred.",
                    });
                    writer.merge(uiMessageStream);
                },
            });

            pipeUIMessageStreamToResponse({
                stream,
                response,
            });
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
