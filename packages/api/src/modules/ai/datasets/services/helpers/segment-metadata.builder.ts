import { DatasetsDocument } from "@buildingai/db/entities";
import { UploadService } from "@modules/upload/services/upload.service";

/**
 * Segment metadata builder
 *
 * Builds metadata for dataset segments, including file information.
 * Centralizes metadata construction logic to avoid duplication.
 */
export class SegmentMetadataBuilder {
    /**
     * Build complete segment metadata from document and file info
     *
     * @param document - Document entity
     * @param uploadService - Upload service to fetch file details
     * @returns Complete metadata object for segment
     */
    static async build(
        document: DatasetsDocument,
        uploadService: UploadService,
    ): Promise<Record<string, any>> {
        const fileInfo = await uploadService.getFileById(document.fileId);

        return {
            fileId: document.fileId,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            filePath: fileInfo?.path || "",
            fileUrl: fileInfo?.url || "",
            extension: fileInfo?.extension || "",
            mimeType: fileInfo?.mimeType || "",
            storageName: fileInfo?.storageName || "",
        };
    }

    /**
     * Build metadata with custom fields merged
     *
     * @param document - Document entity
     * @param uploadService - Upload service
     * @param customMetadata - Additional custom metadata to merge
     * @returns Merged metadata object
     */
    static async buildWithCustom(
        document: DatasetsDocument,
        uploadService: UploadService,
        customMetadata: Record<string, any> = {},
    ): Promise<Record<string, any>> {
        const baseMetadata = await this.build(document, uploadService);
        return { ...customMetadata, ...baseMetadata };
    }
}
