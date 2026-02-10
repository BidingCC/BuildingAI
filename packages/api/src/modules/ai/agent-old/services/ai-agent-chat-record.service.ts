import { BaseService } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentChatRecord } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import { BatchDeleteChatRecordDto, QueryAgentChatRecordDto } from "../dto/agent";
import { UserUtil } from "../utils/user.util";
import { AiAgentChatsMessageService } from "./ai-agent-chat-message.service";

@Injectable()
export class AiAgentChatRecordService extends BaseService<AgentChatRecord> {
    protected readonly logger = new Logger(AiAgentChatRecordService.name);

    constructor(
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        private readonly AiAgentChatsMessageService: AiAgentChatsMessageService,
    ) {
        super(chatRecordRepository);
    }

    async getChatRecordList(dto: QueryAgentChatRecordDto) {
        const queryBuilder = this.chatRecordRepository.createQueryBuilder("record");

        queryBuilder.leftJoin("record.user", "user");
        queryBuilder.addSelect([
            "user.username",
            "user.nickname",
            "user.phone",
            "user.avatar",
            "user.email",
        ]);

        queryBuilder.where("record.agentId = :agentId", {
            agentId: dto.agentId,
        });
        queryBuilder.andWhere("record.isDeleted = :isDeleted", {
            isDeleted: false,
        });

        if (dto.keyword) {
            queryBuilder.andWhere(
                "(record.title ILIKE :keyword OR record.summary ILIKE :keyword)",
                { keyword: `%${dto.keyword}%` },
            );
        }

        queryBuilder.orderBy("record.updatedAt", "DESC");

        return this.paginateQueryBuilder(queryBuilder, dto);
    }

    async getChatRecordDetail(id: string, user: UserPlayground): Promise<AgentChatRecord> {
        const whereConditions = this.buildUserWhereConditions(user, {
            id,
            isDeleted: false,
        });
        const record = await this.chatRecordRepository.findOne({
            where: whereConditions,
            relations: ["agent"],
        });

        if (!record) {
            throw HttpErrorFactory.notFound("对话记录不存在");
        }

        return record;
    }

    async batchDeleteChatRecords(
        dto: BatchDeleteChatRecordDto,
        user: UserPlayground,
    ): Promise<{ deletedCount: number }> {
        const { recordIds } = dto;

        if (!recordIds?.length) {
            throw HttpErrorFactory.badRequest("请选择要删除的对话记录");
        }

        const records = await this.findUserRecords(user, {
            id: In(recordIds),
            isDeleted: false,
        });

        if (!records.length) {
            throw HttpErrorFactory.badRequest("没有找到可删除的对话记录");
        }

        const result = await this.softDeleteRecords(
            records.map((r) => r.id),
            user,
        );
        this.logger.log(`[+] 批量删除对话记录成功: ${records.length} 条记录`);

        return { deletedCount: result.affected || 0 };
    }

    async deleteChatRecord(id: string, user: UserPlayground): Promise<void> {
        const records = await this.findUserRecords(user, {
            id,
            isDeleted: false,
        });

        if (!records.length) {
            throw HttpErrorFactory.notFound("对话记录不存在或已被删除");
        }

        await this.softDeleteRecords([id], user);
        this.logger.log(`[+] 删除对话记录成功: ${id}`);
    }

    async createChatRecord(
        agentId: string,
        userId?: string,
        title?: string,
        anonymousIdentifier?: string,
    ): Promise<AgentChatRecord> {
        const recordData = {
            agentId,
            userId: userId || null,
            anonymousIdentifier: anonymousIdentifier || null,
            title: title || "新对话",
            messageCount: 0,
            totalTokens: 0,
            isDeleted: false,
        };

        const result = await this.create(recordData);
        const userInfo = userId ? `用户:${userId}` : `匿名:${anonymousIdentifier}`;
        this.logger.log(`[+] 对话记录创建成功: ${result.id} - ${userInfo}`);

        return result as AgentChatRecord;
    }

    async updateChatRecordStats(
        id: string,
        messageCount: number,
        totalTokens: number,
    ): Promise<void> {
        await this.chatRecordRepository.update(id, {
            messageCount,
            totalTokens,
            updatedAt: new Date(),
        });
        this.logger.log(`[+] 对话记录统计更新成功: ${id}`);
    }

    async updateMetadata(id: string, metadata: Record<string, any>): Promise<void> {
        await this.chatRecordRepository.update(id, {
            metadata,
            updatedAt: new Date(),
        });
        this.logger.log(`[+] 对话记录 metadata 更新成功: ${id}`);
    }

    async incrementConsumedPower(id: string, amount: number): Promise<void> {
        if (!amount || amount <= 0) return;
        await this.chatRecordRepository.increment({ id }, "consumedPower", amount);
        await this.chatRecordRepository.update(id, { updatedAt: new Date() });
        this.logger.log(`[+] 对话记录消耗积分增加: ${id} +${amount}`);
    }

    async getChatsMessages(conversationId: string, paginationDto: PaginationDto) {
        return await this.AiAgentChatsMessageService.getConversationMessages(
            conversationId,
            paginationDto,
        );
    }

    // ==================== 辅助方法 ====================
    private buildUserWhereConditions(user: UserPlayground, baseCondition: any = {}) {
        const whereConditions = [];
        const isAnonymous = UserUtil.isAnonymousUser(user);

        if (isAnonymous) {
            whereConditions.push({
                ...baseCondition,
                anonymousIdentifier: user.id,
            });
        } else {
            whereConditions.push({
                ...baseCondition,
                userId: user.id,
            });

            // 支持跨状态访问（登录用户访问之前的匿名记录）
            if ((user as any).anonymousIdentifier) {
                whereConditions.push({
                    ...baseCondition,
                    anonymousIdentifier: (user as any).anonymousIdentifier,
                });
            }
        }

        return whereConditions;
    }

    private async findUserRecords(user: UserPlayground, additionalConditions: any = {}) {
        const whereConditions = this.buildUserWhereConditions(user, additionalConditions);
        return await this.chatRecordRepository.find({ where: whereConditions });
    }

    private async softDeleteRecords(recordIds: string[], user: UserPlayground) {
        const isAnonymous = UserUtil.isAnonymousUser(user);
        const whereCondition = isAnonymous
            ? { id: In(recordIds), anonymousIdentifier: user.id }
            : { id: In(recordIds), userId: user.id };

        return await this.chatRecordRepository.update(whereCondition, {
            isDeleted: true,
        });
    }
}
