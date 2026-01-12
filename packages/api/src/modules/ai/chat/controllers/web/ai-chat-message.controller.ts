import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { ChatRequestDto } from "../../dto/ai-chat-request.dto";
import { ChatCompletionService } from "../../services/ai-chat-completion.service";

@WebController("ai-chat")
export class AiChatMessageWebController extends BaseController {
    constructor(private readonly chatCompletionService: ChatCompletionService) {
        super();
    }

    @Post()
    async streamChat(
        @Body() dto: ChatRequestDto,
        @Playground() playground: UserPlayground,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        const abortController = new AbortController();
        const abortSignal =
            (req as any).signal instanceof AbortSignal
                ? (req as any).signal
                : abortController.signal;

        if (!((req as any).signal instanceof AbortSignal)) {
            const handleDisconnect = () => {
                if (!res.writableEnded && !abortSignal.aborted) abortController.abort();
            };
            req.on("close", handleDisconnect);
            req.on("aborted", handleDisconnect);
            res.on("close", handleDisconnect);
            if (req.aborted || req.socket?.destroyed) abortController.abort();
        }

        const conversationId = dto.id && dto.id !== "new" ? dto.id : dto.conversationId;
        const isRegenerate = dto.trigger === "regenerate-message" && !!dto.messageId;
        const isToolApprovalFlow =
            dto.message &&
            !dto.messages &&
            dto.message.role === "assistant" &&
            dto.message.parts?.some((part) => {
                const state = (part as { state?: string }).state;
                return ["approval-responded", "output-denied"].includes(state || "");
            });

        await this.chatCompletionService.streamChat(
            {
                userId: playground.id,
                modelId: dto.modelId,
                conversationId,
                messages: dto.messages ?? (dto.message ? [dto.message] : []),
                title: dto.title,
                systemPrompt: dto.systemPrompt,
                mcpServers: dto.mcpServers,
                abortSignal,
                isRegenerate,
                regenerateMessageId: dto.messageId,
                parentId: isRegenerate ? undefined : dto.parentId,
                regenerateParentId: isRegenerate ? dto.parentId : undefined,
                isToolApprovalFlow,
            },
            res,
        );
    }
}
