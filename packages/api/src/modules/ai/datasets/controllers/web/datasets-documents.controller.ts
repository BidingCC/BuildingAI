import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    BatchAddTagsDto,
    BatchCopyDocumentsDto,
    BatchDeleteDocumentsDto,
    BatchMoveDocumentsDto,
    CreateDocumentDto,
    ListDocumentsDto,
    UpdateDocumentTagsDto,
} from "../../dto/document.dto";
import { DatasetPermission, ResourceType } from "../../guards/datasets-permission.guard";
import { DatasetsDocumentService } from "../../services/datasets-document.service";

@WebController("ai-datasets")
export class DatasetsDocumentsWebController {
    constructor(private readonly documentService: DatasetsDocumentService) {}

    @Post(":datasetId/documents")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async create(
        @Param("datasetId") datasetId: string,
        @Body() dto: CreateDocumentDto,
        @Playground() user: UserPlayground,
    ) {
        return this.documentService.createDocument(datasetId, dto, user);
    }

    @Get(":datasetId/documents")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async list(@Param("datasetId") datasetId: string, @Query() query: ListDocumentsDto) {
        return this.documentService.listByDataset(datasetId, query);
    }

    @Post(":datasetId/documents/batch-delete")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async batchDelete(@Param("datasetId") datasetId: string, @Body() dto: BatchDeleteDocumentsDto) {
        return this.documentService.batchDeleteDocuments(datasetId, dto);
    }

    @Post(":datasetId/documents/batch-move")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async batchMove(
        @Param("datasetId") datasetId: string,
        @Body() dto: BatchMoveDocumentsDto,
        @Playground() user: UserPlayground,
    ) {
        return this.documentService.batchMoveDocuments(datasetId, dto, user);
    }

    @Post(":datasetId/documents/batch-copy")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async batchCopy(
        @Param("datasetId") datasetId: string,
        @Body() dto: BatchCopyDocumentsDto,
        @Playground() user: UserPlayground,
    ) {
        return this.documentService.batchCopyDocuments(datasetId, dto, user);
    }

    @Post(":datasetId/documents/batch-add-tags")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async batchAddTags(@Param("datasetId") datasetId: string, @Body() dto: BatchAddTagsDto) {
        return this.documentService.batchAddTags(datasetId, dto);
    }

    @Get(":datasetId/documents/:documentId")
    @DatasetPermission({ permission: "canViewAll", datasetIdParam: "datasetId" })
    async getOne(@Param("datasetId") datasetId: string, @Param("documentId") documentId: string) {
        return this.documentService.getOne(datasetId, documentId);
    }

    @Patch(":datasetId/documents/:documentId/tags")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async updateDocumentTags(
        @Param("datasetId") datasetId: string,
        @Param("documentId") documentId: string,
        @Body() dto: UpdateDocumentTagsDto,
    ) {
        return this.documentService.updateDocumentTags(datasetId, documentId, dto.tags);
    }

    @Delete(":datasetId/documents/:documentId")
    @DatasetPermission({
        permission: "canManageDocuments",
        datasetIdParam: "datasetId",
        checkOwnership: true,
        resourceType: ResourceType.DOCUMENT,
        resourceIdParam: "documentId",
    })
    async delete(@Param("datasetId") datasetId: string, @Param("documentId") documentId: string) {
        const ok = await this.documentService.deleteDocument(datasetId, documentId);
        return { success: ok };
    }

    @Post(":datasetId/documents/:documentId/retry-vectorization")
    @DatasetPermission({ permission: "canManageDocuments", datasetIdParam: "datasetId" })
    async retryVectorization(
        @Param("datasetId") datasetId: string,
        @Param("documentId") documentId: string,
    ) {
        await this.documentService.retryVectorization(datasetId, documentId);
        return { success: true };
    }
}
