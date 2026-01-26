import { BaseService } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel } from "@buildingai/db/entities";
import { AiProvider } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentAnnotation } from "@buildingai/db/entities";
import { AgentChatMessage } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { Tag } from "@buildingai/db/entities";
import { User } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { HttpException, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

import {
    CreateAgentDto,
    PublishAgentDto,
    QueryAgentDto,
    QueryAgentStatisticsDto,
    UpdateAgentConfigDto,
} from "../dto/agent";
import { ThirdPartyIntegrationHandler } from "../handlers/third-party-integration.handler";

@Injectable()
export class AiAgentService extends BaseService<Agent> {
    private readonly defaultAvatar = "/static/images/agent.png";

    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AgentChatMessage)
        private readonly chatMessageRepository: Repository<AgentChatMessage>,
        @InjectRepository(AgentAnnotation)
        private readonly annotationRepository: Repository<AgentAnnotation>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
        @InjectRepository(AiModel)
        private readonly aiModelRepository: Repository<AiModel>,
        @InjectRepository(AiProvider)
        private readonly aiProviderRepository: Repository<AiProvider>,
        private readonly thirdPartyIntegrationHandler: ThirdPartyIntegrationHandler,
    ) {
        super(agentRepository);
    }

    /**
     * 同步智能体标签
     * @param agentId 智能体ID
     * @param newTagIds 新的标签ID数组
     */
    private async syncAgentTags(agentId: string, newTagIds: string[] = []): Promise<void> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) return;

        const currentTagIds = ((agent as Agent & { tags?: Tag[] }).tags || []).map((tag) => tag.id);
        const addedTagIds = newTagIds.filter((id) => !currentTagIds.includes(id));
        const removedTagIds = currentTagIds.filter((id) => !newTagIds.includes(id));

        if (addedTagIds.length > 0) {
            await this.addAgentTags(agentId, addedTagIds);
        }
        if (removedTagIds.length > 0) {
            await this.removeAgentTags(agentId, removedTagIds);
        }
    }

    // 创建新智能体
    async createAgent(dto: CreateAgentDto, user: UserPlayground): Promise<Agent> {
        const {
            name,
            description,
            avatar,
            createMode = "direct",
            thirdPartyIntegration = {},
            tagIds,
        } = dto;

        await this.checkNameUniqueness(name);

        return this.withErrorHandling(async () => {
            const agent = await this.create({
                name,
                description,
                avatar: avatar || this.defaultAvatar,
                showContext: true,
                createMode,
                thirdPartyIntegration: thirdPartyIntegration || {},
                showReference: true,
                enableFeedback: false,
                enableWebSearch: false,
                userCount: 0,
                isPublic: false,
                createBy: user.id,
            });

            if (tagIds && tagIds.length > 0) {
                await this.syncAgentTags(agent.id, tagIds);
            }

            this.logger.log(`[+] 智能体创建成功: ${agent.id} - ${name}`);
            return this.getAgentDetail(agent.id);
        }, "智能体创建失败");
    }

    /**
     * 从模板或DSL导入创建智能体
     * 支持完整的智能体配置导入，包括角色设定、开场白、快捷指令等
     *
     * @param dto 导入的智能体配置数据
     * @param user 当前用户信息
     * @returns 创建的智能体
     */
    async createAgentFromTemplate(dto: any, user: UserPlayground): Promise<Agent> {
        const {
            name,
            description,
            avatar,
            chatAvatar,
            rolePrompt,
            openingStatement,
            openingQuestions,
            showContext,
            showReference,
            enableFeedback,
            enableWebSearch,
            createMode = "direct",
            thirdPartyIntegration = {},
            quickCommands,
            autoQuestions,
            formFields,
            billingConfig,
            modelConfig,
            tagIds,
        } = dto;

        await this.checkNameUniqueness(name);

        return this.withErrorHandling(async () => {
            const agent = await this.create({
                name,
                description,
                avatar: avatar || this.defaultAvatar,
                chatAvatar: chatAvatar || null,
                rolePrompt: rolePrompt || null,
                openingStatement: openingStatement || null,
                openingQuestions: openingQuestions || [],
                showContext: showContext ?? true,
                showReference: showReference ?? true,
                enableFeedback: enableFeedback ?? false,
                enableWebSearch: enableWebSearch ?? false,
                createMode,
                thirdPartyIntegration: thirdPartyIntegration || {},
                quickCommands: quickCommands || [],
                autoQuestions: autoQuestions || [],
                formFields: formFields || [],
                billingConfig: billingConfig || null,
                modelConfig: modelConfig || null,
                userCount: 0,
                isPublic: false,
                createBy: user.id,
            });

            if (tagIds && tagIds.length > 0) {
                await this.syncAgentTags(agent.id, tagIds);
            }

            this.logger.log(`[+] 智能体导入成功: ${agent.id} - ${name}`);
            return this.getAgentDetail(agent.id);
        }, "智能体导入失败");
    }

    // 获取智能体详情
    async getAgentDetail(id: string): Promise<Agent> {
        const agent = await this.agentRepository
            .createQueryBuilder("agent")
            .leftJoin("agent.tags", "tag")
            .addSelect(["tag.id", "tag.name", "tag.type", "tag.createdAt", "tag.updatedAt"])
            .where("agent.id = :id", { id })
            .getOne();

        if (!agent) {
            throw HttpErrorFactory.notFound("智能体不存在");
        }

        return agent as Agent;
    }

    // 更新智能体配置
    async updateAgentConfig(id: string, dto: UpdateAgentConfigDto): Promise<Agent> {
        const agent = await this.getAgentDetail(id);

        if (dto.name && dto.name !== agent.name) {
            await this.checkNameUniqueness(dto.name);
        }

        return this.withErrorHandling(async () => {
            const { tagIds, ...updateData } = dto;
            let finalUpdateData: Record<string, any> = {
                ...updateData,
                avatar: updateData.avatar || this.defaultAvatar,
            };

            if (finalUpdateData.billingConfig && finalUpdateData.billingConfig.price < 0) {
                throw HttpErrorFactory.business("积分消耗不能小于 0");
            }

            // 如果是 Dify 智能体且配置了第三方集成，自动获取应用参数
            const createMode = dto.createMode || agent.createMode;
            const thirdPartyConfig = dto.thirdPartyIntegration || agent.thirdPartyIntegration;

            this.logger.log(
                `[Dify] Checking config: createMode=${createMode}, hasApiKey=${!!thirdPartyConfig?.apiKey}, hasBaseURL=${!!thirdPartyConfig?.baseURL}`,
            );

            if (createMode === "dify" && thirdPartyConfig?.apiKey && thirdPartyConfig?.baseURL) {
                try {
                    const difyParams = await this.thirdPartyIntegrationHandler.fetchDifyParameters({
                        apiKey: thirdPartyConfig.apiKey,
                        baseURL: thirdPartyConfig.baseURL,
                    });

                    // 从 Dify 获取的数据直接更新（覆盖本地配置）
                    if (difyParams.openingStatement) {
                        finalUpdateData.openingStatement = difyParams.openingStatement;
                    }
                    if (difyParams.openingQuestions?.length) {
                        finalUpdateData.openingQuestions = difyParams.openingQuestions;
                    }
                    // 同步自动追问配置（Dify 的 suggested_questions_after_answer 对应本项目的 autoQuestions）
                    if (difyParams.autoQuestionsEnabled !== undefined) {
                        finalUpdateData.autoQuestions = {
                            enabled: difyParams.autoQuestionsEnabled,
                            customRuleEnabled: false,
                            customRule: "",
                        };
                    }

                    this.logger.log(
                        `[Dify] Auto-synced parameters for agent ${id}: openingStatement=${!!difyParams.openingStatement}, openingQuestions=${difyParams.openingQuestions?.length || 0}, autoQuestionsEnabled=${difyParams.autoQuestionsEnabled}`,
                    );
                } catch (error) {
                    // 获取 Dify 参数失败不应阻止配置更新
                    this.logger.warn(
                        `[Dify] Failed to fetch parameters for agent ${id}: ${error.message}`,
                    );

                    throw error;
                }
            }

            // Coze 平台：自动获取 Bot 参数
            if (
                createMode === "coze" &&
                thirdPartyConfig?.apiKey &&
                thirdPartyConfig?.baseURL &&
                thirdPartyConfig?.appId
            ) {
                try {
                    const cozeParams = await this.thirdPartyIntegrationHandler.fetchCozeParameters({
                        apiKey: thirdPartyConfig.apiKey,
                        baseURL: thirdPartyConfig.baseURL,
                        botId: thirdPartyConfig.appId,
                    });

                    // 从 Coze 获取的数据直接更新（覆盖本地配置）
                    if (cozeParams.openingStatement) {
                        finalUpdateData.openingStatement = cozeParams.openingStatement;
                    }
                    if (cozeParams.openingQuestions?.length) {
                        finalUpdateData.openingQuestions = cozeParams.openingQuestions;
                    }

                    this.logger.log(
                        `[Coze] Auto-synced parameters for agent ${id}: openingStatement=${!!cozeParams.openingStatement}, openingQuestions=${cozeParams.openingQuestions?.length || 0}`,
                    );
                } catch (error) {
                    // 获取 Coze 参数失败，向前端抛出错误
                    this.logger.error(
                        `[Coze] Failed to fetch parameters for agent ${id}: ${error.message}`,
                    );
                    throw error;
                }
            }

            this.logger.log(
                `[Dify] finalUpdateData keys: ${Object.keys(finalUpdateData).join(", ")}`,
            );
            this.logger.log(
                `[Dify] finalUpdateData.openingStatement: ${finalUpdateData.openingStatement?.substring(0, 50) || "none"}`,
            );
            this.logger.log(
                `[Dify] finalUpdateData.openingQuestions: ${JSON.stringify(finalUpdateData.openingQuestions)}`,
            );

            await this.updateById(id, finalUpdateData);

            if (tagIds !== undefined) {
                await this.syncAgentTags(id, tagIds);
            }

            this.logger.log(`[+] 智能体配置更新成功: ${id}`);
            return this.getAgentDetail(id);
        }, "智能体配置更新失败");
    }

    // 获取智能体列表，支持关键字过滤、公开状态筛选和分页
    async getAgentList(dto: QueryAgentDto) {
        const queryBuilder = this.agentRepository.createQueryBuilder("agent");

        // 加载关联的 tags，排除 bindingCount 字段
        queryBuilder
            .leftJoin("agent.tags", "tag")
            .addSelect(["tag.id", "tag.name", "tag.type", "tag.createdAt", "tag.updatedAt"]);

        // 关联创建者信息（仅选择安全字段）
        // 注意：agent.createBy 是 varchar，但 user.id 通常为 uuid，这里使用 ::text 规避 uuid/text 比较报错
        queryBuilder
            .leftJoinAndMapOne(
                "agent.creator",
                User,
                "creator",
                "creator.id::text = agent.createBy",
            )
            .addSelect([
                "creator.id",
                "creator.userNo",
                "creator.username",
                "creator.nickname",
                "creator.avatar",
            ]);

        // 关键词搜索
        if (dto.keyword) {
            queryBuilder.where("agent.name ILIKE :keyword OR agent.description ILIKE :keyword", {
                keyword: `%${dto.keyword}%`,
            });
        }

        // 公开状态筛选
        if (dto.isPublic !== undefined) {
            if (dto.keyword) {
                queryBuilder.andWhere("agent.isPublic = :isPublic", {
                    isPublic: dto.isPublic,
                });
            } else {
                queryBuilder.where("agent.isPublic = :isPublic", {
                    isPublic: dto.isPublic,
                });
            }
        }

        // 创建模式筛选
        if (dto.createMode) {
            if (dto.keyword) {
                queryBuilder.andWhere("agent.createMode = :createMode", {
                    createMode: dto.createMode,
                });
            } else {
                queryBuilder.where("agent.createMode = :createMode", {
                    createMode: dto.createMode,
                });
            }
        }

        // 标签筛选：必须同时拥有所有指定的标签（AND 逻辑）
        if (dto.tagIds?.length) {
            const whereCondition = dto.keyword || dto.isPublic !== undefined ? "andWhere" : "where";
            const subQuery = this.agentRepository
                .createQueryBuilder()
                .subQuery()
                .select("COUNT(DISTINCT agent_tag_filter.tag_id)")
                .from("ai_agent_tags", "agent_tag_filter")
                .where("agent_tag_filter.agent_id = agent.id")
                .andWhere("agent_tag_filter.tag_id IN (:...tagIds)", { tagIds: dto.tagIds })
                .getQuery();
            queryBuilder[whereCondition](`(${subQuery}) = :tagCount`, {
                tagIds: dto.tagIds,
                tagCount: dto.tagIds.length,
            });
        }

        queryBuilder.orderBy("agent.createdAt", "DESC");

        return this.paginateQueryBuilder(queryBuilder, dto);
    }

    /**
     * 批量添加标签到智能体
     *
     * @param agentId 智能体ID
     * @param tagIds 标签ID数组
     * @returns 更新后的智能体
     */
    async addAgentTags(agentId: string, tagIds: string[]): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        // 获取要添加的标签
        const tagsToAdd = await this.tagRepository.findByIds(tagIds);
        if (tagsToAdd.length === 0) {
            throw HttpErrorFactory.badRequest("标签不存在");
        }

        // 合并现有标签和新标签（使用 Map 去重）
        const existingTags = (agent as Agent & { tags?: Tag[] }).tags || [];
        const allTags = Array.from(
            new Map([...existingTags, ...tagsToAdd].map((t) => [t.id, t])).values(),
        );

        (agent as Agent & { tags?: Tag[] }).tags = allTags;
        await this.agentRepository.save(agent);

        // 更新标签的绑定计数
        for (const tag of tagsToAdd) {
            tag.incrementBindingCount();
            await this.tagRepository.save(tag);
        }

        this.logger.log(`[+] 智能体标签添加成功: ${agentId}, 添加了 ${tagsToAdd.length} 个标签`);
        return agent;
    }

    /**
     * 批量从智能体移除标签
     *
     * @param agentId 智能体ID
     * @param tagIds 标签ID数组
     * @returns 更新后的智能体
     */
    async removeAgentTags(agentId: string, tagIds: string[]): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const existingTags = (agent as Agent & { tags?: Tag[] }).tags || [];
        const tagsToRemove = existingTags.filter((t) => tagIds.includes(t.id));

        // 移除标签
        (agent as Agent & { tags?: Tag[] }).tags = existingTags.filter(
            (t) => !tagIds.includes(t.id),
        );
        await this.agentRepository.save(agent);

        // 更新标签的绑定计数
        for (const tag of tagsToRemove) {
            tag.decrementBindingCount();
            await this.tagRepository.save(tag);
        }

        this.logger.log(`[+] 智能体标签移除成功: ${agentId}, 移除了 ${tagsToRemove.length} 个标签`);
        return agent;
    }

    // 删除指定智能体
    async deleteAgent(id: string): Promise<void> {
        await this.getAgentDetail(id); // 验证智能体存在

        await this.withErrorHandling(async () => {
            await this.agentRepository.delete(id);
            this.logger.log(`[+] 智能体删除成功: ${id}`);
        }, "智能体删除失败");
    }

    // 增加智能体访问用户计数
    async incrementUserCount(id: string): Promise<void> {
        await this.withErrorHandling(async () => {
            await this.agentRepository.increment({ id }, "userCount", 1);
            this.logger.log(`[+] 智能体访问计数+1: ${id}`);
        }, "更新访问计数失败");
    }

    // 获取智能体统计数据，包括总览和趋势
    async getAgentStatistics(
        agentId: string,
        dto?: QueryAgentStatisticsDto,
    ): Promise<{
        overview: {
            totalConversations: number;
            totalMessages: number;
            totalTokens: number;
            totalConsumedPower: number;
            totalAnnotations: number;
            activeAnnotations: number;
            annotationHitCount: number;
        };
        trends: {
            consumedPower: Array<{ date: string; count: number }>;
            messages: Array<{ date: string; count: number }>;
            tokens: Array<{ date: string; count: number }>;
            activeUsers: Array<{ date: string; count: number }>;
        };
    }> {
        await this.getAgentDetail(agentId); // 验证智能体存在

        const { startDate, endDate } = this.getDateRange(dto);

        const overview = await this.fetchOverview(agentId);
        const trends = await this.fetchTrends(agentId, startDate, endDate);

        this.logger.log(`[智能体统计] 数据获取成功: ${agentId}`);
        return { overview, trends };
    }

    // 检查智能体名称是否唯一
    private async checkNameUniqueness(name: string): Promise<void> {
        const existing = await this.findOne({ where: { name } });
        if (existing) {
            throw HttpErrorFactory.badRequest("智能体名称已存在");
        }
    }

    // 统一错误处理和日志记录
    private async withErrorHandling<T>(
        operation: () => Promise<T>,
        errorMessage: string,
    ): Promise<T> {
        try {
            return await operation();
        } catch (err) {
            this.logger.error(`[!] ${errorMessage}: ${err.message}`, err.stack);
            // ✅ 如果已经是业务异常，直接透传
            if (err instanceof HttpException) {
                throw err;
            }
            throw HttpErrorFactory.business(errorMessage);
        }
    }

    // 获取统计数据的时间范围
    private getDateRange(dto?: QueryAgentStatisticsDto): {
        startDate: Date;
        endDate: Date;
    } {
        const endDate = dto?.endDate ? new Date(dto.endDate) : new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = dto?.startDate
            ? new Date(dto.startDate)
            : new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);

        this.logger.log(
            `[统计] 查询时间范围: ${startDate.toISOString()} 至 ${endDate.toISOString()}`,
        );
        return { startDate, endDate };
    }

    // 获取统计总览数据
    private async fetchOverview(agentId: string) {
        const [
            totalConversations,
            totalMessages,
            { total: totalTokens },
            { total: totalConsumedPower },
            totalAnnotations,
            activeAnnotations,
            { total: annotationHitCount },
        ] = await Promise.all([
            this.chatRecordRepository.count({
                where: { agentId, isDeleted: false },
            }),
            this.chatMessageRepository.count({ where: { agentId } }),
            this.chatRecordRepository
                .createQueryBuilder("record")
                .select("SUM(record.totalTokens)", "total")
                .where("record.agentId = :agentId AND record.isDeleted = false", { agentId })
                .getRawOne(),
            this.chatRecordRepository
                .createQueryBuilder("record")
                .select("SUM(record.consumedPower)", "total")
                .where("record.agentId = :agentId AND record.isDeleted = false", { agentId })
                .getRawOne(),
            this.annotationRepository.count({ where: { agentId } }),
            this.annotationRepository.count({
                where: { agentId, enabled: true },
            }),
            this.annotationRepository
                .createQueryBuilder("annotation")
                .select("SUM(annotation.hitCount)", "total")
                .where("annotation.agentId = :agentId", { agentId })
                .getRawOne(),
        ]);

        return {
            totalConversations,
            totalMessages,
            totalTokens: parseInt(totalTokens || "0"),
            totalConsumedPower: parseInt(totalConsumedPower || "0"),
            totalAnnotations,
            activeAnnotations,
            annotationHitCount: parseInt(annotationHitCount || "0"),
        };
    }

    // 获取趋势数据
    private async fetchTrends(agentId: string, startDate: Date, endDate: Date) {
        const [consumedPower, messages, tokens, activeUsers] = await Promise.all([
            this.chatRecordRepository
                .createQueryBuilder("record")
                .select("DATE(record.createdAt) as date, SUM(record.consumedPower) as count")
                .where(
                    "record.agentId = :agentId AND record.createdAt BETWEEN :startDate AND :endDate AND record.isDeleted = false",
                    { agentId, startDate, endDate },
                )
                .groupBy("DATE(record.createdAt)")
                .orderBy("date", "ASC")
                .getRawMany(),
            this.chatMessageRepository
                .createQueryBuilder("message")
                .select("DATE(message.createdAt) as date, COUNT(*) as count")
                .where(
                    "message.agentId = :agentId AND message.createdAt BETWEEN :startDate AND :endDate",
                    { agentId, startDate, endDate },
                )
                .groupBy("DATE(message.createdAt)")
                .orderBy("date", "ASC")
                .getRawMany(),
            this.chatRecordRepository
                .createQueryBuilder("record")
                .select("DATE(record.createdAt) as date, SUM(record.totalTokens) as count")
                .where(
                    "record.agentId = :agentId AND record.createdAt BETWEEN :startDate AND :endDate AND record.isDeleted = false",
                    { agentId, startDate, endDate },
                )
                .groupBy("DATE(record.createdAt)")
                .orderBy("date", "ASC")
                .getRawMany(),
            this.chatRecordRepository
                .createQueryBuilder("record")
                .select("DATE(record.createdAt) as date, COUNT(DISTINCT record.userId) as count")
                .where(
                    "record.agentId = :agentId AND record.createdAt BETWEEN :startDate AND :endDate AND record.isDeleted = false",
                    { agentId, startDate, endDate },
                )
                .groupBy("DATE(record.createdAt)")
                .orderBy("date", "ASC")
                .getRawMany(),
        ]);

        return {
            consumedPower: this.formatTrendData(consumedPower, startDate, endDate),
            messages: this.formatTrendData(messages, startDate, endDate),
            tokens: this.formatTrendData(tokens, startDate, endDate),
            activeUsers: this.formatTrendData(activeUsers, startDate, endDate),
        };
    }

    // 格式化趋势数据，填充缺失日期
    private formatTrendData(
        data: any[],
        startDate: Date,
        endDate: Date,
    ): Array<{ date: string; count: number }> {
        const result: Array<{ date: string; count: number }> = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split("T")[0];
            const found = data.find(
                (item) => new Date(item.date).toISOString().split("T")[0] === dateStr,
            );
            result.push({
                date: dateStr,
                count: found ? parseInt(found.count) : 0,
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        this.logger.log(`[趋势数据] 格式化结果: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * 发布智能体
     * 生成访问令牌和API密钥，启用公开访问
     */
    async publishAgent(
        id: string,
        dto: PublishAgentDto,
    ): Promise<{
        publishToken: string;
        apiKey: string;
        publishUrl: string;
        embedCode: string;
    }> {
        const agent = await this.getAgentDetail(id);

        return this.withErrorHandling(async () => {
            // 生成唯一的访问令牌和API密钥
            const publishToken = this.generateToken("pub");
            const apiKey = this.generateToken("ak");

            // 更新智能体发布状态
            await this.updateById(id, {
                isPublished: true,
                publishToken,
                apiKey,
                publishConfig: dto.publishConfig || {},
            });

            const publishUrl = `${process.env.APP_DOMAIN || "http://localhost:4090"}/public/agent/${publishToken}`;
            const embedCode = this.generateEmbedCode(publishToken, publishUrl);

            this.logger.log(`[+] 智能体发布成功: ${id} - ${agent.name}`);

            return {
                publishToken,
                apiKey,
                publishUrl,
                embedCode,
            };
        }, "智能体发布失败");
    }

    /**
     * 取消发布智能体
     * 清除访问令牌和API密钥，禁用公开访问
     */
    async unpublishAgent(id: string): Promise<void> {
        const agent = await this.getAgentDetail(id);

        await this.withErrorHandling(async () => {
            await this.updateById(id, {
                isPublished: false,
                publishToken: null,
                apiKey: null,
                publishConfig: null,
            });

            this.logger.log(`[+] 智能体取消发布成功: ${id} - ${agent.name}`);
        }, "智能体取消发布失败");
    }

    /**
     * 重新生成API密钥
     */
    async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
        const agent = await this.getAgentDetail(id);

        if (!agent.isPublished) {
            throw HttpErrorFactory.badRequest("智能体未发布，无法重新生成API密钥");
        }

        return this.withErrorHandling(async () => {
            const apiKey = this.generateToken("ak");

            await this.updateById(id, { apiKey });

            this.logger.log(`[+] API密钥重新生成成功: ${id} - ${agent.name}`);

            return { apiKey };
        }, "API密钥重新生成失败");
    }

    /**
     * 获取嵌入代码
     */
    async getEmbedCode(id: string): Promise<{ embedCode: string; publishUrl: string }> {
        const agent = await this.getAgentDetail(id);

        if (!agent.isPublished || !agent.publishToken) {
            throw HttpErrorFactory.badRequest("智能体未发布，无法获取嵌入代码");
        }

        const publishUrl = `${process.env.APP_DOMAIN || "http://localhost:4090"}/public/agent/${agent.publishToken}`;
        const embedCode = this.generateEmbedCode(agent.publishToken, publishUrl);

        return { embedCode, publishUrl };
    }

    /**
     * 通过发布令牌获取公开智能体信息
     * @description 只返回公开可见的字段，过滤掉所有私密信息
     */
    async getPublicAgentByToken(publishToken: string): Promise<
        Agent & {
            modelFeatures?: string[];
            fileUploadConfig?: {
                enabled?: boolean;
                allowedFileExtensions?: string[];
                allowedFileTypes?: string[];
                numberLimits?: number;
                fileSizeLimit?: number;
            };
        }
    > {
        const agent = await this.agentRepository
            .createQueryBuilder("agent")
            .select([
                "agent.id",
                "agent.name",
                "agent.description",
                "agent.avatar",
                "agent.chatAvatar",
                "agent.createdAt",
                "agent.updatedAt",
                "agent.userCount",
                "agent.isPublic",
                "agent.isPublished",
                "agent.publishToken",
                "agent.openingStatement",
                "agent.openingQuestions",
                "agent.enableFeedback",
                "agent.showContext",
                "agent.formFields",
                "agent.quickCommands",
                "agent.modelConfig",
                "agent.createMode",
                "agent.thirdPartyIntegration",
            ])
            .leftJoin("agent.tags", "tag")
            .addSelect(["tag.id", "tag.name", "tag.type", "tag.createdAt", "tag.updatedAt"])
            .where("agent.publishToken = :publishToken", { publishToken })
            .andWhere("agent.isPublished = :isPublished", { isPublished: true })
            .getOne();

        if (!agent) {
            throw HttpErrorFactory.notFound("智能体不存在或未发布");
        } else {
            // 增加访问计数
            await this.incrementUserCount(agent.id);
        }

        // 提取模型特性（如 vision、audio），用于前端判断是否支持多模态上传
        let modelFeatures: string[] = [];
        if (agent.modelConfig?.id) {
            const model = await this.aiModelRepository.findOne({
                where: { id: agent.modelConfig.id },
                select: ["features"],
            });
            modelFeatures = model?.features || [];
        }

        // 获取第三方平台的文件上传配置
        let fileUploadConfig:
            | {
                  enabled?: boolean;
                  allowedFileExtensions?: string[];
                  allowedFileTypes?: string[];
                  numberLimits?: number;
                  fileSizeLimit?: number;
              }
            | undefined;

        // 如果是 Dify 智能体，获取 Dify 的文件上传配置
        if (
            agent.createMode === "dify" &&
            agent.thirdPartyIntegration?.apiKey &&
            agent.thirdPartyIntegration?.baseURL
        ) {
            try {
                const difyParams = await this.thirdPartyIntegrationHandler.fetchDifyParameters({
                    apiKey: agent.thirdPartyIntegration.apiKey,
                    baseURL: agent.thirdPartyIntegration.baseURL,
                });
                fileUploadConfig = difyParams.fileUploadConfig;
            } catch {
                // 获取 Dify 参数失败时忽略，使用默认配置
            }
        }

        // 移除敏感的 modelConfig 和 thirdPartyIntegration，只返回安全的公开信息
        const { modelConfig: _modelConfig, thirdPartyIntegration: _tpi, ...publicAgent } = agent;

        return {
            ...publicAgent,
            modelFeatures,
            fileUploadConfig,
        } as Agent & {
            modelFeatures?: string[];
            fileUploadConfig?: {
                enabled?: boolean;
                allowedFileExtensions?: string[];
                allowedFileTypes?: string[];
                numberLimits?: number;
                fileSizeLimit?: number;
            };
        };
    }

    /**
     * 验证API密钥并获取智能体
     */
    async getAgentByApiKey(apiKey: string): Promise<Agent> {
        const agent = await this.findOne({
            where: { apiKey, isPublished: true },
        });

        if (!agent) {
            throw HttpErrorFactory.unauthorized("API密钥无效或智能体未发布");
        }

        return agent as Agent;
    }

    /**
     * 获取智能体的文件上传配置
     * 对于 Dify 智能体，从 Dify 平台获取文件上传配置
     * @param agentId 智能体ID
     * @returns 文件上传配置
     */
    async getAgentFileUploadConfig(agentId: string): Promise<{
        enabled?: boolean;
        allowedFileExtensions?: string[];
        allowedFileTypes?: string[];
        numberLimits?: number;
        fileSizeLimit?: number;
    } | null> {
        const agent = await this.getAgentDetail(agentId);

        // 如果是 Dify 智能体，获取 Dify 的文件上传配置
        if (
            agent.createMode === "dify" &&
            agent.thirdPartyIntegration?.apiKey &&
            agent.thirdPartyIntegration?.baseURL
        ) {
            try {
                const difyParams = await this.thirdPartyIntegrationHandler.fetchDifyParameters({
                    apiKey: agent.thirdPartyIntegration.apiKey,
                    baseURL: agent.thirdPartyIntegration.baseURL,
                });
                return difyParams.fileUploadConfig || null;
            } catch {
                // 获取 Dify 参数失败时返回 null
                return null;
            }
        }

        // 非 Dify 智能体返回 null（前端会使用默认配置）
        return null;
    }

    /**
     * 生成唯一令牌
     */
    private generateToken(prefix: string = ""): string {
        const token = randomBytes(16).toString("hex");
        return prefix ? `${prefix}_${token}` : token;
    }

    /**
     * 生成嵌入代码
     */
    private generateEmbedCode(publishToken: string, publishUrl: string): string {
        return `<!-- BuildingAI 智能体嵌入代码 -->
<iframe 
  src="${publishUrl}?embed=true"
  width="400" 
  height="600"
  frameborder="0"
  style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</iframe>

<!-- 或使用 JavaScript SDK -->
<div id="chatbot-container"></div>
<script>
  window.BuildingAI = {
    init: function(options) {
      const iframe = document.createElement('iframe');
      iframe.src = '${publishUrl}?embed=true&sdk=true';
      iframe.width = options.width || '400px';
      iframe.height = options.height || '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '10px';
      iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
      
      const container = document.querySelector(options.container);
      if (container) {
        container.appendChild(iframe);
      }
    }
  };
  
  // 使用示例
  // BuildingAI.init({
  //   container: '#chatbot-container',
  //   width: '400px',
  //   height: '600px'
  // });
</script>`;
    }
}
