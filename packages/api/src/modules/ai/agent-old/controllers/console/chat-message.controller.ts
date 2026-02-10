import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Param, Query } from "@nestjs/common";

import { AiAgentChatsMessageService } from "../../services/ai-agent-chat-message.service";

/**
 * AI Agent Chat Message Controller
 *
 * Provides chat message query functionality for AI agents.
 * Handles retrieval of conversation messages with pagination support.
 */
@ConsoleController("ai-agent-chat-message", "智能体对话消息")
export class AiAgentChatMessageController {
    /**
     * Creates a new AiAgentChatMessageController instance
     *
     * @param AiAgentChatsMessageService - Service for handling chat message operations
     */
    constructor(private readonly AiAgentChatsMessageService: AiAgentChatsMessageService) {}

    /**
     * Get Conversation Messages
     *
     * Retrieves a paginated list of messages for a specific conversation.
     * Supports pagination and user permission validation.
     *
     * @param conversationId - ID of the conversation to retrieve messages from
     * @param paginationDto - Pagination parameters including page and pageSize
     * @returns Paginated message list with metadata
     */
    @Get("conversation/:conversationId")
    @Permissions({
        code: "get-messages",
        name: "查看对话消息",
    })
    async getConversationMessages(
        @Param("conversationId") conversationId: string,
        @Query() paginationDto: PaginationDto,
    ) {
        return this.AiAgentChatsMessageService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }
}
