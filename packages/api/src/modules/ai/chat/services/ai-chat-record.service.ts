import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiChatFeedback, AiChatMessage, AiChatRecord } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import {
    ConversationStatus,
    CreateAIChatRecordDto,
    CreateMessageDto,
    QueryAIChatRecordDto,
    UpdateAIChatRecordDto,
    UpdateMessageDto,
} from "../dto/ai-chat-record.dto";
import { AiChatsMessageService } from "./ai-chat-message.service";

/**
 * AI对话记录服务
 * 提供对话和消息的完整CRUD操作，继承BaseService获得通用CRUD功能
 */
@Injectable()
export class AiChatRecordService extends BaseService<AiChatRecord> {
    constructor(
        @InjectRepository(AiChatRecord)
        conversationRepository: Repository<AiChatRecord>,
        @InjectRepository(AiChatFeedback)
        private readonly feedbackRepository: Repository<AiChatFeedback>,
        private readonly aiChatsMessageService: AiChatsMessageService,
    ) {
        super(conversationRepository);
    }

    /**
     * 创建新对话
     * @param userId 用户ID
     * @param dto 创建对话DTO
     */
    async createConversation(userId: string, dto: CreateAIChatRecordDto): Promise<AiChatRecord> {
        const conversationData = {
            ...dto,
            userId,
            messageCount: 0,
            totalTokens: 0,
            status: ConversationStatus.ACTIVE,
        };

        try {
            const result = await this.create(conversationData);
            return result as AiChatRecord;
        } catch (error) {
            this.logger.error(`创建对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create conversation.");
        }
    }

    async findUserConversations(
        userId: string,
        queryDto?: QueryAIChatRecordDto,
        includeUserInfo: boolean = false,
    ) {
        try {
            const queryBuilder = this.repository.createQueryBuilder("conversation");

            if (includeUserInfo) {
                queryBuilder.leftJoinAndSelect("conversation.user", "user");
            }

            queryBuilder.where("conversation.isDeleted = :isDeleted", { isDeleted: false });

            if (userId && userId.trim() !== "") {
                queryBuilder.andWhere("conversation.userId = :userId", { userId });
            }

            if (queryDto?.status) {
                queryBuilder.andWhere("conversation.status = :status", { status: queryDto.status });
            }

            if (queryDto?.isPinned !== undefined) {
                queryBuilder.andWhere("conversation.isPinned = :isPinned", {
                    isPinned: queryDto.isPinned,
                });
            }

            if (queryDto?.keyword) {
                queryBuilder.andWhere(
                    "(conversation.title LIKE :keyword OR conversation.summary LIKE :keyword)",
                    { keyword: `%${queryDto.keyword}%` },
                );
            }

            if (queryDto?.feedbackFilter) {
                if (queryDto.feedbackFilter === "high-like") {
                    const likeCountSubQuery = this.repository.manager
                        .createQueryBuilder()
                        .subQuery()
                        .select("COUNT(*)", "count")
                        .from("ai_chat_feedback", "feedback")
                        .where("feedback.conversation_id = conversation.id")
                        .andWhere("feedback.type = 'like'")
                        .getQuery();

                    const totalCountSubQuery = this.repository.manager
                        .createQueryBuilder()
                        .subQuery()
                        .select("COUNT(*)", "count")
                        .from("ai_chat_feedback", "feedback")
                        .where("feedback.conversation_id = conversation.id")
                        .getQuery();

                    queryBuilder.andWhere(
                        `((${likeCountSubQuery})::float / NULLIF((${totalCountSubQuery}), 0) * 100) >= 70`,
                    );
                } else if (queryDto.feedbackFilter === "high-dislike") {
                    const dislikeCountSubQuery = this.repository.manager
                        .createQueryBuilder()
                        .subQuery()
                        .select("COUNT(*)", "count")
                        .from("ai_chat_feedback", "feedback")
                        .where("feedback.conversation_id = conversation.id")
                        .andWhere("feedback.type = 'dislike'")
                        .getQuery();

                    const totalCountSubQuery = this.repository.manager
                        .createQueryBuilder()
                        .subQuery()
                        .select("COUNT(*)", "count")
                        .from("ai_chat_feedback", "feedback")
                        .where("feedback.conversation_id = conversation.id")
                        .getQuery();

                    queryBuilder.andWhere(
                        `((${dislikeCountSubQuery})::float / NULLIF((${totalCountSubQuery}), 0) * 100) >= 50`,
                    );
                } else if (queryDto.feedbackFilter === "has-feedback") {
                    const hasFeedbackSubQuery = this.repository.manager
                        .createQueryBuilder()
                        .subQuery()
                        .select("COUNT(*)", "count")
                        .from("ai_chat_feedback", "feedback")
                        .where("feedback.conversation_id = conversation.id")
                        .getQuery();

                    queryBuilder.andWhere(`(${hasFeedbackSubQuery}) > 0`);
                }
            }

            queryBuilder.orderBy("conversation.isPinned", "DESC");
            queryBuilder.addOrderBy("conversation.updatedAt", "DESC");

            const excludeFields = includeUserInfo ? ["user.password", "user.openid"] : [];
            const result = await this.paginateQueryBuilder(
                queryBuilder,
                queryDto || {},
                excludeFields,
            );

            if (result.items.length > 0) {
                const conversationIds = result.items.map((item) => item.id);

                const messageStats = await this.repository.manager
                    .createQueryBuilder()
                    .select("message.conversation_id", "conversationId")
                    .addSelect("COUNT(message.id)", "messageCount")
                    .addSelect(
                        "COALESCE(SUM((message.usage->>'totalTokens')::int), 0)",
                        "totalTokens",
                    )
                    .addSelect("COALESCE(SUM(message.user_consumed_power), 0)", "totalPower")
                    .from("ai_chat_message", "message")
                    .where("message.conversation_id IN (:...conversationIds)", { conversationIds })
                    .groupBy("message.conversation_id")
                    .getRawMany();

                const statsMap = new Map<
                    string,
                    { messageCount: number; totalTokens: number; totalPower: number }
                >();
                messageStats.forEach((stat: any) => {
                    statsMap.set(stat.conversationId, {
                        messageCount: parseInt(stat.messageCount) || 0,
                        totalTokens: parseInt(stat.totalTokens) || 0,
                        totalPower: parseInt(stat.totalPower) || 0,
                    });
                });

                result.items = result.items.map((item) => {
                    const stats = statsMap.get(item.id) || {
                        messageCount: 0,
                        totalTokens: 0,
                        totalPower: 0,
                    };
                    return {
                        ...item,
                        messageCount: stats.messageCount,
                        totalTokens: stats.totalTokens,
                        totalPower: stats.totalPower,
                    };
                });
            }

            return result;
        } catch (error) {
            this.logger.error(`查询用户对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to query user conversations.");
        }
    }

    /**
     * 根据ID获取对话详情
     * @param conversationId 对话ID
     * @param userId 用户ID
     * @param includeUserInfo 是否包含用户信息
     */
    async getConversationWithMessages(
        conversationId: string,
        userId?: string,
    ): Promise<Partial<AiChatRecord> | null> {
        try {
            const where = buildWhere<AiChatRecord>({
                isDeleted: false,
                userId,
            });
            const result = await this.findOneById(conversationId, {
                where,
                relations: ["user"],
                excludeFields: ["user.password", "user.openid"],
            });
            return result;
        } catch (error) {
            this.logger.error(`获取对话详情失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to get conversation detail.");
        }
    }

    async getConversationInfo(
        conversationId: string,
        userId?: string,
    ): Promise<Partial<AiChatRecord> | null> {
        try {
            const where = buildWhere<AiChatRecord>({
                isDeleted: false,
                userId,
            });
            return await this.findOneById(conversationId, { where });
        } catch (error) {
            this.logger.error(`获取对话信息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to get conversation info.");
        }
    }

    /**
     * 更新对话信息
     * @param conversationId 对话ID
     * @param userId 用户ID，空字符串表示管理员操作
     * @param dto 更新数据
     */
    async updateConversation(
        conversationId: string,
        userId: string,
        dto: UpdateAIChatRecordDto,
    ): Promise<AiChatRecord> {
        try {
            // 构建 where 条件
            const whereCondition: any = {
                id: conversationId,
                isDeleted: false,
            };

            // 如果不是管理员操作，需要验证用户权限
            if (userId && userId.trim() !== "") {
                whereCondition.userId = userId;
            }

            // 先验证记录是否存在且符合条件（因为 BaseService.updateById 可能不会使用 where 条件）
            const existingRecord = await this.repository.findOne({
                where: whereCondition,
            });

            if (!existingRecord) {
                // 检查记录是否存在（不考虑删除状态和用户权限）
                const recordExists = await this.repository.findOne({
                    where: { id: conversationId },
                });

                if (!recordExists) {
                    this.logger.warn(
                        `更新对话失败: 对话不存在 - conversationId: ${conversationId}, userId: ${userId}`,
                    );
                    throw HttpErrorFactory.notFound("对话不存在");
                }

                // 检查是否已被删除
                if (recordExists.isDeleted) {
                    this.logger.warn(
                        `更新对话失败: 对话已被删除 - conversationId: ${conversationId}, userId: ${userId}`,
                    );
                    throw HttpErrorFactory.badRequest("对话已被删除");
                }

                // 检查用户权限
                if (userId && userId.trim() !== "" && recordExists.userId !== userId) {
                    this.logger.warn(
                        `更新对话失败: 权限不足 - conversationId: ${conversationId}, userId: ${userId}, recordUserId: ${recordExists.userId}`,
                    );
                    throw HttpErrorFactory.forbidden("无权访问此对话");
                }

                // 其他未知情况
                this.logger.error(
                    `更新对话失败: 未知原因 - conversationId: ${conversationId}, userId: ${userId}, dto: ${JSON.stringify(dto)}`,
                );
                throw HttpErrorFactory.badRequest("无法更新对话，请稍后重试");
            }

            // 执行更新
            const result = await this.updateById(conversationId, dto, {
                where: whereCondition,
            });
            return result as AiChatRecord;
        } catch (error) {
            // 如果是已知的 HTTP 错误，直接抛出
            if (error.statusCode || error.status) {
                throw error;
            }

            // 记录详细的错误信息
            this.logger.error(
                `更新对话失败: ${error.message} - conversationId: ${conversationId}, userId: ${userId}, dto: ${JSON.stringify(dto)}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest(`更新对话失败: ${error.message}`);
        }
    }

    /**
     * 软删除对话
     * @param conversationId 对话ID
     * @param userId 用户ID
     */
    async deleteConversation(conversationId: string, userId: string): Promise<void> {
        try {
            const queryBuilder = this.repository
                .createQueryBuilder()
                .update(AiChatRecord)
                .set({ isDeleted: true })
                .where("id = :conversationId", { conversationId })
                .andWhere("isDeleted = :isDeleted", { isDeleted: false });

            // 如果不是管理员操作，需要验证用户权限
            if (userId && userId.trim() !== "") {
                queryBuilder.andWhere("userId = :userId", { userId });
            }

            await queryBuilder.execute();
        } catch (error) {
            this.logger.error(`删除对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete conversation.");
        }
    }

    /**
     * 批量删除对话
     * @param ids 对话ID数组
     * @param userId 用户ID
     */
    async batchDeleteConversations(ids: string[], userId: string = ""): Promise<void> {
        try {
            const queryBuilder = this.repository
                .createQueryBuilder()
                .update(AiChatRecord)
                .set({ isDeleted: true })
                .where("id IN (:...ids)", { ids })
                .andWhere("isDeleted = :isDeleted", { isDeleted: false });

            // 如果不是管理员操作，需要验证用户权限
            if (userId && userId.trim() !== "") {
                queryBuilder.andWhere("userId = :userId", { userId });
            }

            await queryBuilder.execute();
        } catch (error) {
            this.logger.error(`批量删除对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to batch delete conversations.");
        }
    }

    /**
     * 置顶/取消置顶对话
     * @param conversationId 对话ID
     * @param userId 用户ID，空字符串表示管理员操作
     * @param isPinned 是否置顶
     */
    async pinConversation(
        conversationId: string,
        userId: string,
        isPinned: boolean,
    ): Promise<void> {
        try {
            // 构建 where 条件
            const whereCondition: any = {
                id: conversationId,
                isDeleted: false,
            };

            // 如果不是管理员操作，需要验证用户权限
            if (userId && userId.trim() !== "") {
                whereCondition.userId = userId;
            }

            await this.updateById(
                conversationId,
                { isPinned },
                {
                    where: whereCondition,
                },
            );
        } catch (error) {
            this.logger.error(`置顶对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to pin conversation.");
        }
    }

    // =================== 消息相关方法 ===================

    /**
     * 创建消息
     * @param dto 创建消息DTO
     */
    async createMessage(dto: CreateMessageDto): Promise<AiChatMessage> {
        try {
            const savedMessage = await this.aiChatsMessageService.createMessage(dto);

            // 更新对话统计信息
            await this.updateConversationStats(dto.conversationId);

            return savedMessage;
        } catch (error) {
            this.logger.error(`创建消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create message.");
        }
    }

    /**
     * 分页查询消息
     * @param paginationDto 分页参数
     * @param queryDto 查询条件
     */
    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        return await this.aiChatsMessageService.findMessages(paginationDto, queryDto);
    }

    /**
     * 获取对话的消息列表
     * @param conversationId 对话ID
     * @param paginationDto 分页参数
     */
    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        return await this.aiChatsMessageService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }

    /**
     * 更新消息
     * @param messageId 消息ID
     * @param dto 更新数据
     */
    async updateMessage(messageId: string, dto: UpdateMessageDto): Promise<AiChatMessage> {
        try {
            const updatedMessage = await this.aiChatsMessageService.updateMessage(messageId, dto);

            await this.updateConversationStats(updatedMessage.conversationId);

            return updatedMessage;
        } catch (error) {
            this.logger.error(`更新消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update message.");
        }
    }

    /**
     * 删除消息
     * @param messageId 消息ID
     */
    async deleteMessage(messageId: string): Promise<void> {
        try {
            // 先获取消息信息
            const message = await this.aiChatsMessageService.findOneById(messageId);
            if (!message) {
                throw HttpErrorFactory.notFound("Message not found.");
            }

            await this.aiChatsMessageService.deleteMessage(messageId);

            // 更新对话统计信息
            await this.updateConversationStats(message.conversationId);
        } catch (error) {
            this.logger.error(`删除消息失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete message.");
        }
    }

    // =================== 私有辅助方法 ===================

    /**
     * 更新对话统计信息
     */
    private async updateConversationStats(conversationId: string): Promise<void> {
        try {
            const stats = await this.aiChatsMessageService.getMessageStats(conversationId);

            await this.updateById(conversationId, {
                messageCount: stats.messageCount,
                totalTokens: stats.totalTokens,
                totalPower: stats.totalPower,
            });
        } catch (error) {
            this.logger.error(`更新对话统计信息失败: ${error.message}`, error.stack);
            // 统计信息更新失败不应该影响主流程，仅记录日志
        }
    }
}
