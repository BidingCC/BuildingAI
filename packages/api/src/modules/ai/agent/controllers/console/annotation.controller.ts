import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import {
    CreateAgentAnnotationDto,
    QueryAgentAnnotationDto,
    ReviewAnnotationDto,
    UpdateAgentAnnotationDto,
} from "../../dto/annotation";
import { AiAgentAnnotationService } from "../../services/ai-agent-annotation.service";

@ConsoleController("ai-agent-annotations", "智能体标注")
export class AiAgentAnnotationController {
    /**
     * Creates a new AiAgentAnnotationController instance
     *
     * @param annotationService - Service for handling annotation operations
     */
    constructor(private readonly annotationService: AiAgentAnnotationService) {}

    /**
     * Create Annotation
     *
     * Creates a new annotation for an AI agent with specified question and answer.
     * Anonymous users' annotations require review, while registered users' annotations are auto-approved.
     *
     * @param dto - Annotation creation parameters including agentId, question, answer, and optional metadata
     * @param user - Current user information
     * @returns Created annotation information
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建标注",
    })
    async createAnnotation(
        @Body() dto: CreateAgentAnnotationDto,
        @Playground() user: UserPlayground,
    ) {
        return await this.annotationService.createAnnotation(dto.agentId, dto, user);
    }

    /**
     * Get Annotation List
     *
     * Retrieves a paginated list of annotations for a specific agent.
     * Supports filtering by keyword, category, enabled status, and review status.
     *
     * @param query - Query parameters including agentId, keyword, category, enabled status, and pagination
     * @returns Annotation list and pagination information
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询标注列表",
    })
    @BuildFileUrl(["**.avatar"])
    async getAnnotations(@Query() query: QueryAgentAnnotationDto) {
        if (!query.agentId) {
            throw new Error("智能体ID是必需的");
        }
        return this.annotationService.getAgentAnnotations(query.agentId, query);
    }

    /**
     * Get Annotation Details
     *
     * Retrieves detailed information about a specific annotation
     *
     * @param id - Annotation ID
     * @returns Annotation details
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看标注详情",
    })
    async getAnnotationDetail(@Param("id") id: string) {
        return await this.annotationService.getAnnotationById(id);
    }

    /**
     * Update Annotation
     *
     * Updates existing annotation content and settings.
     * Anonymous users' edits require re-review, while registered users' edits maintain approval status.
     *
     * @param id - Annotation ID
     * @param dto - Update parameters including question, answer, category, tags, priority, and enabled status
     * @param user - Current user information
     * @returns Updated annotation information
     */
    @Put(":id")
    @Permissions({
        code: "update",
        name: "更新标注",
    })
    async updateAnnotation(
        @Param("id") id: string,
        @Body() dto: UpdateAgentAnnotationDto,
        @Playground() user: UserPlayground,
    ) {
        return await this.annotationService.updateAnnotation(id, dto, user);
    }

    /**
     * Review Annotation
     *
     * Reviews and approves or rejects pending annotations.
     * Only annotations with pending status can be reviewed.
     *
     * @param id - Annotation ID
     * @param dto - Review parameters including review status and optional review note
     * @param user - Current user information (reviewer)
     * @returns Reviewed annotation information
     */
    @Put(":id/review")
    @Permissions({
        code: "review",
        name: "审核标注",
    })
    async reviewAnnotation(
        @Param("id") id: string,
        @Body() dto: ReviewAnnotationDto,
        @Playground() user: UserPlayground,
    ) {
        return await this.annotationService.reviewAnnotation(id, dto, user);
    }

    /**
     * Delete Annotation
     *
     * Deletes annotation and removes it from all associated chat messages.
     * This operation is irreversible.
     *
     * @param id - Annotation ID
     * @returns Delete confirmation message
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除标注",
    })
    async deleteAnnotation(@Param("id") id: string) {
        await this.annotationService.deleteAnnotation(id);
        return { message: "标注删除成功" };
    }
}
