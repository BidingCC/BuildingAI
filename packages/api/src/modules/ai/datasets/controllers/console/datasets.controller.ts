import { type UserPlayground } from "@buildingai/db";
import { Datasets, SquarePublishStatus } from "@buildingai/db/entities";
import { type FindOptionsWhere, ILike, In } from "@buildingai/db/typeorm";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { bytesToReadable } from "@buildingai/utils";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { UserService } from "@modules/user/services/user.service";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { ListConsoleDatasetsDto } from "../../dto/list-console-datasets.dto";
import { SetDatasetVectorConfigDto } from "../../dto/set-dataset-vector-config.dto";
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

    @Get(":id")
    @Permissions({
        code: "detail",
        name: "知识库详情",
        description: "查询知识库详情（含向量配置）",
    })
    async getOne(@Param("id") datasetId: string) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        return {
            id: dataset.id,
            name: dataset.name,
            embeddingModelId: dataset.embeddingModelId ?? null,
            retrievalMode: dataset.retrievalMode,
            retrievalConfig: dataset.retrievalConfig,
        };
    }

    @Patch(":id/vector-config")
    @Permissions({
        code: "vector-config",
        name: "设置向量配置",
        description: "设置知识库检索方式与向量模型",
    })
    async setVectorConfig(@Param("id") datasetId: string, @Body() dto: SetDatasetVectorConfigDto) {
        return this.datasetsService.updateVectorConfig(datasetId, dto);
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

    @Delete(":id")
    @Permissions({ code: "delete", name: "删除知识库", description: "删除指定知识库及其文档与数据" })
    async remove(@Param("id") datasetId: string) {
        return this.datasetsService.deleteDatasetForConsole(datasetId);
    }
}
