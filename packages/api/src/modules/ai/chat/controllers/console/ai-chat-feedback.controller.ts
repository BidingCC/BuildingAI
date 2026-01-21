import { BaseController } from "@buildingai/base";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Param, Query } from "@nestjs/common";

import { AiChatFeedbackService } from "../../services/ai-chat-feedback.service";

@ConsoleController("ai-chat-feedback", "对话反馈")
export class AiChatFeedbackConsoleController extends BaseController {
    constructor(private readonly feedbackService: AiChatFeedbackService) {
        super();
    }

    @Get("conversation/:conversationId")
    @Permissions({
        code: "list",
        name: "查询对话反馈",
    })
    async getFeedbacksByConversation(
        @Param("conversationId") conversationId: string,
        @Query() paginationDto: PaginationDto,
    ) {
        return await this.feedbackService.getFeedbacksByConversationForConsole(
            conversationId,
            paginationDto,
        );
    }

    @Get("conversation/:conversationId/stats")
    @Permissions({
        code: "stats",
        name: "查询对话反馈统计",
    })
    async getFeedbackStats(@Param("conversationId") conversationId: string) {
        return await this.feedbackService.getFeedbackStatsByConversation(conversationId);
    }

    @Get("message/:messageId")
    @Permissions({
        code: "detail",
        name: "查询消息反馈",
    })
    async getFeedbackByMessage(@Param("messageId") messageId: string) {
        return await this.feedbackService.getFeedbackByMessageForConsole(messageId);
    }
}
