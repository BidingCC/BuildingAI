import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import {
    CreateAIChatRecordDto,
    QueryAIChatRecordDto,
    UpdateAIChatRecordDto,
} from "@modules/ai/chat/dto/ai-chat-record.dto";
import { AiChatRecordService } from "@modules/ai/chat/services/ai-chat-record.service";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

/**
 * AI对话记录控制器（前台）
 *
 * 提供用户对话记录的查询和管理功能
 */
@WebController("ai-conversations")
export class AiChatRecordWebController extends BaseController {
    constructor(private readonly AiChatRecordService: AiChatRecordService) {
        super();
    }

    /**
     * 分页查询用户对话记录
     */
    @Get()
    async getUserConversations(
        @Query() queryDto: QueryAIChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return await this.AiChatRecordService.findUserConversations(playground.id, queryDto, false);
    }

    /**
     * 创建新对话
     */
    @Post()
    async createConversation(
        @Body() dto: CreateAIChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return await this.AiChatRecordService.createConversation(playground.id, dto);
    }

    /**
     * 获取对话详情（包含消息）
     */
    @Get(":id")
    async getConversationDetail(
        @Param("id") conversationId: string,
        @Playground() user: UserPlayground,
    ) {
        return await this.AiChatRecordService.getConversationWithMessages(conversationId, user.id);
    }

    /**
     * 更新对话信息
     */
    @Patch(":id")
    async updateConversation(
        @Param("id") conversationId: string,
        @Body() dto: UpdateAIChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return await this.AiChatRecordService.updateConversation(
            conversationId,
            playground.id,
            dto,
        );
    }

    /**
     * 删除对话
     */
    @Delete(":id")
    async deleteConversation(
        @Param("id") conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        await this.AiChatRecordService.deleteConversation(conversationId, playground.id);
        return { message: "对话删除成功" };
    }

    /**
     * 置顶/取消置顶对话
     */
    @Patch(":id/pin")
    async pinConversation(
        @Param("id") conversationId: string,
        @Body("isPinned") isPinned: boolean,
        @Playground() playground: UserPlayground,
    ) {
        await this.AiChatRecordService.pinConversation(conversationId, playground.id, isPinned);
        return { message: isPinned ? "对话已置顶" : "对话已取消置顶" };
    }

    /**
     * 获取对话的消息列表
     */
    @Get(":id/messages")
    async getConversationMessages(
        @Param("id") conversationId: string,
        @Query() paginationDto: PaginationDto,
        @Playground() playground: UserPlayground,
    ) {
        // 先检查对话是否属于当前用户
        const conversation = await this.AiChatRecordService.getConversationWithMessages(
            conversationId,
            playground.id,
        );

        if (!conversation) {
            throw HttpErrorFactory.notFound("对话不存在或无权访问");
        }

        return await this.AiChatRecordService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }
}
