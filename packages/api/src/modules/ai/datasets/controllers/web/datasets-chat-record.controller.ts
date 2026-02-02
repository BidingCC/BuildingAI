import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreateDatasetsChatRecordDto,
    QueryDatasetsChatRecordDto,
    UpdateDatasetsChatRecordDto,
} from "../../dto/datasets-chat.dto";
import { DatasetPermission } from "../../guards/datasets-permission.guard";
import { DatasetsChatRecordService } from "../../services/datasets-chat-record.service";

@WebController("ai-datasets")
export class DatasetsChatRecordWebController extends BaseController {
    constructor(private readonly datasetsChatRecordService: DatasetsChatRecordService) {
        super();
    }

    @Get(":datasetId/conversations")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getUserConversations(
        @Param("datasetId") datasetId: string,
        @Query() queryDto: QueryDatasetsChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return this.datasetsChatRecordService.findUserConversations(
            datasetId,
            playground.id,
            queryDto,
        );
    }

    @Post(":datasetId/conversations")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async createConversation(
        @Param("datasetId") datasetId: string,
        @Body() dto: CreateDatasetsChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return this.datasetsChatRecordService.createConversation(datasetId, playground.id, dto);
    }

    @Get(":datasetId/conversations/:id")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getConversationDetail(
        @Param("datasetId") datasetId: string,
        @Param("id") conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        const conversation = await this.datasetsChatRecordService.getConversationWithMessages(
            conversationId,
            datasetId,
            playground.id,
        );
        if (!conversation) {
            throw HttpErrorFactory.notFound("对话不存在或无权访问");
        }
        return conversation;
    }

    @Get(":datasetId/conversations/:id/info")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getConversationInfo(
        @Param("datasetId") datasetId: string,
        @Param("id") conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        return this.datasetsChatRecordService.getConversationInfo(
            conversationId,
            datasetId,
            playground.id,
        );
    }

    @Patch(":datasetId/conversations/:id")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async updateConversation(
        @Param("datasetId") datasetId: string,
        @Param("id") conversationId: string,
        @Body() dto: UpdateDatasetsChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return this.datasetsChatRecordService.updateConversation(
            conversationId,
            datasetId,
            playground.id,
            dto,
        );
    }

    @Delete(":datasetId/conversations/:id")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async deleteConversation(
        @Param("datasetId") datasetId: string,
        @Param("id") conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        await this.datasetsChatRecordService.deleteConversation(
            conversationId,
            datasetId,
            playground.id,
        );
        return { message: "对话删除成功" };
    }

    @Get(":datasetId/conversations/:id/messages")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getConversationMessages(
        @Param("datasetId") datasetId: string,
        @Param("id") conversationId: string,
        @Query() paginationDto: PaginationDto,
        @Playground() playground: UserPlayground,
    ) {
        const conversation = await this.datasetsChatRecordService.getConversationWithMessages(
            conversationId,
            datasetId,
            playground.id,
        );
        if (!conversation) {
            throw HttpErrorFactory.notFound("对话不存在或无权访问");
        }
        return this.datasetsChatRecordService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }
}
