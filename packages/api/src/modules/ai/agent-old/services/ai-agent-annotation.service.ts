import { BaseService } from "@buildingai/base";
import type { UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AgentAnnotation, AnnotationReviewStatus } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { DataSource, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable, Logger } from "@nestjs/common";

import {
    CreateAgentAnnotationDto,
    QueryAgentAnnotationDto,
    ReviewAnnotationDto,
    UpdateAgentAnnotationDto,
} from "../dto/annotation";
import { UserUtil } from "../utils/user.util";

export interface AnnotationMatchResult {
    matched: boolean;
    annotation?: AgentAnnotation;
    similarity?: number;
}

/**
 * AI Agent Annotation Service
 *
 * Handles annotation management operations including creation, updating, deletion,
 * review, and intelligent matching for AI agents. Supports both anonymous and
 * registered users with different approval workflows.
 */
@Injectable()
export class AiAgentAnnotationService extends BaseService<AgentAnnotation> {
    protected readonly logger = new Logger(AiAgentAnnotationService.name);

    constructor(
        @InjectRepository(AgentAnnotation)
        private readonly annotationRepository: Repository<AgentAnnotation>,
        @InjectRepository(AgentChatMessage)
        private readonly chatMessageRepository: Repository<AgentChatMessage>,
        protected readonly dataSource: DataSource,
    ) {
        super(annotationRepository);
    }

    /**
     * Check if user is anonymous
     *
     * Determines whether a user is anonymous based on various patterns
     * including fixed anonymous identifiers, access tokens, and UUID patterns.
     */
    private isAnonymousUser(user: UserPlayground): boolean {
        return UserUtil.isAnonymousUser(user);
    }

    /**
     * Create Annotation
     *
     * Creates a new annotation for an AI agent with automatic review status assignment
     * based on user type. Anonymous users' annotations require manual review, while
     * registered users' annotations are automatically approved.
     */
    async createAnnotation(
        agentId: string,
        dto: CreateAgentAnnotationDto,
        user: UserPlayground,
    ): Promise<AgentAnnotation> {
        return await this.dataSource.transaction(async (manager) => {
            // 检查是否已存在相同的问题（使用事务管理器）
            const existing = await manager.findOne(AgentAnnotation, {
                where: {
                    agentId,
                    question: dto.question.trim(),
                    enabled: true,
                    reviewStatus: AnnotationReviewStatus.APPROVED,
                },
            });

            if (existing) {
                throw HttpErrorFactory.badRequest("该问题已存在标注");
            }

            // 判断用户类型，设置不同的初始审核状态
            const isAnonymous = this.isAnonymousUser(user);
            const initialReviewStatus = isAnonymous
                ? AnnotationReviewStatus.PENDING
                : AnnotationReviewStatus.APPROVED;

            const annotation = manager.create(AgentAnnotation, {
                agentId,
                question: dto.question.trim(),
                answer: dto.answer.trim(),
                enabled: dto.enabled ?? true,
                reviewStatus: initialReviewStatus,
                createdBy: isAnonymous ? null : user.id,
                anonymousIdentifier: isAnonymous ? user.id : null,
            });

            const saved = await manager.save(AgentAnnotation, annotation);

            this.logger.log(
                `[标注] 创建成功: ${dto.question} - 状态: ${initialReviewStatus} - 用户类型: ${isAnonymous ? "匿名" : "注册"}`,
            );

            // 如果有 messageId，更新对话消息的metadata
            if (dto.messageId) {
                await this.updateMessageAnnotation(dto.messageId, saved.id, manager);
            }

            return saved;
        });
    }

    /**
     * Update Annotation
     *
     * Updates an existing annotation with automatic review status management.
     * Anonymous users' edits require re-review, while registered users' edits
     * maintain or improve approval status.
     */
    async updateAnnotation(
        id: string,
        dto: UpdateAgentAnnotationDto,
        user: UserPlayground,
    ): Promise<AgentAnnotation> {
        const annotation = await this.annotationRepository.findOne({
            where: { id },
        });

        if (!annotation) {
            throw HttpErrorFactory.notFound("标注不存在");
        }

        // 判断用户类型，设置不同的审核状态
        const isAnonymous = this.isAnonymousUser(user);

        // 如果是匿名用户编辑，需要重新审核
        if (isAnonymous) {
            annotation.reviewStatus = AnnotationReviewStatus.PENDING;
            annotation.reviewedBy = null;
            annotation.reviewedAt = null;
        }
        // 注册用户编辑：如果当前是已通过状态，保持已通过；如果是未审核状态，保持未审核
        else if (annotation.reviewStatus === AnnotationReviewStatus.REJECTED) {
            // 如果当前是已拒绝状态，注册用户编辑后设为已通过
            annotation.reviewStatus = AnnotationReviewStatus.APPROVED;
        }

        // 更新字段
        if (dto.question !== undefined) {
            annotation.question = dto.question.trim();
        }
        if (dto.answer !== undefined) {
            annotation.answer = dto.answer.trim();
        }
        if (dto.enabled !== undefined) {
            annotation.enabled = dto.enabled;
        }

        const saved = await this.annotationRepository.save(annotation);

        this.logger.log(
            `[标注] 更新成功: ${id} - 状态: ${annotation.reviewStatus} - 用户类型: ${isAnonymous ? "匿名" : "注册"}`,
        );

        // 如果有 messageId，更新对话消息的metadata
        if (dto.messageId) {
            await this.updateMessageAnnotation(dto.messageId, saved.id);
        }

        return saved;
    }

    /**
     * Delete Annotation
     *
     * Permanently deletes an annotation and removes all associated references
     * from chat messages. This operation is irreversible and uses transactions
     * to ensure data consistency.
     */
    async deleteAnnotation(id: string): Promise<void> {
        // 先获取标注信息，检查是否存在
        const annotation = await this.annotationRepository.findOne({
            where: { id },
        });
        if (!annotation) {
            throw HttpErrorFactory.notFound("标注不存在");
        }

        // 清理所有关联的对话消息的标注metadata
        await this.removeAnnotationFromMessages(id);

        // 删除标注
        await this.annotationRepository.delete(id);

        this.logger.log(`[标注] 删除成功: ${id}`);
    }

    /**
     * Review Annotation
     *
     * Reviews and approves or rejects pending annotations. Only annotations
     * with pending status can be reviewed. Updates reviewer information and
     * review timestamp.
     */
    async reviewAnnotation(
        id: string,
        dto: ReviewAnnotationDto,
        user: UserPlayground,
    ): Promise<AgentAnnotation> {
        const annotation = await this.annotationRepository.findOne({
            where: { id },
            relations: ["user"],
        });

        if (!annotation) {
            throw HttpErrorFactory.notFound("标注不存在");
        }

        // 只有待审核状态的标注可以被审核
        if (annotation.reviewStatus !== AnnotationReviewStatus.PENDING) {
            throw HttpErrorFactory.badRequest("只有待审核状态的标注可以被审核");
        }

        // 更新审核信息
        annotation.reviewStatus = dto.reviewStatus;
        annotation.reviewedBy = user.id;
        annotation.reviewedAt = new Date();

        const saved = await this.annotationRepository.save(annotation);

        this.logger.log(
            `[标注审核] 标注ID: ${id} - 状态: ${dto.reviewStatus} - 审核人: ${user.username || user.id}`,
        );

        return saved;
    }

    /**
     * Get Agent Annotations
     *
     * Retrieves a paginated list of annotations for a specific agent with
     * advanced filtering options including keyword search, category filtering,
     * enabled status, and review status.
     */
    async getAgentAnnotations(
        agentId: string,
        query?: QueryAgentAnnotationDto,
    ): Promise<{
        items: AgentAnnotation[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const queryBuilder = this.annotationRepository.createQueryBuilder("annotation");

        // 关联用户信息
        queryBuilder.leftJoinAndSelect("annotation.user", "user");
        queryBuilder.leftJoinAndSelect("annotation.reviewer", "reviewer");

        // 基础条件
        queryBuilder.where("annotation.agentId = :agentId", { agentId });

        // 关键词搜索
        if (query?.keyword) {
            queryBuilder.andWhere(
                "(annotation.question ILIKE :keyword OR annotation.answer ILIKE :keyword)",
                { keyword: `%${query.keyword}%` },
            );
        }

        // 启用状态过滤
        if (query?.enabled !== undefined) {
            queryBuilder.andWhere("annotation.enabled = :enabled", {
                enabled: query.enabled,
            });
        }

        // 审核状态过滤
        if (query?.reviewStatus) {
            queryBuilder.andWhere("annotation.reviewStatus = :reviewStatus", {
                reviewStatus: query.reviewStatus,
            });
        }

        // 排序
        queryBuilder.orderBy("annotation.createdAt", "DESC");

        const result = await this.paginateQueryBuilder(queryBuilder, query);

        return {
            items: result.items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        };
    }

    /**
     * Match User Question
     *
     * Intelligently matches user questions against agent annotations using
     * exact matching and fuzzy similarity algorithms. Limits query results
     * to prevent performance issues.
     */
    async matchUserQuestion(agentId: string, userQuestion: string): Promise<AnnotationMatchResult> {
        const cleanQuestion = userQuestion.trim().toLowerCase();

        // 获取该智能体的所有启用且已审核通过的标注，限制数量避免性能问题
        const annotations = await this.annotationRepository.find({
            where: {
                agentId,
                enabled: true,
                reviewStatus: AnnotationReviewStatus.APPROVED,
            },
            relations: ["user"],
            order: { hitCount: "DESC" },
            take: 1000, // 限制查询数量
        });

        if (annotations.length === 0) {
            return { matched: false };
        }

        let bestMatch: AnnotationMatchResult = { matched: false };
        let bestSimilarity = 0;

        // 1. 精确匹配（忽略大小写和空格）
        for (const annotation of annotations) {
            const cleanAnnotationQuestion = annotation.question.trim().toLowerCase();
            if (cleanQuestion === cleanAnnotationQuestion) {
                await this.incrementHitCount(annotation.id);
                this.logger.log(
                    `[标注匹配] 精确匹配: "${userQuestion}" -> "${annotation.question}"`,
                );
                bestMatch = { matched: true, annotation, similarity: 1.0 };
                break; // 精确匹配优先级最高，直接返回
            }
        }

        // 如果没有精确匹配，进行包含匹配
        if (!bestMatch.matched) {
            for (const annotation of annotations) {
                const cleanAnnotationQuestion = annotation.question.trim().toLowerCase();

                // 计算更精确的相似度
                const similarity = this.calculateSimilarity(cleanQuestion, cleanAnnotationQuestion);

                if (similarity > 0.6 && similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = { matched: true, annotation, similarity };
                }
            }

            if (bestMatch.matched && bestMatch.annotation) {
                await this.incrementHitCount(bestMatch.annotation.id);
                this.logger.log(
                    `[标注匹配] 包含匹配: "${userQuestion}" -> "${bestMatch.annotation.question}", 相似度: ${bestMatch.similarity?.toFixed(2)}`,
                );
            }
        }

        if (!bestMatch.matched) {
            this.logger.debug(`[标注匹配] 无匹配结果: "${userQuestion}"`);
        }

        return bestMatch;
    }

    /**
     * Calculate similarity between two strings
     *
     * Uses a combination of substring inclusion and Levenshtein distance
     * to calculate similarity score between two strings.
     */
    private calculateSimilarity(str1: string, str2: string): number {
        // 1. 完全包含关系
        if (str1.includes(str2) || str2.includes(str1)) {
            return Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
        }

        // 2. 编辑距离相似度
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
    }

    /**
     * Calculate Levenshtein distance between two strings
     *
     * Implements the Levenshtein distance algorithm to measure the minimum
     * number of single-character edits required to change one string into another.
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator,
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Increment hit count for annotation
     *
     * Increases the hit count of an annotation when it matches a user question.
     * This is used for tracking annotation popularity and usage statistics.
     */
    private async incrementHitCount(annotationId: string): Promise<void> {
        await this.annotationRepository.increment({ id: annotationId }, "hitCount", 1);
    }

    /**
     * Get Annotation By ID
     *
     * Retrieves a specific annotation by its ID with error handling
     * for non-existent annotations.
     */
    async getAnnotationById(id: string): Promise<AgentAnnotation> {
        const annotation = await this.annotationRepository.findOne({
            where: { id },
        });
        if (!annotation) {
            throw HttpErrorFactory.notFound("标注不存在");
        }
        return annotation;
    }

    /**
     * Update message annotation metadata
     *
     * Updates the metadata of a chat message to include annotation information
     * when an annotation is created or updated from a specific message.
     */
    private async updateMessageAnnotation(
        messageId: string,
        annotationId: string,
        manager?: any,
    ): Promise<void> {
        try {
            const repository = manager || this.chatMessageRepository;
            const message = await repository.findOne(AgentChatMessage, {
                where: { id: messageId },
            });

            if (!message) {
                this.logger.warn(`[标注] 消息不存在: ${messageId}`);
                return;
            }

            // 获取标注信息
            const annotationRepo = manager || this.annotationRepository;
            const annotation = await annotationRepo.findOne(AgentAnnotation, {
                where: { id: annotationId },
                relations: ["user"],
            });

            if (!annotation) {
                this.logger.warn(`[标注] 标注不存在: ${annotationId}`);
                return;
            }

            // 更新消息的metadata
            const metadata = message.metadata || {};
            metadata.annotations = {
                annotationId: annotation.id,
                question: annotation.question,
                similarity: 1.0, // 手动标注的相似度为1
                createdBy: annotation.user?.nickname || annotation.user?.username || "未知用户",
            };

            await repository.update(AgentChatMessage, { id: messageId }, { metadata });

            this.logger.log(
                `[标注] 更新消息标注成功: messageId=${messageId}, annotationId=${annotationId}`,
            );
        } catch (error) {
            this.logger.error(`[标注] 更新消息标注失败: ${error.message}`, error.stack);
        }
    }

    /**
     * Remove annotation from messages
     *
     * Removes annotation references from all chat messages that contain
     * the specified annotation in their metadata. Used when deleting annotations.
     */
    private async removeAnnotationFromMessages(annotationId: string, manager?: any): Promise<void> {
        try {
            const repository = manager || this.chatMessageRepository;

            // 查询所有可能包含该标注的消息
            const queryBuilder = repository.createQueryBuilder("message");
            queryBuilder.where("message.metadata->'annotations'->>'annotationId' = :annotationId", {
                annotationId,
            });

            const messages = await queryBuilder.getMany();

            for (const message of messages) {
                const metadata = message.metadata || {};
                if (
                    metadata.annotations &&
                    (metadata.annotations as { annotationId: string }).annotationId === annotationId
                ) {
                    delete metadata.annotations;
                    await repository.update(AgentChatMessage, { id: message.id }, { metadata });
                    this.logger.log(
                        `[标注] 清理消息标注: messageId=${message.id}, annotationId=${annotationId}`,
                    );
                }
            }

            this.logger.log(`[标注] 清理完成，共处理 ${messages.length} 条消息`);
        } catch (error) {
            this.logger.error(`[标注] 清理消息标注失败: ${error.message}`, error.stack);
        }
    }
}
