import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Post, Query } from "@nestjs/common";

import { BatchDeleteChatRecordDto, QueryAgentChatRecordDto } from "../../dto/agent";
import { AiAgentChatRecordService } from "../../services/ai-agent-chat-record.service";

/**
 * AI Agent Chat Record Controller
 *
 * Provides chat record management functionality for AI agents.
 * Handles CRUD operations for conversation records including listing,
 * detail retrieval, creation, and deletion (both single and batch).
 */
@ConsoleController("ai-agent-chat-record", "智能体对话记录")
export class AiAgentChatRecordController {
    /**
     * Creates a new AiAgentChatRecordController instance
     *
     * @param chatRecordService - Service for handling chat record operations
     */
    constructor(private readonly chatRecordService: AiAgentChatRecordService) {}

    /**
     * Get Chat Record List
     *
     * Retrieves a paginated list of chat records with filtering support.
     * Supports filtering by agent ID, keywords, and status.
     *
     * @param dto - Query parameters including agentId, keyword, status, and pagination
     * @returns Paginated chat record list with metadata
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询对话记录列表",
    })
    @BuildFileUrl(["**.avatar"])
    async list(@Query() dto: QueryAgentChatRecordDto) {
        return this.chatRecordService.getChatRecordList(dto);
    }

    /**
     * Get Chat Record Detail
     *
     * Retrieves detailed information about a specific chat record.
     * Includes user permission validation and access control.
     *
     * @param id - Chat record ID
     * @param user - Current user information
     * @returns Detailed chat record information
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看对话记录详情",
    })
    async detail(@Param("id") id: string, @Playground() user: UserPlayground) {
        return this.chatRecordService.getChatRecordDetail(id, user);
    }

    /**
     * Batch Delete Chat Records
     *
     * Performs soft deletion on multiple chat records by setting
     * the isDeleted field to true. Includes user permission validation.
     *
     * @param dto - Batch delete parameters including record IDs
     * @param user - Current user information
     * @returns Batch deletion result with success/failure counts
     */
    @Delete("batch")
    @Permissions({
        code: "batch-delete",
        name: "批量删除对话记录",
    })
    async batchDelete(@Body() dto: BatchDeleteChatRecordDto, @Playground() user: UserPlayground) {
        return this.chatRecordService.batchDeleteChatRecords(dto, user);
    }

    /**
     * Delete Single Chat Record
     *
     * Performs soft deletion on a single chat record by setting
     * the isDeleted field to true. Includes user permission validation.
     *
     * @param id - Chat record ID to delete
     * @param user - Current user information
     * @returns Deletion confirmation message
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除对话记录",
    })
    async delete(@Param("id") id: string, @Playground() user: UserPlayground) {
        await this.chatRecordService.deleteChatRecord(id, user);
        return {
            message: "对话记录已删除",
        };
    }

    /**
     * Create Chat Record
     *
     * Creates a new chat record for an AI agent with optional title.
     * Automatically sets up the conversation context and user associations.
     *
     * @param body - Creation parameters including agentId and optional title
     * @param user - Current user information
     * @returns Created chat record with assigned ID and metadata
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建对话记录",
    })
    async create(
        @Body() body: { agentId: string; title?: string },
        @Playground() user: UserPlayground,
    ) {
        return this.chatRecordService.createChatRecord(body.agentId, user.id, body.title);
    }
}
