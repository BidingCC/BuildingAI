import { PaginationResult } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent, User } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { AgentDashboardQueryDto } from "../../dto/web/agent/agent-dashboard-query.dto";
import { CopyAgentFromSquareDto } from "../../dto/web/agent/copy-agent-from-square.dto";
import { CreateAgentDto } from "../../dto/web/agent/create-agent.dto";
import { ListMyAgentsDto } from "../../dto/web/agent/list-my-agents.dto";
import { ListSquareAgentsDto } from "../../dto/web/agent/list-square-agents.dto";
import { UpdateAgentDto } from "../../dto/web/agent/update-agent.dto";
import { PublishToSquareDto } from "../../dto/web/publish/square-publish.dto";
import {
    type AgentDashboardResult,
    AgentDashboardService,
} from "../../services/agent-dashboard.service";
import { AgentsService } from "../../services/agents.service";

@WebController("ai-agents")
export class AgentsWebController {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly agentDashboardService: AgentDashboardService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    @Get("my-created")
    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    async listMyCreated(
        @Playground() user: UserPlayground,
        @Query() query: ListMyAgentsDto,
    ): Promise<PaginationResult<Agent>> {
        return this.agentsService.listMyAgents(user.id, query);
    }

    @Post()
    async create(@Playground() user: UserPlayground, @Body() dto: CreateAgentDto): Promise<Agent> {
        return this.agentsService.createAgent(user, dto);
    }

    @Post(":id/copy-from-square")
    async copyFromSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() _dto: CopyAgentFromSquareDto,
    ): Promise<Agent> {
        return this.agentsService.copyFromSquare(id, user.id);
    }

    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    @Get("square")
    @Public()
    async listSquare(@Query() query: ListSquareAgentsDto): Promise<
        PaginationResult<
            Agent & {
                creator: { id: string; nickname: string | null; avatar: string | null } | null;
            }
        >
    > {
        const result = await this.agentsService.listSquare(query);
        const creatorIds = [...new Set(result.items.map((a) => a.createBy).filter(Boolean))];

        if (creatorIds.length === 0) {
            return { ...result, items: result.items.map((a) => ({ ...a, creator: null })) };
        }

        const users = await this.userRepository.find({
            where: { id: In(creatorIds) },
            select: { id: true, nickname: true, avatar: true },
        });
        const creatorMap = new Map(
            users.map((u) => [
                u.id,
                { id: u.id, nickname: u.nickname ?? null, avatar: u.avatar ?? null },
            ]),
        );

        const items = result.items.map((a) => ({
            ...a,
            creator: creatorMap.get(a.createBy) ?? null,
        }));

        return { ...result, items };
    }

    @Get(":id/dashboard")
    async dashboard(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Query() query: AgentDashboardQueryDto,
    ): Promise<AgentDashboardResult> {
        await this.agentsService.getAgentDetail(user, id);
        return this.agentDashboardService.getDashboard(id, query.startTime, query.endTime);
    }

    @Get(":id")
    @BuildFileUrl(["**.avatar"])
    async detail(@Playground() user: UserPlayground, @Param("id") id: string): Promise<Agent> {
        return this.agentsService.getAgentDetail(user, id);
    }

    @Patch(":id")
    async update(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() dto: UpdateAgentDto,
    ): Promise<Agent> {
        return this.agentsService.updateAgent(user, id, dto);
    }

    @Post(":id/publish-to-square")
    async publishToSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() dto: PublishToSquareDto,
    ): Promise<Agent> {
        return this.agentsService.publishToSquare(id, user.id, dto.tagIds, {
            allowCopy: dto.allowCopy,
        });
    }

    @Post(":id/unpublish-from-square")
    async unpublishFromSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
    ): Promise<Agent> {
        return this.agentsService.unpublishFromSquare(id, user.id);
    }

    @Delete(":id")
    async deleteAgent(@Playground() user: UserPlayground, @Param("id") id: string): Promise<void> {
        await this.agentsService.deleteAgent(id, user.id);
    }
}
