import { type UserPlayground } from "@buildingai/db";
import { Datasets, SquarePublishStatus } from "@buildingai/db/entities";
import { type FindOptionsWhere, ILike, In } from "@buildingai/db/typeorm";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { bytesToReadable } from "@buildingai/utils";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { UserService } from "@modules/user/services/user.service";
import { Body, Get, Param, Post, Query } from "@nestjs/common";

import { ListConsoleDatasetsDto } from "../../dto/list-console-datasets.dto";
import { RejectSquarePublishDto } from "../../dto/square-publish.dto";
import { DatasetsService } from "../../services/datasets.service";

@ConsoleController("datasets", "知识库")
export class DatasetsConsoleController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly userService: UserService,
    ) {}

    @Get()
    @Permissions({ code: "list", name: "知识库列表", description: "分页查询知识库列表" })
    async list(@Query() dto: ListConsoleDatasetsDto) {
        const { page = 1, pageSize = 20, name, status } = dto;
        const where: FindOptionsWhere<Datasets> = {};
        if (name?.trim()) {
            where.name = ILike(`%${name.trim()}%`);
        }
        if (status && status !== "all") {
            where.squarePublishStatus = status as SquarePublishStatus;
        }
        const result = await this.datasetsService.paginate(
            { page, pageSize },
            { where: Object.keys(where).length ? where : undefined, order: { updatedAt: "DESC" } },
        );
        const creatorIds = [...new Set((result.items as Datasets[]).map((d) => d.createdBy))];
        const users =
            creatorIds.length > 0
                ? await this.userService.findAll({
                      where: { id: In(creatorIds) },
                      select: { id: true, nickname: true },
                  })
                : [];
        const creatorMap = new Map(users.map((u) => [u.id, u.nickname ?? "-"]));
        const items = (result.items as Datasets[]).map((d) => ({
            id: d.id,
            name: d.name,
            creatorName: creatorMap.get(d.createdBy) ?? "-",
            documentCount: d.documentCount ?? 0,
            storageSize: d.storageSize ?? 0,
            storageSizeFormatted: bytesToReadable(Number(d.storageSize ?? 0)),
            squarePublishStatus: d.squarePublishStatus ?? SquarePublishStatus.NONE,
            squareRejectReason: d.squareRejectReason ?? null,
            sort: 0,
            updatedAt: d.updatedAt,
        }));
        return {
            items,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages,
        };
    }

    @Post(":id/approve-square")
    @Permissions({ code: "review", name: "审核通过", description: "知识库广场发布审核通过" })
    async approveSquare(@Param("id") datasetId: string, @Playground() user: UserPlayground) {
        return this.datasetsService.approveSquarePublish(datasetId, user.id);
    }

    @Post(":id/reject-square")
    @Permissions({ code: "review", name: "审核拒绝", description: "知识库广场发布审核拒绝" })
    async rejectSquare(
        @Param("id") datasetId: string,
        @Body() dto: RejectSquarePublishDto,
        @Playground() user: UserPlayground,
    ) {
        return this.datasetsService.rejectSquarePublish(datasetId, user.id, dto.reason);
    }
}
