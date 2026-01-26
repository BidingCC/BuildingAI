import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateDocumentDto, QueryDocumentDto, RenameDocumentDto } from "../../dto/documents.dto";
import { DatasetPermission, ResourceType } from "../../guards/datasets-permission.guard";
import { CreateDocumentResponseDto } from "../../interfaces/documents.interface";
import { DocumentsService } from "../../services/documents.service";

@ConsoleController("ai-datasets-documents", "数据集文档")
export class DocumentsController {
    /**
     * Creates a new DocumentsController instance
     *
     * @param documentsService - Service for handling document operations
     */
    constructor(private readonly documentsService: DocumentsService) {}

    /**
     * Create Document
     *
     * Upload document to specified dataset and perform segmentation processing
     *
     * @param dto - Document creation parameters
     * @param user - Current user information
     * @returns Created document information
     */
    @Post("create")
    @Permissions({
        code: "create",
        name: "创建文档",
    })
    @DatasetPermission({
        permission: "canManageDocuments",
        datasetIdParam: "datasetId",
    })
    async create(
        @Body() dto: CreateDocumentDto,
        @Playground() user: UserPlayground,
    ): Promise<CreateDocumentResponseDto> {
        return this.documentsService.createDocument(dto, user);
    }

    /**
     * Get Document List
     *
     * Supports keyword search, status filtering, file type filtering, date range filtering, etc.
     *
     * @param dto - Query parameters
     * @param user - Current user information
     * @returns Document list and pagination information
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查询文档列表",
    })
    async list(@Query() dto: QueryDocumentDto) {
        return this.documentsService.list(dto);
    }

    /**
     * Get All Documents
     *
     * Returns all documents for the user without pagination, supports filtering by dataset
     *
     * @param user - Current user information
     * @param datasetsId - Dataset ID (optional)
     * @returns All document list
     */
    @Get("all")
    @Permissions({
        code: "get-all",
        name: "获取全部文档",
    })
    async getAllDocuments(
        @Playground() user: UserPlayground,
        @Query("datasetsId") datasetsId?: string,
    ) {
        return this.documentsService.getAllDocuments(datasetsId);
    }

    /**
     * Get Document Details
     *
     * Retrieves detailed information about a specific document
     *
     * @param id - Document ID
     * @param user - Current user information
     * @returns Document details
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看文档详情",
    })
    async getById(@Param("id") id: string): Promise<any> {
        // Assuming DatasetsDocument is replaced by 'any' or needs a type import
        return this.documentsService.getDocumentById(id);
    }

    /**
     * Rename Document
     *
     * Updates the name of an existing document
     *
     * @param id - Document ID
     * @param dto - Rename parameters
     * @param user - Current user information
     * @returns Updated document
     */
    @Patch(":id/rename")
    @Permissions({
        code: "rename",
        name: "重命名文档",
    })
    @DatasetPermission({
        permission: "canManageDocuments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.DOCUMENT,
    })
    async rename(@Param("id") id: string, @Body() dto: RenameDocumentDto): Promise<any> {
        return this.documentsService.renameDocument(id, dto);
    }

    /**
     * Delete Document
     *
     * Deletes document and its related segment data
     *
     * @param dto - Delete parameters containing document ID
     * @param user - Current user information
     * @returns Delete result
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除文档",
    })
    @DatasetPermission({
        permission: "canManageDocuments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.DOCUMENT,
    })
    async remove(@Param() dto: { id: string }) {
        const success = await this.documentsService.deleteDocument(dto.id);
        return { success };
    }

    /**
     * Retry Document Vectorization
     *
     * Retries vectorization for all failed segments in the document
     *
     * @param id - Document ID
     * @returns Retry operation result
     */
    @Post(":id/retry")
    @Permissions({
        code: "retry",
        name: "重试文档向量化",
    })
    async retryDocument(@Param("id") id: string) {
        return this.documentsService.retryDocument(id);
    }

    /**
     * Set Document Enabled/Disabled Status
     *
     * Enables or disables a document for search and retrieval
     *
     * @param id - Document ID
     * @param body - Status parameters containing enabled flag
     * @returns Updated document status
     */
    @Patch(":id/enabled")
    @Permissions({
        code: "set-enabled",
        name: "设置文档状态",
    })
    @DatasetPermission({
        permission: "canManageDocuments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.DOCUMENT,
    })
    async setEnabled(@Param("id") id: string, @Body() body: { enabled: boolean }) {
        return this.documentsService.setDocumentEnabled(id, body.enabled);
    }
}
