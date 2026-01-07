import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Post, Req, Res } from "@nestjs/common";
import type { UIMessage } from "ai";
import { createUIMessageStream, pipeUIMessageStreamToResponse } from "ai";
import type { Request, Response } from "express";
import type { ServerResponse } from "http";

import { ChatCompletionService } from "../../services/chat-completion.service";

/**
 * AI SDK useChat 请求体格式
 *
 * 注意：
 * - `id`: AI SDK 自动生成的 chat session ID（前端临时标识，用于续流）
 * - `conversationId`: 后端数据库中的对话记录 ID（持久化存储）
 * - `trigger`: 请求类型，'submit-message' 或 'regenerate-message'
 */
interface UseChatRequestBody {
    /** AI SDK 自动生成的 chat session ID（前端临时标识） */
    id?: string;
    /** 消息列表 */
    messages: UIMessage[];
    /** 请求类型 */
    trigger?: "submit-message" | "regenerate-message";
    /** 额外数据 */
    data?: {
        modelId?: string;
        conversationId?: string;
        title?: string;
        systemPrompt?: string;
        mcpServers?: string[];
    };
}

/**
 * AI 聊天控制器（前台）
 *
 * 完全兼容 @ai-sdk/react 的 useChat hook
 */
@WebController("ai-chat")
export class AiChatMessageWebController extends BaseController {
    constructor(private readonly chatCompletionService: ChatCompletionService) {
        super();
    }

    /**
     * 流式对话接口 - 兼容 AI SDK useChat
     */
    @Post()
    async chat(
        @Body() body: UseChatRequestBody,
        @Playground() user: UserPlayground,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const abortController = new AbortController();

        req.on("close", () => {
            abortController.abort();
            this.logger.debug("客户端断开连接，已取消请求");
        });

        try {
            const modelId = body.data?.modelId;
            if (!modelId) {
                throw HttpErrorFactory.paramError("modelId 是必填参数");
            }

            if (!body.messages || body.messages.length === 0) {
                throw HttpErrorFactory.paramError("messages 不能为空");
            }

            const { stream, context } = await this.chatCompletionService.streamChat({
                userId: user.id,
                modelId,
                messages: body.messages,
                conversationId: body.data?.conversationId,
                title: body.data?.title,
                systemPrompt: body.data?.systemPrompt,
                mcpServers: body.data?.mcpServers,
                saveConversation: true,
                abortSignal: abortController.signal,
            });

            const conversationId = !body.data?.conversationId ? context.conversationId : null;

            const customStream = createUIMessageStream({
                execute({ writer }) {
                    if (conversationId) {
                        writer.write({
                            type: "data-conversation_id",
                            data: conversationId,
                        });
                    }

                    // 合并 AI SDK 的流
                    writer.merge(
                        stream.toUIMessageStream({
                            sendReasoning: true,
                            sendSources: false,
                        }),
                    );
                },
            });

            const serverRes = res as unknown as ServerResponse;
            pipeUIMessageStreamToResponse({
                response: serverRes,
                stream: customStream,
                status: 200,
                statusText: "OK",
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        } catch (error) {
            this.logger.error(`对话请求失败: ${error.message}`, error.stack);

            if (!res.headersSent) {
                res.status(error.status || 500).json({
                    error: error.message || "对话请求失败",
                    code: error.code || "INTERNAL_ERROR",
                });
            }
        }
    }

    /**
     * 续流接口
     */
    @Post("continue")
    async continueChat(
        @Body() body: { conversationId: string },
        @Playground() user: UserPlayground,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const abortController = new AbortController();

        req.on("close", () => {
            abortController.abort();
            this.logger.debug("客户端断开连接，续流已取消");
        });

        try {
            if (!body.conversationId) {
                throw HttpErrorFactory.paramError("conversationId 是必填参数");
            }

            const { stream } = await this.chatCompletionService.continueChat(
                user.id,
                body.conversationId,
                abortController.signal,
            );

            stream.pipeUIMessageStreamToResponse(res as unknown as ServerResponse, {
                sendReasoning: true,
                sendSources: false,
                onError: (error) => {
                    this.logger.error(`续流错误: ${error}`);
                    return "续流过程中发生错误";
                },
            });
        } catch (error) {
            this.logger.error(`续流请求失败: ${error.message}`, error.stack);

            if (!res.headersSent) {
                res.status(error.status || 500).json({
                    error: error.message || "续流请求失败",
                    code: error.code || "INTERNAL_ERROR",
                });
            }
        }
    }
}
