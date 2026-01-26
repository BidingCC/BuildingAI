import { DatasetsSegments } from "@buildingai/db/entities";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    BatchDeleteSegmentDto,
    CreateSegmentDto,
    DeleteSegmentDto,
    QuerySegmentDto,
    UpdateSegmentDto,
} from "../../dto/segments.dto";
import { DatasetPermission, ResourceType } from "../../guards/datasets-permission.guard";
import { SegmentsService } from "../../services/segments.service";

@ConsoleController("ai-datasets-segments", "数据集分段")
export class SegmentsController {
    /**
     * Creates a new SegmentsController instance
     *
     * @param segmentsService - Service for handling segment operations
     */
    constructor(private readonly segmentsService: SegmentsService) {}

    /**
     * Create Segment
     *
     * Creates a new segment in the dataset
     *
     * @param dto - Segment creation parameters
     * @param user - Current user information
     * @returns Created segment information
     */
    @Post("")
    @Permissions({
        code: "create",
        name: "创建分段",
    })
    @DatasetPermission({
        permission: "canManageSegments",
        datasetIdParam: "datasetId",
    })
    async create(@Body() dto: CreateSegmentDto): Promise<DatasetsSegments> {
        return this.segmentsService.createSegment(dto);
    }

    /**
     * Get Segments List
     *
     * Supports keyword search, status filtering, content length filtering, date range filtering, etc.
     *
     * @param dto - Query parameters
     * @param user - Current user information
     * @returns Segments list and pagination information
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询分段列表",
    })
    async list(@Query() dto: QuerySegmentDto) {
        return this.segmentsService.list(dto);
    }

    /**
     * Get Segment Details
     *
     * Retrieves detailed information about a specific segment
     *
     * @param id - Segment ID
     * @param user - Current user information
     * @returns Segment details
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看分段详情",
    })
    async getById(@Param("id", UUIDValidationPipe) id: string): Promise<DatasetsSegments> {
        return this.segmentsService.getSegmentById(id);
    }

    /**
     * Update Segment
     *
     * Updates the content and properties of an existing segment
     *
     * @param id - Segment ID
     * @param dto - Update parameters
     * @param user - Current user information
     * @returns Updated segment information
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新分段",
    })
    @DatasetPermission({
        permission: "canManageSegments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.SEGMENT,
    })
    async update(@Param("id", UUIDValidationPipe) id: string, @Body() dto: UpdateSegmentDto) {
        return this.segmentsService.updateSegment(id, dto);
    }

    /**
     * Delete Segment
     *
     * Removes a segment from the dataset
     *
     * @param dto - Delete parameters containing segment ID
     * @param user - Current user information
     * @returns Delete result
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除分段",
    })
    @DatasetPermission({
        permission: "canManageSegments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.SEGMENT,
    })
    async remove(@Param() dto: DeleteSegmentDto) {
        const success = await this.segmentsService.deleteSegment(dto.id);
        return { success };
    }

    /**
     * Batch Delete Segments
     *
     * Deletes multiple segments in a single operation
     *
     * @param dto - Batch delete parameters containing segment IDs
     * @param user - Current user information
     * @returns Delete result
     */
    @Post("batch-delete")
    @Permissions({
        code: "batch-delete",
        name: "批量删除分段",
    })
    @DatasetPermission({
        permission: "canManageSegments",
        datasetIdParam: "datasetId",
    })
    async batchRemove(@Body() dto: BatchDeleteSegmentDto) {
        const success = await this.segmentsService.batchDeleteSegments(dto.ids);
        return { success };
    }

    /**
     * Set Segment Enabled/Disabled Status
     *
     * Enables or disables a single segment for search and retrieval
     *
     * @param id - Segment ID
     * @param body - Status parameters containing enabled flag (1/0)
     * @returns Operation result
     */
    @Patch(":id/enabled")
    @Permissions({
        code: "set-enabled",
        name: "设置分段状态",
    })
    async setEnabled(@Param("id") id: string, @Body() body: { enabled: number }) {
        await this.segmentsService.setSegmentEnabled(id, body.enabled);
        return { success: true };
    }

    /**
     * Batch Set Segments Enabled/Disabled Status
     *
     * Enables or disables multiple segments for search and retrieval in a single operation
     *
     * @param body - Batch status parameters containing segment IDs and enabled flag (1/0)
     * @returns Operation result
     */
    @Post("batch-enabled")
    @Permissions({
        code: "batch-set-enabled",
        name: "批量设置分段状态",
    })
    async batchSetEnabled(@Body() body: { ids: string[]; enabled: number }) {
        await this.segmentsService.batchSetSegmentEnabled(body.ids, body.enabled);
        return { success: true };
    }
}
