import { PaginationResult } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, User } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../../dto/create-empty-dataset.dto";
import { ListDatasetsDto } from "../../dto/list-datasets.dto";
import { RetrieveDto } from "../../dto/retrieval.dto";
import { UpdateDatasetDto } from "../../dto/update-dataset.dto";
import { DatasetPermission } from "../../guards/datasets-permission.guard";
import { DatasetsService } from "../../services/datasets.service";
import { DatasetMemberService } from "../../services/datasets-member.service";
import { DatasetsRetrievalService } from "../../services/datasets-retrieval.service";

@WebController("ai-datasets")
export class DatasetsWebController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly retrievalService: DatasetsRetrievalService,
        private readonly datasetMemberService: DatasetMemberService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    @Get("my-created")
    async listMyCreated(
        @Playground() user: UserPlayground,
        @Query() query: ListDatasetsDto,
    ): Promise<PaginationResult<Datasets>> {
        return this.datasetsService.listMyCreated(user.id, query);
    }

    @Get("team")
    async listTeam(
        @Playground() user: UserPlayground,
        @Query() query: ListDatasetsDto,
    ): Promise<PaginationResult<Datasets>> {
        return this.datasetsService.listTeam(user.id, query);
    }

    @Get(":datasetId")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getDetail(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<
        Datasets & {
            memberCount: number;
            isOwner: boolean;
            creator: { id: string; nickname: string | null; avatar: string | null } | null;
        }
    > {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const memberCount = await this.datasetMemberService.countMembers(datasetId);
        const isOwner = (dataset as Datasets).createdBy === user.id;
        const creatorUser = await this.userRepository.findOne({
            where: { id: (dataset as Datasets).createdBy },
            select: { id: true, nickname: true, avatar: true },
        });
        const creator =
            creatorUser == null
                ? null
                : {
                      id: creatorUser.id,
                      nickname: creatorUser.nickname ?? null,
                      avatar: creatorUser.avatar ?? null,
                  };
        return { ...(dataset as Datasets), memberCount, isOwner, creator };
    }

    @Post("create-empty")
    async createEmpty(
        @Body() dto: CreateEmptyDatasetDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.createEmptyDataset(dto, user);
    }

    @Patch(":datasetId")
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "datasetId" })
    async update(
        @Param("datasetId") datasetId: string,
        @Body() dto: UpdateDatasetDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.updateDataset(datasetId, dto, user.id);
    }

    @Post(":datasetId/retrieve")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async retrieve(@Param("datasetId") datasetId: string, @Body() dto: RetrieveDto) {
        return this.retrievalService.retrieve(datasetId, dto.query, dto.topK, dto.scoreThreshold);
    }

    @Post(":datasetId/publish-to-square")
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "datasetId" })
    async publishToSquare(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.publishToSquare(datasetId, user.id);
    }

    @Post(":datasetId/unpublish-from-square")
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "datasetId" })
    async unpublishFromSquare(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.unpublishFromSquare(datasetId, user.id);
    }
}
