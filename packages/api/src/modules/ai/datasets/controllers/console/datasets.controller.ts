import { type UserPlayground } from "@buildingai/db";
import { Datasets } from "@buildingai/db/entities";
import { Playground } from "@buildingai/decorators/playground.decorator";
import {
    IndexingSegmentsDto,
    IndexingSegmentsResponseDto,
} from "@buildingai/dto/indexing-segments.dto";
import { RetrievalResult } from "@buildingai/types/ai/retrieval-config.interface";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreateDatasetDto,
    DeleteDatasetDto,
    QueryDatasetDto,
    RetrievalTestDto,
    UpdateDatasetDto,
} from "../../dto/datasets.dto";
import { DatasetPermission } from "../../guards/datasets-permission.guard";
import { DatasetsService } from "../../services/datasets.service";
import { DatasetsRetrievalService } from "../../services/datasets-retrieval.service";
import { IndexingService } from "../../services/indexing.service";

@ConsoleController("ai-datasets", "数据集")
export class DatasetsController {
    /**
     * Creates a new DatasetsController instance
     *
     * @param datasetsService - Service for handling dataset operations
     * @param datasetsRetrievalService - Service for handling dataset retrieval operations
     * @param indexingService - Service for handling document indexing operations
     */
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly datasetsRetrievalService: DatasetsRetrievalService,
        private readonly indexingService: IndexingService,
    ) {}

    /**
     * Create Dataset
     *
     * Creates a new AI dataset with specified configuration
     *
     * @param dto - Dataset creation parameters
     * @param user - Current user information
     * @returns Created dataset information
     */
    @Post("create")
    @Permissions({
        code: "create",
        name: "创建数据集",
    })
    async create(
        @Body() dto: CreateDatasetDto,
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.createDatasets(dto, user);
    }

    /**
     * Create Empty Dataset
     *
     * Creates an empty dataset containing only name and description without any documents
     *
     * @param dto - Dataset creation parameters including name, description and embedding model
     * @param user - Current user information
     * @returns Created empty dataset information
     */
    @Post("create-empty")
    @Permissions({
        code: "create-empty",
        name: "创建空数据集",
    })
    async createEmpty(
        @Body()
        dto: { name: string; description?: string; embeddingModelId: string },
        @Playground() user: UserPlayground,
    ): Promise<Datasets> {
        return this.datasetsService.createEmptyDataset(dto, user);
    }

    /**
     * Dataset Segmentation and Processing
     *
     * Reads file content and performs segmentation processing based on provided file ID list.
     * Does not store to database, directly returns segmentation results for preview.
     *
     * @param dto - Segmentation parameters including segmentation configuration and file ID list
     * @param user - Current user information
     * @returns Segmentation processing results with limited segments (max 20 per file)
     */
    @Post("indexing-segments")
    @Permissions({
        code: "indexing-segments",
        name: "数据集分段处理",
    })
    async indexingSegments(@Body() dto: IndexingSegmentsDto): Promise<IndexingSegmentsResponseDto> {
        const result = await this.indexingService.indexingSegments(dto);
        // Limit segment count to 20 to prevent frontend rendering too many segments that may cause freezing
        if (Array.isArray(result.fileResults)) {
            result.fileResults = result.fileResults.map((fileResult) => ({
                ...fileResult,
                segments: Array.isArray(fileResult.segments)
                    ? fileResult.segments.slice(0, 20)
                    : fileResult.segments,
            }));
        }
        return result;
    }

    /**
     * Get Dataset List
     *
     * Supports keyword search for dataset names and descriptions.
     * Super administrators can see all datasets, regular users can only see datasets they created or are members of.
     *
     * @param dto - Query parameters including search keywords and pagination
     * @param user - Current user information
     * @returns Dataset list and pagination information
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询数据集列表",
    })
    async list(@Query() dto: QueryDatasetDto, @Playground() user: UserPlayground) {
        return this.datasetsService.list(dto, user);
    }

    /**
     * Get Dataset Details
     *
     * Retrieves detailed information about a specific dataset
     *
     * @param id - Dataset ID
     * @param user - Current user information
     * @returns Dataset details
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看数据集详情",
    })
    async getById(@Param("id") id: string, @Playground() user: UserPlayground): Promise<Datasets> {
        return this.datasetsService.getDatasetById(id, user.id, user);
    }

    /**
     * Update Dataset
     *
     * Updates existing dataset configuration and settings
     *
     * @param id - Dataset ID
     * @param dto - Update parameters
     * @param user - Current user information
     * @returns Updated dataset information
     */
    @Patch(":id/update")
    @Permissions({
        code: "update",
        name: "更新数据集",
    })
    @DatasetPermission({ permission: "canManageDataset", datasetIdParam: "id" })
    async updateDataset(
        @Param("id") id: string,
        @Body() dto: UpdateDatasetDto,
        @Playground() user: UserPlayground,
    ) {
        return this.datasetsService.updateDataset(id, user.id, dto);
    }

    /**
     * Delete Dataset
     *
     * Deletes dataset and its related documents and segment data
     *
     * @param dto - Delete parameters containing dataset ID
     * @param user - Current user information
     * @returns Delete result
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除数据集",
    })
    @DatasetPermission({ permission: "canDelete", datasetIdParam: "id" })
    async remove(@Param() dto: DeleteDatasetDto) {
        const success = await this.datasetsService.deleteDataset(dto.id);
        return { success };
    }

    /**
     * Dataset Retrieval Test
     *
     * Allows testing different retrieval configurations with custom retrievalConfig parameters
     *
     * @param id - Dataset ID
     * @param dto - Retrieval test parameters including query and retrieval configuration
     * @param user - Current user information
     * @returns Retrieval test results
     */
    @Post(":id/retrieval-test")
    @Permissions({
        code: "retrieval-test",
        name: "数据集召回测试",
    })
    async retrievalTest(
        @Param("id") id: string,
        @Body() dto: RetrievalTestDto,
        @Playground() user: UserPlayground,
    ): Promise<RetrievalResult> {
        // Verify knowledge base permissions
        await this.datasetsService.getDatasetById(id, user.id, user);

        // Execute retrieval test
        return this.datasetsRetrievalService.queryDatasetWithConfig(
            id,
            dto.query,
            dto.retrievalConfig,
        );
    }

    /**
     * Retry Dataset Vectorization
     *
     * Retries vectorization for all failed documents in the dataset
     *
     * @param id - Dataset ID
     * @returns Retry operation result
     */
    @Post(":id/retry")
    @Permissions({
        code: "retry",
        name: "重试数据集向量化",
    })
    async retryDataset(@Param("id") id: string) {
        return this.datasetsService.retryDataset(id);
    }
}
