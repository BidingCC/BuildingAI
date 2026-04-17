import { BaseService, type PaginationResult } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    type AgentChatMessage,
    AgentChatMessageFeedback,
    AgentChatRecord,
    User,
} from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import type { ListAgentConversationsDto } from "../dto/web/chat/list-agent-conversations.dto";
import { AgentChatMessageService } from "./agent-chat-message.service";

export type AgentChatRecordWithUser = AgentChatRecord & {
    userName?: string;
    userAvatar?: string;
};

export type AgentChatThreadSession = {
    conversationId: string;
    messages: AgentChatMessage[];
};

export type AgentChatThreadResult = {
    sessions: AgentChatThreadSession[];
    activeConversationId: string | null;
    hasMore?: boolean;
    nextCursor?: string | null;
};

@Injectable()
export class AgentChatRecordService extends BaseService<AgentChatRecord> {
    constructor(
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(AgentChatMessageFeedback)
        private readonly feedbackRepository: Repository<AgentChatMessageFeedback>,
        private readonly agentChatMessageService: AgentChatMessageService,
    ) {
        super(chatRecordRepository);
    }

    async createConversation(params: {
        agentId: string;
        userId?: string;
        anonymousIdentifier?: string;
        title?: string;
        metadata?: Record<string, any>;
    }): Promise<AgentChatRecord> {
        try {
            const record = this.chatRecordRepository.create({
                agentId: params.agentId,
                userId: params.userId,
                anonymousIdentifier: params.anonymousIdentifier,
                title: this.buildConversationTitle(params.title),
                messageCount: 0,
                totalTokens: 0,
                consumedPower: 0,
                isDeleted: false,
                feedbackStatus: { like: 0, dislike: 0 },
                metadata: params.metadata,
            });
            const savedRecord = await this.chatRecordRepository.save(record);
            await this.incrementAgentUserCountOnFirstConversation(params);
            return savedRecord;
        } catch (error) {
            this.logger.error(`创建对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create agent conversation.");
        }
    }

    private async incrementAgentUserCountOnFirstConversation(params: {
        agentId: string;
        userId?: string;
        anonymousIdentifier?: string;
    }): Promise<void> {
        if (!params.userId && !params.anonymousIdentifier) {
            return;
        }

        const where = params.anonymousIdentifier
            ? {
                  agentId: params.agentId,
                  anonymousIdentifier: params.anonymousIdentifier,
                  isDeleted: false,
              }
            : {
                  agentId: params.agentId,
                  userId: params.userId!,
                  isDeleted: false,
              };

        const count = await this.chatRecordRepository.count({ where });
        if (count !== 1) {
            return;
        }

        await this.agentRepository.increment({ id: params.agentId }, "userCount", 1);
    }

    private buildConversationTitle(title?: string): string {
        const normalized = (title ?? "").replace(/\s+/g, " ").trim();
        if (!normalized) return "新对话";
        return normalized.slice(0, 20);
    }

    async getConversationThread(
        agentId: string,
        userId: string,
        opts?: { limit?: number; cursor?: string },
    ): Promise<AgentChatThreadResult> {
        const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 50);
        const latest = await this.chatRecordRepository.findOne({
            where: { agentId, userId, isDeleted: false },
            order: { updatedAt: "DESC" },
        });
        if (!latest) {
            return {
                sessions: [],
                activeConversationId: null,
                hasMore: false,
                nextCursor: null,
            };
        }

        const qb = this.chatRecordRepository
            .createQueryBuilder("record")
            .where("record.agent_id = :agentId", { agentId })
            .andWhere("record.user_id = :userId", { userId })
            .andWhere("record.is_deleted = false");

        if (opts?.cursor) {
            const cursorRecord = await this.chatRecordRepository.findOne({
                where: { id: opts.cursor, agentId, userId, isDeleted: false },
            });
            if (!cursorRecord) {
                return {
                    sessions: [],
                    activeConversationId: latest.id,
                    hasMore: false,
                    nextCursor: null,
                };
            }
            qb.andWhere("record.updated_at < :cursorUpdatedAt", {
                cursorUpdatedAt: cursorRecord.updatedAt,
            });
        }

        const records = await qb
            .orderBy("record.updated_at", "DESC")
            .addOrderBy("record.id", "DESC")
            .take(limit + 1)
            .getMany();

        const hasMore = records.length > limit;
        const pageRecords = records.slice(0, limit).reverse();
        const sessions = await this.buildSessionsWithFeedback(pageRecords, userId);

        return {
            sessions,
            activeConversationId: latest.id,
            hasMore,
            nextCursor: hasMore && pageRecords.length > 0 ? pageRecords[0].id : null,
        };
    }

    private async buildSessionsWithFeedback(
        records: AgentChatRecord[],
        userId: string,
    ): Promise<AgentChatThreadResult["sessions"]> {
        if (records.length === 0) return [];
        const sessions = await Promise.all(
            records.map(async (record) => {
                const messages = await this.agentChatMessageService.findAll({
                    where: { conversationId: record.id, status: "completed" },
                    order: { createdAt: "ASC" },
                });
                return { conversationId: record.id, messages };
            }),
        );
        const filtered = sessions.filter((s) => s.messages.length > 0);
        if (!filtered.length) return [];

        const conversationIds = filtered.map((s) => s.conversationId);
        const messageIds = filtered.flatMap((s) => s.messages.map((m) => m.id));
        if (!messageIds.length) return filtered;

        const feedbacks = await this.feedbackRepository.find({
            where: {
                conversationId: In(conversationIds),
                messageId: In(messageIds),
                userId,
            },
        });
        if (!feedbacks.length) return filtered;

        const feedbackMap = new Map<string, AgentChatMessageFeedback>();
        for (const fb of feedbacks) {
            if (!feedbackMap.has(fb.messageId)) {
                feedbackMap.set(fb.messageId, fb);
            }
        }

        return filtered.map((session) => ({
            conversationId: session.conversationId,
            messages: session.messages.map((msg) => {
                const fb = feedbackMap.get(msg.id);
                if (!fb) return msg;
                const messageWithFeedback: typeof msg.message & {
                    feedback: {
                        type: "like" | "dislike";
                        dislikeReason?: string;
                        confidenceScore: number;
                    };
                } = {
                    ...(msg.message as any),
                    feedback: {
                        type: fb.type,
                        dislikeReason: fb.dislikeReason ?? undefined,
                        confidenceScore: Number(fb.confidenceScore),
                    },
                };
                return {
                    ...msg,
                    message: messageWithFeedback,
                };
            }),
        }));
    }

    async getConversation(conversationId: string): Promise<AgentChatRecord | null> {
        return this.chatRecordRepository.findOne({
            where: { id: conversationId, isDeleted: false },
        });
    }

    async findConversationByCozeConversationId(params: {
        agentId: string;
        userId?: string;
        cozeConversationId: string;
    }): Promise<AgentChatRecord | null> {
        const qb = this.chatRecordRepository
            .createQueryBuilder("record")
            .where("record.agent_id = :agentId", { agentId: params.agentId })
            .andWhere("record.is_deleted = false")
            .andWhere("record.metadata ->> 'cozeConversationId' = :cozeConversationId", {
                cozeConversationId: params.cozeConversationId,
            })
            .orderBy("record.updated_at", "DESC")
            .limit(1);

        if (params.userId) {
            qb.andWhere("record.user_id = :userId", { userId: params.userId });
        }

        return qb.getOne();
    }

    /**
     * 通过 Dify 远端 conversation_id 查找本地对话记录。
     */
    async findConversationByDifyConversationId(params: {
        agentId: string;
        userId?: string;
        difyConversationId: string;
    }): Promise<AgentChatRecord | null> {
        const qb = this.chatRecordRepository
            .createQueryBuilder("record")
            .where("record.agent_id = :agentId", { agentId: params.agentId })
            .andWhere("record.is_deleted = false")
            .andWhere("record.metadata ->> 'difyConversationId' = :difyConversationId", {
                difyConversationId: params.difyConversationId,
            })
            .orderBy("record.updated_at", "DESC")
            .limit(1);

        if (params.userId) {
            qb.andWhere("record.user_id = :userId", { userId: params.userId });
        }

        return qb.getOne();
    }

    async updateTitle(conversationId: string, title: string): Promise<void> {
        await this.chatRecordRepository.update(conversationId, { title });
    }

    /**
     * 更新对话扩展元数据。
     */
    async updateMetadata(
        conversationId: string,
        metadata: Record<string, any> | undefined,
    ): Promise<void> {
        const record = await this.chatRecordRepository.findOne({
            where: { id: conversationId, isDeleted: false },
        });
        if (!record) return;

        await this.chatRecordRepository.update(conversationId, {
            metadata: {
                ...(record.metadata ?? {}),
                ...(metadata ?? {}),
            },
        });
    }

    async updateStats(conversationId: string): Promise<void> {
        try {
            const stats = await this.agentChatMessageService.getMessageStats(conversationId);
            await this.chatRecordRepository.update(conversationId, {
                messageCount: stats.messageCount,
                totalTokens: stats.totalTokens,
                consumedPower: stats.totalPower,
            });
        } catch (error) {
            this.logger.error(`更新对话统计失败: ${error.message}`, error.stack);
        }
    }

    async updateFeedbackStatus(
        conversationId: string,
        type: "like" | "dislike",
        delta: number,
    ): Promise<void> {
        const record = await this.chatRecordRepository.findOne({
            where: { id: conversationId },
        });
        if (!record) return;
        const current = record.feedbackStatus ?? { like: 0, dislike: 0 };
        const next =
            type === "like"
                ? { ...current, like: Math.max(0, current.like + delta) }
                : { ...current, dislike: Math.max(0, current.dislike + delta) };
        await this.chatRecordRepository.update(conversationId, { feedbackStatus: next });
    }

    async findUserConversations(
        agentId: string,
        userId: string,
        limit = 50,
    ): Promise<AgentChatRecord[]> {
        return this.chatRecordRepository.find({
            where: { agentId, userId, isDeleted: false },
            order: { updatedAt: "DESC" },
            take: limit,
        });
    }

    async listUserConversations(
        agentId: string,
        userId: string | null,
        query: ListAgentConversationsDto,
        anonymousIdentifier?: string,
    ): Promise<PaginationResult<AgentChatRecordWithUser>> {
        const qb = this.chatRecordRepository
            .createQueryBuilder("r")
            .where("r.agentId = :agentId", { agentId })
            .andWhere("r.isDeleted = :isDeleted", { isDeleted: false });

        if (anonymousIdentifier) {
            qb.andWhere("r.anonymousIdentifier = :anonymousIdentifier", {
                anonymousIdentifier,
            });
        } else if (userId) {
            qb.andWhere("r.userId = :userId", { userId });
            qb.andWhere("r.anonymousIdentifier IS NULL");
        } else {
            qb.andWhere("r.userId IS NULL");
        }

        if (query.includeDebug !== true) {
            qb.andWhere("(r.metadata ->> 'isDebug') IS DISTINCT FROM 'true'");
        }

        if (query.keyword?.trim()) {
            const k = `%${query.keyword.trim()}%`;
            qb.andWhere("(r.title ILIKE :keyword OR r.id::text ILIKE :keyword)", { keyword: k });
        }
        const orderBy = query.sortBy === "updatedAt" ? "r.updatedAt" : "r.createdAt";
        qb.orderBy(orderBy, "DESC");
        const result = await this.paginateQueryBuilder(qb, query);
        const userIds = [
            ...new Set(
                (result.items as AgentChatRecord[])
                    .map((r) => r.userId)
                    .filter(Boolean) as string[],
            ),
        ];
        if (userIds.length === 0) {
            return result as PaginationResult<AgentChatRecordWithUser>;
        }
        const users = await this.userRepository.find({
            where: { id: In(userIds) },
            select: ["id", "username", "nickname", "avatar"],
        });
        const userMap = new Map(
            users.map((u) => [
                u.id,
                {
                    name: u.nickname || u.username || "",
                    avatar: u.avatar || "",
                },
            ]),
        );
        const items: AgentChatRecordWithUser[] = (result.items as AgentChatRecord[]).map((r) => ({
            ...r,
            userName: r.userId ? userMap.get(r.userId)?.name : undefined,
            userAvatar: r.userId ? userMap.get(r.userId)?.avatar : undefined,
        }));
        return { ...result, items };
    }

    async softDelete(conversationId: string, userId: string | null): Promise<void> {
        const whereCondition: any = { id: conversationId, isDeleted: false };
        if (userId) {
            whereCondition.userId = userId;
        } else {
            whereCondition.userId = null;
        }

        const result = await this.chatRecordRepository.update(whereCondition, { isDeleted: true });
        if (result.affected === 0) {
            throw HttpErrorFactory.notFound("对话不存在或无权限删除");
        }
    }

    async getStats(
        agentId: string,
        userId: string | null,
    ): Promise<{ conversationCount: number; messageCount: number }> {
        const qb = this.chatRecordRepository
            .createQueryBuilder("r")
            .select("COUNT(r.id)", "conversationCount")
            .addSelect("COALESCE(SUM(r.messageCount), 0)", "messageCount")
            .where("r.agentId = :agentId", { agentId })
            .andWhere("r.isDeleted = :isDeleted", { isDeleted: false });

        if (userId) {
            qb.andWhere("r.userId = :userId", { userId });
        } else {
            qb.andWhere("r.userId IS NULL");
        }

        const row = await qb.getRawOne<{ conversationCount: string; messageCount: string }>();
        return {
            conversationCount: row ? parseInt(row.conversationCount, 10) || 0 : 0,
            messageCount: row ? parseInt(row.messageCount, 10) || 0 : 0,
        };
    }

    async deleteAllForUser(agentId: string, userId: string | null): Promise<{ deleted: number }> {
        const whereCondition: any = { agentId, isDeleted: false };
        if (userId) {
            whereCondition.userId = userId;
        } else {
            whereCondition.userId = null;
        }
        const result = await this.chatRecordRepository.update(whereCondition, { isDeleted: true });
        return { deleted: result.affected ?? 0 };
    }
}
