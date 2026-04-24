import { randomBytes } from "node:crypto";

import { BaseService } from "@buildingai/base";
import { TagType } from "@buildingai/constants/shared/tag.constant";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AiMcpServer,
    Datasets,
    McpServerType,
    SquarePublishStatus,
    Tag,
    User,
} from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable, Logger } from "@nestjs/common";

import { ListConsoleAgentsDto } from "../dto/list-console-agents.dto";
import { CreateAgentDto } from "../dto/web/agent/create-agent.dto";
import { AgentPublishStatus, type ListMyAgentsDto } from "../dto/web/agent/list-my-agents.dto";
import type { ListSquareAgentsDto } from "../dto/web/agent/list-square-agents.dto";
import { UpdateAgentDto } from "../dto/web/agent/update-agent.dto";
import type { UpdatePublishConfigDto } from "../dto/web/publish/update-publish-config.dto";
import { CozeAgentSyncService } from "../integrations/coze-agent-sync.service";
import { DifyAgentSyncService } from "../integrations/dify-agent-sync.service";

@Injectable()
export class AgentsService extends BaseService<Agent> {
    protected readonly logger = new Logger(AgentsService.name);
    private readonly defaultAvatar = "/static/images/agent.png";

    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,
        @InjectRepository(AiMcpServer)
        private readonly mcpServerRepository: Repository<AiMcpServer>,
        @InjectRepository(Datasets)
        private readonly datasetsRepository: Repository<Datasets>,
        private readonly cozeAgentSyncService: CozeAgentSyncService,
        private readonly difyAgentSyncService: DifyAgentSyncService,
        private readonly agentConfigService: AgentConfigService,
    ) {
        super(agentRepository);
    }

    private async checkNameUniqueness(name: string): Promise<void> {
        const existing = await this.agentRepository.findOne({ where: { name } });
        if (existing) {
            throw HttpErrorFactory.badRequest("智能体名称已存在");
        }
    }

    private async syncAgentTags(agent: Agent, tagIds?: string[]) {
        if (!tagIds) return;
        if (tagIds.length === 0) {
            (agent as Agent & { tags?: Tag[] }).tags = [];
            return;
        }

        const tags = await this.tagRepository.find({
            where: { id: In(tagIds), type: TagType.APP },
        });
        if (tags.length !== tagIds.length) {
            throw HttpErrorFactory.badRequest("标签不存在");
        }
        (agent as Agent & { tags?: Tag[] }).tags = tags;
    }

    async createAgent(user: UserPlayground, dto: CreateAgentDto): Promise<Agent> {
        const name = dto.name?.trim();
        const description = dto.description?.trim();
        const createMode = dto.createMode || "direct";
        if (!name) throw HttpErrorFactory.badRequest("智能体名称不能为空");

        await this.checkNameUniqueness(name);

        const agent = this.agentRepository.create({
            name,
            description: description || undefined,
            avatar: dto.avatar || this.defaultAvatar,
            createMode,
            modelConfig: createMode === "direct" ? dto.modelConfig : undefined,
            thirdPartyIntegration: dto.thirdPartyIntegration || {},
            showContext: true,
            showReference: true,
            enableWebSearch: false,
            enableFileUpload: false,
            chatAvatarEnabled: false,
            autoQuestions:
                createMode === "direct"
                    ? {
                          enabled: false,
                          customRuleEnabled: false,
                          customRule: "",
                      }
                    : undefined,
            userCount: 0,
            toolConfig: {
                requireApproval: false,
                toolTimeout: 30000,
            },
            memoryConfig: { maxUserMemories: 20, maxAgentMemories: 20 },
            createBy: user.id,
        });

        await this.syncAgentTags(agent, dto.tagIds);
        return this.agentRepository.save(agent);
    }

    private async generateUniqueName(baseName: string): Promise<string> {
        let name = baseName.trim();
        try {
            await this.checkNameUniqueness(name);
            return name;
        } catch {
            let suffix = 1;
            while (true) {
                const candidate = `${baseName} (${suffix})`;
                try {
                    await this.checkNameUniqueness(candidate);
                    return candidate;
                } catch {
                    suffix += 1;
                }
            }
        }
    }

    async getAgentByIdOrThrow(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        return agent;
    }

    async getAgentDetail(user: UserPlayground, agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (!agent.publishedToSquare && agent.createBy !== user.id) {
            throw HttpErrorFactory.forbidden("无权限查看该智能体");
        }
        return agent;
    }

    async updateAgent(user: UserPlayground, agentId: string, dto: UpdateAgentDto): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== user.id) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const nextName = dto.name?.trim();
        if (nextName && nextName !== agent.name) {
            await this.checkNameUniqueness(nextName);
            agent.name = nextName;
        }

        if (dto.createMode !== undefined && dto.createMode !== agent.createMode) {
            throw HttpErrorFactory.badRequest("创建方式不可修改");
        }

        const next = {
            description:
                dto.description !== undefined ? (dto.description?.trim() ?? "") : undefined,
            avatar: dto.avatar ?? agent.avatar,
            thirdPartyIntegration: dto.thirdPartyIntegration ?? agent.thirdPartyIntegration ?? {},
            chatAvatar: dto.chatAvatar ?? agent.chatAvatar,
            rolePrompt: dto.rolePrompt !== undefined ? (dto.rolePrompt?.trim() ?? "") : undefined,
            showContext: dto.showContext,
            showReference: dto.showReference,
            enableWebSearch: dto.enableWebSearch,
            enableFileUpload: dto.enableFileUpload,
            chatAvatarEnabled: dto.chatAvatarEnabled,
            memoryConfig: dto.memoryConfig,
            modelConfig: dto.modelConfig,
            openingStatement:
                dto.openingStatement !== undefined
                    ? (dto.openingStatement?.trim() ?? "")
                    : undefined,
            openingQuestions: dto.openingQuestions,
            quickCommands: dto.quickCommands,
            autoQuestions: dto.autoQuestions,
            formFields: dto.formFields,
            formFieldsInputs: dto.formFieldsInputs,
            datasetIds: dto.datasetIds,
            mcpServerIds: dto.mcpServerIds,
            toolConfig: dto.toolConfig,
            maxSteps: dto.maxSteps,
            modelRouting: dto.modelRouting,
            contextConfig: dto.contextConfig,
            voiceConfig: dto.voiceConfig,
            annotationConfig: dto.annotationConfig,
        } satisfies Partial<Agent>;

        Object.assign(agent, next);
        if (agent.createMode === "coze" && dto.thirdPartyIntegration !== undefined) {
            this.cozeAgentSyncService.normalizeConfig(agent);
        }
        if (agent.createMode === "dify" && dto.thirdPartyIntegration !== undefined) {
            this.difyAgentSyncService.normalizeConfig(agent);
        }

        await this.syncAgentTags(agent, dto.tagIds);
        const savedAgent = await this.agentRepository.save(agent);

        if (savedAgent.createMode === "coze" && dto.thirdPartyIntegration !== undefined) {
            const syncResult = await this.cozeAgentSyncService.syncAgentInfo(savedAgent.id);
            return syncResult.agent ?? savedAgent;
        }

        if (savedAgent.createMode === "dify" && dto.thirdPartyIntegration !== undefined) {
            const syncResult = await this.difyAgentSyncService.syncAgentInfo(savedAgent.id);
            return syncResult.agent ?? savedAgent;
        }

        return savedAgent;
    }

    async updatePublishConfig(
        user: UserPlayground,
        agentId: string,
        dto: UpdatePublishConfigDto,
    ): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== user.id) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const config = agent.publishConfig ?? {};

        if (dto.enableSite !== undefined) {
            config.enableSite = dto.enableSite;
            if (dto.enableSite && !config.accessToken) {
                config.accessToken = randomBytes(32).toString("hex");
            }
        }

        if (dto.regenerateAccessToken === true) {
            config.accessToken = randomBytes(32).toString("hex");
            config.enableSite = true;
        }

        agent.publishConfig = config;
        return this.agentRepository.save(agent);
    }

    async publishToSquare(agentId: string, userId: string, tagIds?: string[]): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== userId) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status === SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("已提交审核，请等待审核结果");
        }
        // if (status === SquarePublishStatus.APPROVED) {
        //     throw HttpErrorFactory.badRequest("该智能体已发布到广场");
        // }

        const ids = Array.isArray(tagIds) ? tagIds.filter(Boolean) : [];
        const tags = await this.tagRepository.find({
            where: { id: In(ids), type: TagType.APP },
        });
        if (tags.length !== ids.length) {
            throw HttpErrorFactory.badRequest("标签不存在");
        }

        // Get agent config to check if publish without review is enabled
        const config = await this.agentConfigService.getConfig();
        const publishWithoutReview = config.publishWithoutReview ?? false;

        agent.tags = tags;
        agent.squareReviewedBy = null;
        agent.squareReviewedAt = null;
        agent.squareRejectReason = null;

        if (publishWithoutReview) {
            agent.squarePublishStatus = SquarePublishStatus.APPROVED;
            agent.publishedToSquare = true;
            agent.publishedAt = agent.publishedAt ?? new Date();
        } else {
            agent.squarePublishStatus = SquarePublishStatus.PENDING;
        }

        await this.agentRepository.save(agent);

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async unpublishFromSquare(agentId: string, userId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");
        if (agent.createBy !== userId) throw HttpErrorFactory.forbidden("无权限操作该智能体");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING && status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("该智能体未发布到广场");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.NONE,
            publishedToSquare: false,
            squareReviewedBy: null,
            squareReviewedAt: null,
            squareRejectReason: null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async approveSquarePublish(agentId: string, operatorId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核通过，仅待审核申请可操作");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.APPROVED,
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: null,
            publishedToSquare: true,
            publishedAt: agent.publishedAt ?? new Date(),
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async publishSquareByAdmin(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("当前状态不可上架，仅审核通过的智能体可操作");
        }
        if (agent.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该智能体已上架到广场");
        }

        await this.agentRepository.update(agentId, {
            publishedToSquare: true,
            publishedAt: new Date(),
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async unpublishSquareByAdmin(agentId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("当前状态不可下架，仅审核通过的智能体可操作");
        }
        if (!agent.publishedToSquare) {
            throw HttpErrorFactory.badRequest("该智能体当前未上架到广场");
        }

        await this.agentRepository.update(agentId, {
            publishedToSquare: false,
            publishedAt: null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async rejectSquarePublish(
        agentId: string,
        operatorId: string,
        reason?: string | null,
    ): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.PENDING) {
            throw HttpErrorFactory.badRequest("当前状态不可审核拒绝，仅待审核申请可操作");
        }

        await this.agentRepository.update(agentId, {
            squarePublishStatus: SquarePublishStatus.REJECTED,
            squareReviewedBy: operatorId,
            squareReviewedAt: new Date(),
            squareRejectReason: reason ?? null,
        });

        return this.findOneById(agentId, { relations: ["tags"] }) as Promise<Agent>;
    }

    async listForConsole(dto: ListConsoleAgentsDto) {
        const { name, status, tagId, ...paginationDto } = dto;
        const normalizedStatus = status as string | undefined;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .addSelect(
                "CASE WHEN a.square_publish_status = :pendingStatus THEN 0 ELSE 1 END",
                "pending_review_sort",
            )
            .leftJoinAndSelect("a.tags", "tags")
            .leftJoin(User, "u", "u.id::text = a.createBy")
            .orderBy("pending_review_sort", "ASC")
            .addOrderBy("a.createdAt", "DESC")
            .setParameter("pendingStatus", SquarePublishStatus.PENDING);

        if (tagId) {
            qb.innerJoin("ai_agent_tags", "at", "at.agent_id = a.id AND at.tag_id = :tagId", {
                tagId,
            });
        }

        if (name?.trim()) {
            qb.andWhere(
                "(a.name ILIKE :name OR u.nickname ILIKE :name OR u.username ILIKE :name)",
                { name: `%${name.trim()}%` },
            );
        }

        if (normalizedStatus && normalizedStatus !== "all") {
            if (normalizedStatus === "published") {
                qb.andWhere("a.publishedToSquare = :published", { published: true });
                qb.andWhere("a.square_publish_status = :status", {
                    status: SquarePublishStatus.APPROVED,
                });
            } else if (normalizedStatus === "unpublished") {
                qb.andWhere("a.publishedToSquare = :published", { published: false });
                qb.andWhere("a.square_publish_status = :status", {
                    status: SquarePublishStatus.APPROVED,
                });
            } else {
                qb.andWhere("a.square_publish_status = :status", { status: normalizedStatus });
            }
        }

        const result = await this.paginateQueryBuilder(qb, paginationDto);

        // 获取统计数据
        const stats = await this.getAgentStatistics();

        return {
            ...result,
            extend: stats,
        };
    }

    /**
     * 获取智能体统计数据
     */
    private async getAgentStatistics() {
        const total = await this.agentRepository.count();

        const pending = await this.agentRepository.count({
            where: { squarePublishStatus: SquarePublishStatus.PENDING },
        });

        const published = await this.agentRepository.count({
            where: {
                publishedToSquare: true,
                squarePublishStatus: SquarePublishStatus.APPROVED,
            },
        });

        const privateCount = await this.agentRepository.count({
            where: {
                squarePublishStatus: SquarePublishStatus.NONE,
                publishedToSquare: false,
            },
        });

        const unpublished = await this.agentRepository.count({
            where: {
                squarePublishStatus: SquarePublishStatus.APPROVED,
                publishedToSquare: false,
            },
        });

        return {
            total,
            pending,
            published,
            private: privateCount,
            unpublished,
        };
    }

    async listSquare(dto: ListSquareAgentsDto) {
        const { keyword, tagIds, ...paginationDto } = dto;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .leftJoinAndSelect("a.tags", "tags")
            .where("a.squarePublishStatus = :status", { status: SquarePublishStatus.APPROVED })
            .orderBy("a.updatedAt", "DESC");

        if (keyword?.trim()) {
            qb.andWhere("(a.name ILIKE :keyword OR a.description ILIKE :keyword)", {
                keyword: `%${keyword.trim()}%`,
            });
        }

        if (tagIds?.length) {
            qb.innerJoin(
                "ai_agent_tags",
                "at",
                "at.agent_id = a.id AND at.tag_id IN (:...tagIds)",
                { tagIds },
            );
        }

        return this.paginateQueryBuilder(qb, paginationDto);
    }

    async listMyAgents(userId: string, dto: ListMyAgentsDto) {
        const { keyword, status, ...paginationDto } = dto;

        const qb = this.agentRepository
            .createQueryBuilder("a")
            .leftJoinAndSelect("a.tags", "tags")
            .where("a.createBy = :userId", { userId })
            .orderBy("a.updatedAt", "DESC");

        if (keyword?.trim()) {
            qb.andWhere("(a.name ILIKE :keyword OR a.description ILIKE :keyword)", {
                keyword: `%${keyword.trim()}%`,
            });
        }

        if (status === AgentPublishStatus.PUBLISHED) {
            qb.andWhere("a.squarePublishStatus = :status", {
                status: SquarePublishStatus.APPROVED,
            });
            qb.andWhere("a.publishedToSquare = :published", { published: true });
        } else if (status === AgentPublishStatus.UNPUBLISHED) {
            qb.andWhere("a.publishedToSquare = :published", { published: false });
        }

        return this.paginateQueryBuilder(qb, paginationDto);
    }

    /**
     * 删除智能体
     * @param agentId 智能体ID
     * @param operatorId 操作者ID
     */
    async deleteAgent(agentId: string, _operatorId: string): Promise<void> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw HttpErrorFactory.notFound("智能体不存在");

        // 检查智能体状态：已发布到广场的智能体不能删除
        const status = agent.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status === SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("已发布到广场的智能体不能删除，请先撤回广场发布");
        }

        await this.agentRepository.delete(agentId);
    }

    async copyFromSquare(agentId: string, userId: string): Promise<Agent> {
        const source = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ["tags"],
        });
        if (!source) throw HttpErrorFactory.notFound("智能体不存在");

        const status = source.squarePublishStatus ?? SquarePublishStatus.NONE;
        if (status !== SquarePublishStatus.APPROVED) {
            throw HttpErrorFactory.badRequest("仅支持复制已发布到广场的智能体");
        }

        const name = await this.generateUniqueName(source.name);

        const availableMcpServerIds =
            source.mcpServerIds && source.mcpServerIds.length
                ? await this.mcpServerRepository
                      .find({
                          where: {
                              id: In(source.mcpServerIds),
                              isDisabled: false,
                              type: In([McpServerType.SYSTEM, McpServerType.USER]),
                          },
                          select: ["id", "type", "creatorId"],
                      })
                      .then((items) =>
                          items
                              .filter(
                                  (s) =>
                                      s.type === McpServerType.SYSTEM ||
                                      s.creatorId === source.createBy ||
                                      s.creatorId === userId,
                              )
                              .map((s) => s.id),
                      )
                : [];

        const availableDatasetIds =
            source.datasetIds && source.datasetIds.length
                ? await this.datasetsRepository
                      .find({
                          where: { id: In(source.datasetIds) },
                          select: ["id", "createdBy", "publishedToSquare", "squarePublishStatus"],
                      })
                      .then((items) =>
                          items
                              .filter(
                                  (d) =>
                                      d.createdBy === source.createBy ||
                                      d.createdBy === userId ||
                                      d.publishedToSquare,
                              )
                              .map((d) => d.id),
                      )
                : [];

        const agent = this.agentRepository.create({
            name,
            description: source.description,
            avatar: source.avatar || this.defaultAvatar,
            createMode: source.createMode || "direct",
            thirdPartyIntegration: source.thirdPartyIntegration || {},
            showContext: source.showContext,
            showReference: source.showReference,
            enableWebSearch: source.enableWebSearch,
            enableFileUpload: source.enableFileUpload,
            chatAvatarEnabled: source.chatAvatarEnabled,
            chatAvatar: source.chatAvatar,
            userCount: 0,
            toolConfig: source.toolConfig,
            memoryConfig: source.memoryConfig,
            modelConfig: source.modelConfig,
            modelRouting: source.modelRouting,
            contextConfig: source.contextConfig,
            voiceConfig: source.voiceConfig,
            annotationConfig: source.annotationConfig,
            maxSteps: source.maxSteps,
            datasetIds: availableDatasetIds,
            openingStatement: source.openingStatement,
            openingQuestions: source.openingQuestions,
            quickCommands: source.quickCommands,
            autoQuestions: source.autoQuestions,
            formFields: source.formFields,
            formFieldsInputs: source.formFieldsInputs,
            mcpServerIds: availableMcpServerIds,
            publishedToSquare: false,
            publishedAt: null,
            publishConfig: {},
            squarePublishStatus: SquarePublishStatus.NONE,
            squareReviewedBy: null,
            squareReviewedAt: null,
            squareRejectReason: null,
            createBy: userId,
        });

        await this.syncAgentTags(agent, source.tags?.map((t) => t.id) ?? []);
        return this.agentRepository.save(agent);
    }
}
