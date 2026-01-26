import { BaseController } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AiModel } from "@buildingai/db/entities";
import { Agent } from "@buildingai/db/entities";
import { AgentChatRecord } from "@buildingai/db/entities";
import { MembershipLevels } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Query } from "@nestjs/common";

import { QueryPublicAgentDto } from "../../dto/agent/ai-agent.dto";
import { AiAgentService } from "../../services/ai-agent.service";

/**
 * 智能体控制器（前台）
 *
 * 提供公开智能体列表查询功能
 */
@WebController("ai-agents")
export class AiAgentWebController extends BaseController {
    constructor(
        private readonly aiAgentService: AiAgentService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(AgentChatRecord)
        private readonly chatRecordRepository: Repository<AgentChatRecord>,
        @InjectRepository(AiModel)
        private readonly aiModelRepository: Repository<AiModel>,
        @InjectRepository(MembershipLevels)
        private readonly membershipLevelsRepository: Repository<MembershipLevels>,
    ) {
        super();
    }

    /**
     * 获取所有公开的智能体列表
     * @description 只返回公开可见的字段，过滤掉所有私密信息，并统计对话数量和供应商信息
     */
    @Get()
    @Public()
    @BuildFileUrl([
        "**.avatar",
        "**.chatAvatar",
        "**.provider.iconUrl",
        "**.requiredMembershipLevel.icon",
    ])
    async getPublicAgents(@Query() queryDto: QueryPublicAgentDto) {
        try {
            const queryBuilder = this.agentRepository.createQueryBuilder("agent");

            // 只选择公开可见的字段（包括 modelConfig 用于获取供应商信息）
            queryBuilder.select([
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
                "agent.modelConfig",
            ]);

            // 加载关联的 tags，排除 bindingCount 字段
            queryBuilder
                .leftJoin("agent.tags", "tag")
                .addSelect(["tag.id", "tag.name", "tag.type", "tag.createdAt", "tag.updatedAt"]);

            // 筛选条件：必须是公开且已发布的
            queryBuilder.where("agent.isPublic = :isPublic", { isPublic: true });
            queryBuilder.andWhere("agent.isPublished = :isPublished", { isPublished: true });

            // 关键词搜索
            if (queryDto.keyword) {
                queryBuilder.andWhere(
                    "(agent.name ILIKE :keyword OR agent.description ILIKE :keyword)",
                    { keyword: `%${queryDto.keyword}%` },
                );
            }

            // 标签筛选：必须同时拥有所有指定的标签（AND 逻辑）
            if (queryDto.tagIds?.length) {
                const subQuery = this.agentRepository
                    .createQueryBuilder()
                    .subQuery()
                    .select("COUNT(DISTINCT agent_tag_filter.tag_id)")
                    .from("ai_agent_tags", "agent_tag_filter")
                    .where("agent_tag_filter.agent_id = agent.id")
                    .andWhere("agent_tag_filter.tag_id IN (:...tagIds)", {
                        tagIds: queryDto.tagIds,
                    })
                    .getQuery();
                queryBuilder.andWhere(`(${subQuery}) = :tagCount`, {
                    tagIds: queryDto.tagIds,
                    tagCount: queryDto.tagIds.length,
                });
            }

            // 排序
            if (queryDto.sortBy === "popular") {
                queryBuilder.orderBy("agent.userCount", "DESC");
                queryBuilder.addOrderBy("agent.createdAt", "DESC");
            } else {
                queryBuilder.orderBy("agent.createdAt", "DESC");
            }

            // 使用 AiAgentService 的分页函数
            const result = await this.aiAgentService.paginateQueryBuilder(queryBuilder, queryDto);

            // 如果没有数据，直接返回（确保 conversationCount 为 0）
            if (!result.items || result.items.length === 0) {
                return result;
            }

            const agentIds = result.items.map((agent) => agent.id);

            // 批量获取对话数量
            const conversationCounts = await this.chatRecordRepository
                .createQueryBuilder("chat_record")
                .select("chat_record.agentId", "agentId")
                .addSelect("COUNT(chat_record.id)", "count")
                .where("chat_record.agentId IN (:...agentIds)", { agentIds })
                .andWhere("chat_record.isDeleted = false")
                .groupBy("chat_record.agentId")
                .getRawMany();

            // 创建对话数量映射
            const countMap = new Map<string, number>();
            conversationCounts.forEach((item) => {
                countMap.set(item.agentId, parseInt(item.count || "0"));
            });

            // 提取所有 modelId
            const modelIds: string[] = [];
            const agentModelMap = new Map<string, string>(); // agentId -> modelId

            result.items.forEach((agent) => {
                const modelConfig = (agent as any).modelConfig;
                if (modelConfig?.id) {
                    modelIds.push(modelConfig.id);
                    agentModelMap.set(agent.id, modelConfig.id);
                }
            });

            // 批量获取模型和供应商信息
            const providerMap = new Map<string, { name: string; iconUrl?: string }>();
            const modelRequiredMembershipLevelMap = new Map<
                string,
                {
                    id: string;
                    name: string;
                    level: number;
                    icon: string;
                }
            >();

            if (modelIds.length > 0) {
                const models = await this.aiModelRepository.find({
                    where: { id: In(modelIds) },
                    relations: ["provider"],
                    select: {
                        id: true,
                        membershipLevel: true,
                        provider: {
                            id: true,
                            name: true,
                            iconUrl: true,
                        },
                    },
                });

                // 计算每个模型所需的最高会员等级信息（若该模型配置了会员等级限制）
                const requiredLevelIdSet = new Set<string>();
                models.forEach((model) => {
                    const requiredLevelIds = (model as AiModel & { membershipLevel?: string[] })
                        .membershipLevel;
                    if (!requiredLevelIds || requiredLevelIds.length === 0) return;
                    requiredLevelIds.forEach((levelId) => requiredLevelIdSet.add(levelId));
                });

                const requiredLevelIds = Array.from(requiredLevelIdSet);
                if (requiredLevelIds.length > 0) {
                    const levels = await this.membershipLevelsRepository.find({
                        where: { id: In(requiredLevelIds) },
                        select: ["id", "name", "level", "icon"],
                    });

                    const levelMap = new Map(levels.map((l) => [l.id, l] as const));

                    models.forEach((model) => {
                        const required = (model as AiModel & { membershipLevel?: string[] })
                            .membershipLevel;
                        if (!required || required.length === 0) return;

                        let maxRequiredLevel: MembershipLevels | undefined;
                        required.forEach((levelId) => {
                            const level = levelMap.get(levelId);
                            if (!level) return;
                            if (!maxRequiredLevel || level.level > maxRequiredLevel.level) {
                                maxRequiredLevel = level;
                            }
                        });

                        if (maxRequiredLevel) {
                            modelRequiredMembershipLevelMap.set(model.id, {
                                id: maxRequiredLevel.id,
                                name: maxRequiredLevel.name,
                                level: maxRequiredLevel.level,
                                icon: maxRequiredLevel.icon,
                            });
                        }
                    });
                }

                models.forEach((model) => {
                    if (model.provider) {
                        providerMap.set(model.id, {
                            name: model.provider.name,
                            iconUrl: model.provider.iconUrl || undefined,
                        });
                    }
                });
            }

            // 将对话数量和供应商信息添加到结果中
            result.items = result.items.map((agent) => {
                const modelId = agentModelMap.get(agent.id);
                const provider = modelId ? providerMap.get(modelId) : undefined;
                const requiredMembershipLevel = modelId
                    ? modelRequiredMembershipLevelMap.get(modelId)
                    : undefined;

                return {
                    ...agent,
                    conversationCount: countMap.get(agent.id) || 0,
                    provider: provider
                        ? {
                              name: provider.name,
                              iconUrl: provider.iconUrl,
                          }
                        : undefined,
                    requiredMembershipLevel,
                    // 移除 modelConfig（私密信息）
                    modelConfig: undefined,
                } as Agent & {
                    conversationCount: number;
                    provider?: { name: string; iconUrl?: string };
                    requiredMembershipLevel?: {
                        id: string;
                        name: string;
                        level: number;
                        icon: string;
                    };
                };
            });

            return result;
        } catch (error) {
            this.logger.error(`获取公开智能体列表失败: ${error.message}`, error.stack);
            throw error;
        }
    }
}
