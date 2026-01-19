import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiChatMessage } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { validate as isUUID } from "uuid";

import { CreateMessageDto, UpdateMessageDto } from "../dto/ai-chat-record.dto";

@Injectable()
export class AiChatsMessageService extends BaseService<AiChatMessage> {
    constructor(
        @InjectRepository(AiChatMessage)
        private readonly messageRepository: Repository<AiChatMessage>,
    ) {
        super(messageRepository);
    }

    async createMessage(dto: CreateMessageDto): Promise<AiChatMessage> {
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

            const frontendId = dto.message?.id || null;

            const messageData = {
                conversationId: dto.conversationId,
                modelId: dto.modelId,
                sequence: (lastMessage?.sequence || 0) + 1,
                parentId: resolvedParentId,
                frontendId,
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
                userConsumedPower: dto.userConsumedPower,
            };

            return (await this.create(messageData)) as AiChatMessage;
        } catch (error) {
            this.logger.error(`创建消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create message.");
        }
    }

    async findByFrontendId(
        conversationId: string,
        frontendId: string,
    ): Promise<AiChatMessage | null> {
        return this.messageRepository.findOne({
            where: { conversationId, frontendId },
        });
    }

    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        return this.paginate(paginationDto, {
            relations: ["conversation", "model"],
            order: { sequence: "DESC" as const },
            ...(queryDto?.conversationId && {
                where: { conversationId: queryDto.conversationId },
            }),
        });
    }

    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        return this.findMessages(paginationDto, { conversationId });
    }

    async updateMessage(messageId: string, dto: UpdateMessageDto): Promise<AiChatMessage> {
        try {
            return (await this.updateById(messageId, dto)) as AiChatMessage;
        } catch (error) {
            this.logger.error(`更新消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update message.");
        }
    }

    async deleteMessage(messageId: string): Promise<void> {
        try {
            await this.delete(messageId);
        } catch (error) {
            this.logger.error(`删除消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete message.");
        }
    }

    async getMessageStats(conversationId: string): Promise<{
        messageCount: number;
        totalTokens: number;
        totalPower: number;
    }> {
        const messageCount = await this.count({
            where: { conversationId },
        });

        const tokenStats = await this.repository
            .createQueryBuilder("message")
            .select("COALESCE(SUM((usage->>'totalTokens')::int), 0)", "totalTokens")
            .addSelect("COALESCE(SUM(message.user_consumed_power), 0)", "totalPower")
            .where("message.conversation_id = :conversationId", { conversationId })
            .getRawOne();

        return {
            messageCount,
            totalTokens: parseInt(tokenStats.totalTokens) || 0,
            totalPower: parseInt(tokenStats.totalPower) || 0,
        };
    }

    async getMessageVersions(parentId: string): Promise<AiChatMessage[]> {
        return this.findAll({
            where: { parentId },
            order: { createdAt: "ASC" },
            relations: ["conversation", "model"],
        });
    }
}
