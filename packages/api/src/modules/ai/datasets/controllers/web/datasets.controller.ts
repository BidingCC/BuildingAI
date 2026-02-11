import { PaginationResult } from "@buildingai/base";
import { TEAM_ROLE_PERMISSIONS } from "@buildingai/constants/shared/team-role.constants";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Datasets, User } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { isEnabled } from "@buildingai/utils";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateEmptyDatasetDto } from "../../dto/create-empty-dataset.dto";
import { ListDatasetsDto } from "../../dto/list-datasets.dto";
import { ListSquareDatasetsDto } from "../../dto/list-square-datasets.dto";
import { RetrieveDto } from "../../dto/retrieval.dto";
import { PublishToSquareDto, RejectSquarePublishDto } from "../../dto/square-publish.dto";
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

    @Get("square")
    @Public()
    async listSquare(@Query() query: ListSquareDatasetsDto): Promise<
        PaginationResult<
            Datasets & {
                creator: { id: string; nickname: string | null; avatar: string | null } | null;
            }
        >
    > {
        const result = await this.datasetsService.listSquare(query);
        const creatorIds = [...new Set(result.items.map((d) => d.createdBy))];
        if (creatorIds.length === 0) {
            return { ...result, items: result.items.map((d) => ({ ...d, creator: null })) };
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
        const items = result.items.map((d) => ({
            ...d,
            creator: creatorMap.get(d.createdBy) ?? null,
        }));
        return { ...result, items };
    }

    @Get(":datasetId")
    @BuildFileUrl(["**.avatar"])
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getDetail(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<
        Datasets & {
            memberCount: number;
            isOwner: boolean;
            isMember: boolean;
            canManageDocuments: boolean;
            creator: { id: string; nickname: string | null; avatar: string | null } | null;
        }
    > {
        const dataset = await this.datasetsService.findOne({
            where: { id: datasetId },
            relations: { tags: true },
        });
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const memberCount = await this.datasetMemberService.countMembers(datasetId);
        const isOwner = (dataset as Datasets).createdBy === user.id;
        let canManageDocuments = false;
        let isMember = false;
        if (isEnabled(user.isRoot)) {
            canManageDocuments = TEAM_ROLE_PERMISSIONS.owner.canManageDocuments === true;
        } else {
            const role = await this.datasetMemberService.getMemberRole(datasetId, user.id);
            canManageDocuments = (role && TEAM_ROLE_PERMISSIONS[role]?.canManageDocuments) === true;
            isMember = role !== null;
        }
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
        if (isEnabled(user.isRoot)) {
            isMember = true;
        }
        return {
            ...(dataset as Datasets),
            memberCount,
            isOwner,
            isMember,
            canManageDocuments,
            creator,
        };
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
        @Body() dto: PublishToSquareDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.publishToSquare(
            datasetId,
            user.id,
            dto.tagIds,
            dto.memberJoinApprovalRequired,
        );
    }

    @Post(":datasetId/unpublish-from-square")
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "datasetId" })
    async unpublishFromSquare(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.unpublishFromSquare(datasetId, user.id);
    }

    @Post(":datasetId/square-publish/approve")
    async approveSquarePublish(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        if (!isEnabled(user.isRoot)) {
            throw HttpErrorFactory.forbidden("仅管理员可审核通过");
        }
        return this.datasetsService.approveSquarePublish(datasetId, user.id);
    }

    @Post(":datasetId/square-publish/reject")
    async rejectSquarePublish(
        @Param("datasetId") datasetId: string,
        @Body() dto: RejectSquarePublishDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        if (!isEnabled(user.isRoot)) {
            throw HttpErrorFactory.forbidden("仅管理员可审核拒绝");
        }
        return this.datasetsService.rejectSquarePublish(datasetId, user.id, dto.reason);
    }

    @Delete(":datasetId")
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "datasetId" })
    async delete(
        @Param("datasetId") datasetId: string,
        @Playground() user: UserPlayground,
    ): Promise<{ success: boolean }> {
        return this.datasetsService.deleteDataset(datasetId, user.id);
    }
}
