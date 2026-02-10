import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { DatasetsChatRequestDto } from "../../dto/datasets-chat.dto";
import { DatasetPermission } from "../../guards/datasets-permission.guard";
import { DatasetsChatCompletionService } from "../../services/datasets-chat-completion.service";

@WebController("ai-datasets")
export class DatasetsChatMessageWebController extends BaseController {
    constructor(private readonly datasetsChatCompletionService: DatasetsChatCompletionService) {
        super();
    }

    @Post(":datasetId/chat")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async streamChat(
        @Param("datasetId") datasetId: string,
        @Body() dto: DatasetsChatRequestDto,
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

        await this.datasetsChatCompletionService.streamChat(
            {
                datasetId,
                userId: playground.id,
                modelId: dto.modelId,
                conversationId,
                messages: dto.messages ?? (dto.message ? [dto.message] : []),
                title: dto.title,
                abortSignal,
                isRegenerate,
                regenerateMessageId: dto.messageId,
                parentId: isRegenerate ? undefined : dto.parentId,
                regenerateParentId: isRegenerate ? dto.parentId : undefined,
                feature: dto.feature,
            },
            res,
        );
    }
}
