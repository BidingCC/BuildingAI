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
        req.on("close", () => {
            if (!res.writableEnded) abortController.abort();
        });

        const conversationId = dto.id && dto.id !== "new" ? dto.id : dto.conversationId;
        const isRegenerate = dto.trigger === "regenerate-message" && !!dto.messageId;

        // Check if this is a tool approval flow (all messages sent)
        const isToolApprovalFlow = Boolean(dto.messages);

        // For tool approval flow, use all messages; otherwise use single message
        const messages =
            isToolApprovalFlow && dto.messages ? dto.messages : dto.message ? [dto.message] : [];

        await this.chatCompletionService.streamChat(
            {
                userId: playground.id,
                modelId: dto.modelId,
                conversationId,
                messages,
                title: dto.title,
                systemPrompt: dto.systemPrompt,
                mcpServers: dto.mcpServers,
                abortSignal: abortController.signal,
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
