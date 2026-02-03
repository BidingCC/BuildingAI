import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { DatasetsChatMessage } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { validate as isUUID } from "uuid";

import type { CreateDatasetsMessageDto, UpdateDatasetsMessageDto } from "../dto/datasets-chat.dto";

@Injectable()
export class DatasetsChatMessageService extends BaseService<DatasetsChatMessage> {
    constructor(
        @InjectRepository(DatasetsChatMessage)
        private readonly messageRepository: Repository<DatasetsChatMessage>,
    ) {
        super(messageRepository);
    }

    async createMessage(dto: CreateDatasetsMessageDto): Promise<DatasetsChatMessage> {
        try {
            const lastMessage = await this.findOne({
                where: { conversationId: dto.conversationId },
                order: { sequence: "DESC" },
            });

            let resolvedParentId = dto.parentId;
            if (dto.parentId && !isUUID(dto.parentId)) {
                const parentMessage = await this.findByFrontendId(dto.conversationId, dto.parentId);
                resolvedParentId = parentMessage?.id ?? null;
            }

            const frontendId = dto.message?.id ?? undefined;

            const messageData = {
                conversationId: dto.conversationId,
                modelId: dto.modelId,
                sequence: (lastMessage?.sequence ?? 0) + 1,
                parentId: resolvedParentId,
                frontendId: frontendId ?? null,
                message: dto.message,
                status: "completed" as const,
                errorMessage: dto.errorMessage,
                usage: dto.tokens
                    ? {
                          inputTokens: dto.tokens.inputTokens,
                          outputTokens: dto.tokens.outputTokens,
                          totalTokens: dto.tokens.totalTokens,
                          inputTokenDetails: dto.tokens.inputTokenDetails,
                          outputTokenDetails: dto.tokens.outputTokenDetails,
                          reasoningTokens: dto.tokens.reasoningTokens,
                          cachedInputTokens: dto.tokens.cachedInputTokens,
                          raw: dto.tokens.raw,
                      }
                    : undefined,
            };

            return (await this.create(messageData)) as DatasetsChatMessage;
        } catch (error) {
            this.logger.error(
                `创建知识库对话消息失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("创建知识库对话消息失败");
        }
    }

    async findByFrontendId(
        conversationId: string,
        frontendId: string,
    ): Promise<DatasetsChatMessage | null> {
        return this.messageRepository.findOne({
            where: { conversationId, frontendId },
        });
    }

    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        return this.paginate(paginationDto, {
            relations: ["conversation", "model", "model.provider"],
            order: { sequence: "DESC" as const },
            ...(queryDto?.conversationId && {
                where: { conversationId: queryDto.conversationId },
            }),
            includeFields: [
                "model.name",
                "model.modelType",
                "model.features",
                "model.provider.provider",
                "model.provider.name",
                "model.provider.iconUrl",
            ],
        });
    }

    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        return this.findMessages(paginationDto, { conversationId });
    }

    async updateMessage(
        messageId: string,
        dto: UpdateDatasetsMessageDto,
    ): Promise<DatasetsChatMessage> {
        try {
            return (await this.updateById(messageId, dto)) as DatasetsChatMessage;
        } catch (error) {
            this.logger.error(
                `更新知识库对话消息失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("更新知识库对话消息失败");
        }
    }

    async deleteMessage(messageId: string): Promise<void> {
        try {
            await this.delete(messageId);
        } catch (error) {
            this.logger.error(
                `删除知识库对话消息失败: ${(error as Error).message}`,
                (error as Error).stack,
            );
            throw HttpErrorFactory.badRequest("删除知识库对话消息失败");
        }
    }

    /**
     * 按多个对话 ID 汇总消息数与总 Token（供 DatasetsChatRecordService 使用）
     */
    async getMessageStats(
        conversationIds: string[],
    ): Promise<Map<string, { messageCount: number; totalTokens: number }>> {
        const map = new Map<string, { messageCount: number; totalTokens: number }>();
        if (conversationIds.length === 0) return map;

        const rows = await this.repository
            .createQueryBuilder("message")
            .select("message.conversation_id", "conversationId")
            .addSelect("COUNT(message.id)", "messageCount")
            .addSelect("COALESCE(SUM((message.usage->>'totalTokens')::int), 0)", "totalTokens")
            .where("message.conversation_id IN (:...conversationIds)", { conversationIds })
            .groupBy("message.conversation_id")
            .getRawMany();

        for (const row of rows as Array<{
            conversationId: string;
            messageCount: string;
            totalTokens: string;
        }>) {
            map.set(row.conversationId, {
                messageCount: parseInt(row.messageCount, 10) || 0,
                totalTokens: parseInt(row.totalTokens, 10) || 0,
            });
        }
        for (const id of conversationIds) {
            if (!map.has(id)) map.set(id, { messageCount: 0, totalTokens: 0 });
        }
        return map;
    }
}
