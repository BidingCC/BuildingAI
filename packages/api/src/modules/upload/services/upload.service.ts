import { BaseService } from "@buildingai/base";
import { StorageType } from "@buildingai/constants/shared/storage-config.constant";
import { CloudStorageService } from "@buildingai/core";
import { FileUploadService, type UploadFileResult } from "@buildingai/core/modules";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { File } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { StorageConfigService } from "@modules/system/services/storage-config.service";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import { RemoteUploadDto } from "../dto/remote-upload.dto";
import { SignatureRequestDto } from "../dto/upload-file.dto";

/**
 * File upload service (API layer)
 *
 * Handles HTTP request-specific logic and delegates core operations to FileUploadService
 */
@Injectable()
export class UploadService extends BaseService<File> {
    /**
     * Constructor
     *
     * @param fileRepository File repository
     * @param fileUploadService Core file upload service
     * @param cloudStorageService
     * @param storageConfigService
     */
    constructor(
        @InjectRepository(File)
        private readonly fileRepository: Repository<File>,
        private readonly fileUploadService: FileUploadService,
        private readonly storageConfigService: StorageConfigService,
        private readonly cloudStorageService: CloudStorageService,
    ) {
        super(fileRepository);
    }

    /**
     * Save uploaded file
     *
     * @param file Uploaded file
     * @param request Express request object
     * @param description File description
     * @param extensionId Extension ID
     * @returns Upload result
     */
    async saveUploadedFile(
        file: Express.Multer.File,
        request: Request,
        description?: string,
        extensionId?: string,
    ): Promise<UploadFileResult> {
        return this.fileUploadService.uploadFileToDisk(
            file,
            request,
            description,
            extensionId ? { extensionId } : undefined,
        );
    }

    /**
     * For cloud storage
     */
    async getUploadSignatureInfo(dto: SignatureRequestDto) {
        const storageConfig = await this.storageConfigService.getActiveStorageConfig();
        if (!storageConfig) {
            throw HttpErrorFactory.notFound("Config not found");
        }

        switch (storageConfig.storageType) {
            case StorageType.OSS: {
                const cloudConf = await this.fileUploadService.createCloudStoragePath(
                    { name: dto.name, size: dto.size },
                    dto.extensionId ? { extensionId: dto.extensionId } : undefined,
                );
                const signature = await this.cloudStorageService.signature(storageConfig);

                return {
                    signature,
                    metadata: cloudConf.metadata,
                    storageType: storageConfig.storageType,
                    fullPath: cloudConf.storage.fullPath,
                    fileUrl: cloudConf.storage.fileUrl,
                };
            }
            default: {
                return {
                    signature: null,
                    storageType: storageConfig.storageType,
                };
            }
        }
    }

    /**
     * Save multiple uploaded files
     *
     * @param files Array of uploaded files
     * @param request Express request object
     * @param description File description
     * @param extensionId Extension ID
     * @returns Array of upload results
     */
    async saveUploadedFiles(
        files: Express.Multer.File[],
        request: Request,
        description?: string,
        extensionId?: string,
    ): Promise<UploadFileResult[]> {
        return this.fileUploadService.uploadFilesToDisk(
            files,
            request,
            description,
            extensionId ? { extensionId } : undefined,
        );
    }

    /**
     * Get file by ID
     *
     * @param id File ID
     * @returns File entity
     */
    async getFileById(id: string): Promise<Partial<File>> {
        return this.fileUploadService.findOneById(id);
    }

    /**
     * Delete file
     *
     * @param id File ID
     * @returns Success status
     */
    async deleteFile(id: string): Promise<boolean> {
        await this.fileUploadService.deleteFileById(id);
        return true;
    }

    /**
     * Get file physical path
     *
     * @param id File ID
     * @returns File physical path
     */
    async getFilePath(id: string): Promise<string> {
        return this.fileUploadService.getFilePath(id);
    }

    /**
     * Upload remote file
     *
     * @param remoteUploadDto Remote upload parameters
     * @param request Express request object
     * @returns Upload result
     */
    async uploadRemoteFile(
        remoteUploadDto: RemoteUploadDto,
        request: Request,
    ): Promise<UploadFileResult> {
        const { url, description, extensionId } = remoteUploadDto;

        return this.fileUploadService.uploadRemoteFileToDisk(
            url,
            request,
            description,
            extensionId ? { extensionId } : undefined,
        );
    }

    generateCloudStorageInfo({ extensionId, ...params }: SignatureRequestDto) {
        return this.fileUploadService.createCloudStoragePath(
            params,
            extensionId ? { extensionId } : undefined,
        );
    }

    /**
     * Save OSS file record to database
     *
     * @param dto OSS file information
     * @param request Express request object
     * @returns Upload result with file ID
     */
    async saveOSSFileRecord(dto: any, request: Request): Promise<UploadFileResult> {
        return this.fileUploadService.saveOSSFileRecord(
            {
                url: dto.url,
                originalName: dto.originalName,
                size: dto.size,
                extension: dto.extension,
                type: dto.type,
                description: dto.description,
                path: dto.path,
            },
            request,
            dto.extensionId,
        );
    }
}
