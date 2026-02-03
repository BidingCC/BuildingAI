import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import type {
    CreateDatasetsChatRecordDto,
    QueryDatasetsChatRecordDto,
    UpdateDatasetsChatRecordDto,
} from "../dto/datasets-chat.dto";
import { DatasetsConversationStatus } from "../dto/datasets-chat.dto";
import { DatasetsChatMessageService } from "./datasets-chat-message.service";

/**
 * 知识库调试对话记录服务
 * 提供知识库下对话的 CRUD，与 AiChatRecordService 对齐（无反馈、无置顶）
 */
@Injectable()
export class DatasetsChatRecordService extends BaseService<DatasetsChatRecord> {
    constructor(
        @InjectRepository(DatasetsChatRecord)
        conversationRepository: Repository<DatasetsChatRecord>,
        private readonly datasetsChatMessageService: DatasetsChatMessageService,
    ) {
        super(conversationRepository);
    }

    async createConversation(
        datasetId: string,
        userId: string,
        dto: CreateDatasetsChatRecordDto,
    ): Promise<DatasetsChatRecord> {
        const conversationData = {
            ...dto,
            datasetId,
            userId,
            messageCount: 0,
            totalTokens: 0,
            status: DatasetsConversationStatus.ACTIVE as const,
        };

        try {
            const result = await this.create(conversationData);
            return result as DatasetsChatRecord;
        } catch (error) {
            this.logger.error(
                `创建知识库对话失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("创建知识库对话失败");
        }
    }

    async findUserConversations(
        datasetId: string,
        userId: string,
        queryDto?: QueryDatasetsChatRecordDto,
    ) {
        try {
            const queryBuilder = this.repository
                .createQueryBuilder("conversation")
                .where("conversation.datasetId = :datasetId", { datasetId })
                .andWhere("conversation.userId = :userId", { userId })
                .andWhere("conversation.isDeleted = :isDeleted", { isDeleted: false });

            if (queryDto?.status) {
                queryBuilder.andWhere("conversation.status = :status", { status: queryDto.status });
            }

            if (queryDto?.keyword) {
                queryBuilder.andWhere(
                    "(conversation.title LIKE :keyword OR conversation.summary LIKE :keyword)",
                    { keyword: `%${queryDto.keyword}%` },
                );
            }

            queryBuilder.orderBy("conversation.updatedAt", "DESC");

            const result = await this.paginateQueryBuilder(queryBuilder, queryDto ?? {});

            if (result.items.length > 0) {
                const conversationIds = result.items.map((item) => item.id);
                const stats =
                    await this.datasetsChatMessageService.getMessageStats(conversationIds);
                result.items = result.items.map((item) => ({
                    ...item,
                    messageCount: stats.get(item.id)?.messageCount ?? 0,
                    totalTokens: stats.get(item.id)?.totalTokens ?? 0,
                }));
            }

            return result;
        } catch (error) {
            this.logger.error(
                `查询知识库对话失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("查询知识库对话失败");
        }
    }

    async getConversationWithMessages(
        conversationId: string,
        datasetId: string,
        userId?: string,
    ): Promise<Partial<DatasetsChatRecord> | null> {
        try {
            const where = buildWhere<DatasetsChatRecord>({
                id: conversationId,
                datasetId,
                isDeleted: false,
                ...(userId && { userId }),
            });
            return await this.findOneById(conversationId, { where });
        } catch (error) {
            this.logger.error(
                `获取知识库对话详情失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("获取知识库对话详情失败");
        }
    }

    async getConversationInfo(
        conversationId: string,
        datasetId: string,
        userId?: string,
    ): Promise<Partial<DatasetsChatRecord> | null> {
        try {
            const where = buildWhere<DatasetsChatRecord>({
                id: conversationId,
                datasetId,
                isDeleted: false,
                ...(userId && { userId }),
            });
            return await this.findOneById(conversationId, { where });
        } catch (error) {
            this.logger.error(
                `获取知识库对话信息失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("获取知识库对话信息失败");
        }
    }

    async updateConversation(
        conversationId: string,
        datasetId: string,
        userId: string,
        dto: UpdateDatasetsChatRecordDto,
    ): Promise<DatasetsChatRecord> {
        try {
            const whereCondition: Record<string, unknown> = {
                id: conversationId,
                datasetId,
                isDeleted: false,
            };
            if (userId?.trim() !== "") {
                (whereCondition as any).userId = userId;
            }

            const existing = await this.repository.findOne({ where: whereCondition as any });
            if (!existing) {
                const anyRecord = await this.repository.findOne({ where: { id: conversationId } });
                if (!anyRecord) throw HttpErrorFactory.notFound("对话不存在");
                if (anyRecord.isDeleted) throw HttpErrorFactory.badRequest("对话已删除");
                if (userId?.trim() !== "" && anyRecord.userId !== userId) {
                    throw HttpErrorFactory.forbidden("无权访问此对话");
                }
                throw HttpErrorFactory.badRequest("无法更新对话");
            }

            return (await this.updateById(conversationId, dto, {
                where: whereCondition as any,
            })) as DatasetsChatRecord;
        } catch (error) {
            if ((error as any).statusCode) throw error;
            this.logger.error(
                `更新知识库对话失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest(`更新知识库对话失败: ${(error as Error).message}`);
        }
    }

    async deleteConversation(
        conversationId: string,
        datasetId: string,
        userId: string,
    ): Promise<void> {
        try {
            const qb = this.repository
                .createQueryBuilder()
                .update(DatasetsChatRecord)
                .set({ isDeleted: true })
                .where("id = :conversationId", { conversationId })
                .andWhere("datasetId = :datasetId", { datasetId })
                .andWhere("isDeleted = :isDeleted", { isDeleted: false });
            if (userId?.trim() !== "") {
                qb.andWhere("userId = :userId", { userId });
            }
            await qb.execute();
        } catch (error) {
            this.logger.error(
                `删除知识库对话失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("删除知识库对话失败");
        }
    }

    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        return this.datasetsChatMessageService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }

    async updateConversationStats(conversationId: string): Promise<void> {
        try {
            const stats = await this.datasetsChatMessageService.getMessageStats([conversationId]);
            const s = stats.get(conversationId);
            if (s) {
                await this.updateById(conversationId, {
                    messageCount: s.messageCount,
                    totalTokens: s.totalTokens,
                });
            }
        } catch (error) {
            this.logger.error(
                `更新知识库对话统计失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
        }
    }
}
