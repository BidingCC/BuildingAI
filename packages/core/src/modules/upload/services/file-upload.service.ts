import { BaseService } from "@buildingai/base";
import { StorageType } from "@buildingai/constants";
import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { FileUrlService } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { File } from "@buildingai/db/entities";
import { StorageConfig } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import * as mime from "mime-types";
import * as path from "path";

import { CloudStorageService } from "../../cloud-storage";
import type {
    FileMetadata,
    FileStorageOptions,
    RemoteFileOptions,
} from "../interfaces/file-storage.interface";
import { FileTypeDetector } from "../utils/file-type-detector.util";
import { RequestUtil } from "../utils/request.util";
import { FileStorageService } from "./file-storage.service";

/**
 * Upload file result
 */
export interface UploadFileResult {
    /**
     * File entity ID
     */
    id: string;

    /**
     * File access URL
     */
    url: string;

    /**
     * Original file name
     */
    originalName: string;

    /**
     * File size in bytes
     */
    size: number;

    /**
     * File MIME type
     */
    mimeType: string;

    /**
     * File extension
     */
    extension: string;
}

/**
 * File upload service
 *
 * Handles file upload business logic and database operations
 * This service can be used by both API and extensions
 */
@Injectable()
export class FileUploadService extends BaseService<File> {
    @InjectRepository(StorageConfig)
    private readonly storageConfigRepo: Repository<StorageConfig>;

    constructor(
        @InjectRepository(File)
        private readonly fileRepository: Repository<File>,
        private readonly fileStorageService: FileStorageService,
        private readonly fileUrlService: FileUrlService,
        private readonly cloudStorageService: CloudStorageService,
    ) {
        super(fileRepository);
    }

    /**
     * Upload single file from buffer or Multer file
     *
     * @param file File buffer or Multer file
     * @param request Express request object
     * @param description Optional file description
     * @param options Storage options
     * @returns Upload result
     */
    async uploadFileToDisk(
        file: Buffer | Express.Multer.File,
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ): Promise<UploadFileResult> {
        const clientIp = RequestUtil.getClientIP(request);
        const uploaderId = RequestUtil.getUploaderId(request);
        if (!file) {
            throw HttpErrorFactory.badRequest("No file provided", BusinessCode.PARAM_INVALID);
        }

        // Get effective extensionId from options or request path (must be resolved before storage)
        const extensionId = RequestUtil.getEffectiveExtensionId(request, options?.extensionId);
        const effectiveOptions: FileStorageOptions | undefined = extensionId
            ? { ...options, extensionId }
            : options;

        // Extract file metadata
        const metadata = this.fileStorageService.extractMetadata(file);

        // Generate storage path
        const storagePath = this.fileStorageService.generateStoragePath(metadata, effectiveOptions);

        // Save file to storage
        if (Buffer.isBuffer(file)) {
            await this.fileStorageService.saveBuffer(file, storagePath, effectiveOptions);
        } else {
            await this.fileStorageService.saveMulterFile(file, storagePath, effectiveOptions);
        }

        try {
            // Build file URL based on extensionId
            const urlPath = extensionId
                ? `/${extensionId}/uploads/${storagePath.fullPath}`
                : `/uploads/${storagePath.fullPath}`;
            const requestDomain = RequestUtil.getRequestDomain(request);
            const fileUrl = await this.fileUrlService.get(urlPath, requestDomain);

            // Save to database
            const savedFile = await this.create({
                url: fileUrl,
                ip: clientIp,
                originalName: metadata.originalName,
                storageName: storagePath.fileName,
                type: metadata.type,
                mimeType: metadata.mimeType,
                size: metadata.size,
                extension: metadata.extension,
                path: storagePath.fullPath,
                description: description || null,
                uploaderId,
                extensionIdentifier: extensionId || null,
            });

            return {
                id: savedFile.id,
                url: savedFile.url,
                originalName: savedFile.originalName,
                size: savedFile.size,
                mimeType: savedFile.mimeType,
                extension: savedFile.extension,
            };
        } catch (error) {
            console.error(error);
            // Clean up on error
            await this.fileStorageService.deleteFile(storagePath.fullPath, effectiveOptions);
            throw HttpErrorFactory.internal(
                "Failed to save file record",
                BusinessCode.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Upload multiple files
     *
     * @param files Array of files
     * @param request Express request object
     * @param description Optional file description
     * @param options Storage options
     * @returns Array of upload results
     */
    async uploadFilesToDisk(
        files: (Buffer | Express.Multer.File)[],
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ): Promise<UploadFileResult[]> {
        if (!files || files.length === 0) {
            throw HttpErrorFactory.badRequest("No files provided", BusinessCode.PARAM_INVALID);
        }

        const results: UploadFileResult[] = [];

        for (const file of files) {
            const result = await this.uploadFileToDisk(file, request, description, options);
            results.push(result);
        }

        return results;
    }

    /**
     * Upload file from remote URL
     *
     * @param url Remote file URL
     * @param request Express request object
     * @param description Optional file description
     * @param options Storage options
     * @returns Upload result
     */
    async uploadRemoteFileToDisk(
        url: string,
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ): Promise<UploadFileResult> {
        const clientIp = RequestUtil.getClientIP(request);
        const uploaderId = RequestUtil.getUploaderId(request);

        // Get effective extensionId from options or request path (must be resolved before storage)
        const extensionId = RequestUtil.getEffectiveExtensionId(request, options?.extensionId);
        const effectiveOptions: FileStorageOptions | undefined = extensionId
            ? { ...options, extensionId }
            : options;

        try {
            const { storagePath, metadata } = this.createRemoteFileStoragePath(
                url,
                effectiveOptions,
            );

            // Download and save remote file
            const remoteOptions: RemoteFileOptions = { url };
            const { size } = await this.fileStorageService.saveRemoteFile(
                remoteOptions,
                storagePath,
                effectiveOptions,
            );

            try {
                // Build file URL based on extensionId
                const urlPath = extensionId
                    ? `/${extensionId}/uploads/${storagePath.fullPath}`
                    : `/uploads/${storagePath.fullPath}`;
                const requestDomain = RequestUtil.getRequestDomain(request);
                const fileUrl = await this.fileUrlService.get(urlPath, requestDomain);

                // Save to database
                const savedFile = await this.create({
                    url: fileUrl,
                    ip: clientIp,
                    originalName: metadata.originalName,
                    storageName: storagePath.fileName,
                    type: metadata.type,
                    mimeType: metadata.mimeType,
                    size,
                    extension: metadata.extension,
                    path: storagePath.fullPath,
                    description: description || `Remote file from ${url}`,
                    uploaderId,
                    extensionIdentifier: extensionId || null,
                });

                return {
                    id: savedFile.id,
                    url: savedFile.url,
                    originalName: savedFile.originalName,
                    size: savedFile.size,
                    mimeType: savedFile.mimeType,
                    extension: savedFile.extension,
                };
            } catch (error) {
                // Clean up on error
                await this.fileStorageService.deleteFile(storagePath.fullPath, effectiveOptions);
                throw error;
            }
        } catch (error) {
            throw HttpErrorFactory.internal(
                `Failed to upload remote file: ${error.message}`,
                BusinessCode.REQUEST_FAILED,
            );
        }
    }

    async uploadFile(
        file: Express.Multer.File,
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ) {
        const storageConfig = await this.getActiveStorageConfig();
        if (storageConfig.storageType === StorageType.LOCAL) {
            return await this.uploadFileToDisk(file, request, description, options);
        }

        const pathConfig = await this.createCloudStoragePath(
            { name: file.originalname, size: file.size },
            request,
            options,
        );

        const uploadResult = await this.cloudStorageService.upload({
            file,
            description,
            storageConfig,
            path: pathConfig.storage.fullPath,
        });

        return {
            id: "",
            url: uploadResult.url,
            originalName: pathConfig.metadata.originalName,
            size: pathConfig.metadata.size,
            mimeType: pathConfig.metadata.mimeType,
            extension: pathConfig.metadata.extension,
        };
    }

    async uploadFiles(
        files: Array<Express.Multer.File>,
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ) {
        const tasks = files.map((file) => {
            return this.uploadFile(file, request, description, options);
        });

        return Promise.all(tasks);
    }

    async uploadRemoteFile(
        url: string,
        request: Request,
        description?: string,
        options?: FileStorageOptions,
    ) {
        try {
            const storageConfig = await this.getActiveStorageConfig();
            if (storageConfig.storageType === StorageType.LOCAL) {
                return await this.uploadRemoteFileToDisk(url, request, description, options);
            }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const pathConfig = this.createRemoteFileStoragePath(url, options);
            const multerFile = this.createMulterFileFromArrayBuffer(
                arrayBuffer,
                pathConfig.metadata.originalName,
                pathConfig.metadata.mimeType,
            );

            return this.uploadFile(multerFile, request, description, options);
        } catch (error) {
            throw HttpErrorFactory.internal(
                `Failed to upload remote file: ${error.message}`,
                BusinessCode.REQUEST_FAILED,
            );
        }
    }

    private getActiveStorageConfig(): Promise<StorageConfig> {
        return this.storageConfigRepo.findOne({ where: { isActive: true } });
    }

    /**
     * Delete file by ID
     *
     * @param id File ID
     * @param options Storage options
     */
    async deleteFileById(id: string, options?: FileStorageOptions): Promise<void> {
        const file = await this.findOneById(id);

        if (!file) {
            throw HttpErrorFactory.notFound("File not found");
        }

        // Delete physical file
        await this.fileStorageService.deleteFile(file.path, options);

        // Delete database record
        await this.delete(id);
    }

    /**
     * Get file physical path
     *
     * @param id File ID
     * @param options Storage options
     * @returns Full file path
     */
    async getFilePath(id: string, options?: FileStorageOptions): Promise<string> {
        const file = await this.findOneById(id);

        if (!file) {
            throw HttpErrorFactory.notFound("File not found");
        }

        return this.fileStorageService.getFullPath(file.path, options);
    }

    /**
     * Check if file exists
     *
     * @param id File ID
     * @param options Storage options
     * @returns True if file exists
     */
    async fileExists(id: string, options?: FileStorageOptions): Promise<boolean> {
        const file = await this.findOneById(id);

        if (!file) {
            return false;
        }

        return this.fileStorageService.fileExists(file.path, options);
    }

    /**
     * Create read stream for file
     *
     * @param id File ID
     * @param options Storage options
     * @returns File read stream or null
     */
    async createReadStream(id: string, options?: FileStorageOptions) {
        const file = await this.findOneById(id);

        if (!file) {
            throw HttpErrorFactory.notFound("File not found");
        }

        return this.fileStorageService.createReadStream(file.path, options);
    }

    private createRemoteFileStoragePath(url: string, options: FileStorageOptions) {
        // Parse URL to get file name
        const urlPath = new URL(url).pathname;
        const originalName = path.basename(urlPath) || "remote-file";

        // Determine MIME type (will be updated after download)
        const mimeType = mime.lookup(originalName) || "application/octet-stream";

        // Extract metadata
        const metadata = this.fileStorageService.extractMetadata(
            Buffer.from([]),
            originalName,
            mimeType,
        );

        const storagePath = this.fileStorageService.generateStoragePath(metadata, options);

        return {
            storagePath,
            metadata,
            presetUrl: "",
        };
    }

    private createMulterFileFromArrayBuffer(
        data: ArrayBuffer,
        filename: string,
        mimetype: string,
    ): Express.Multer.File {
        const buffer = Buffer.from(data);

        return {
            fieldname: "file",
            originalname: filename,
            encoding: "7bit",
            mimetype: mimetype,
            size: buffer.length,
            buffer: buffer,
            destination: "",
            filename: filename,
            path: "",
            stream: null as any,
        };
    }

    async createCloudStoragePath(
        params: { name: string; size: number },
        requestOrOptions?: Request | FileStorageOptions,
        options?: FileStorageOptions,
    ) {
        // Handle overloaded parameters
        let request: Request | undefined;
        let opts: FileStorageOptions | undefined;

        if (requestOrOptions && "originalUrl" in requestOrOptions) {
            request = requestOrOptions as Request;
            opts = options;
        } else {
            opts = requestOrOptions as FileStorageOptions | undefined;
        }

        const mimeType: string = mime.lookup(params.name) || "application/octet-stream";
        const extension = path.extname(params.name).replace(".", "").toLowerCase();
        const type = FileTypeDetector.detect(mimeType);
        const metadata: FileMetadata = {
            type,
            mimeType,
            extension,
            originalName: params.name,
            size: params.size,
        };

        // Get effective extensionId from options or request path
        const extensionId = request
            ? RequestUtil.getEffectiveExtensionId(request, opts?.extensionId)
            : opts?.extensionId;

        const storage = this.fileStorageService.generateStoragePath(metadata, opts);
        const urlPath = extensionId
            ? `${extensionId}/uploads/${storage.fullPath}`
            : `uploads/${storage.fullPath}`;
        const fileUrl = await this.fileUrlService.get(urlPath);

        // Rewrite storage.fullPath, it with '/uploads'
        const fullPath = urlPath;

        return {
            metadata,
            storage: { ...storage, fileUrl, fullPath },
            presetUrl: fileUrl,
        };
    }

    /**
     * Save OSS file record to database
     *
     * @param params OSS file information
     * @param request Express request object
     * @returns Upload result with file ID
     */
    async saveOSSFileRecord(
        params: {
            url: string;
            originalName: string;
            size: number;
            extension?: string;
            type?: string;
            description?: string;
            path?: string;
        },
        request: Request,
        extensionId?: string,
    ): Promise<UploadFileResult> {
        const clientIp = RequestUtil.getClientIP(request);
        const uploaderId = RequestUtil.getUploaderId(request);

        // Get effective extensionId from options or request path
        const effectiveExtensionId = RequestUtil.getEffectiveExtensionId(request, extensionId);

        // Determine MIME type and file type
        const mimeType =
            params.type || mime.lookup(params.originalName) || "application/octet-stream";
        const fileExtension =
            params.extension || path.extname(params.originalName).replace(".", "").toLowerCase();
        const fileType = FileTypeDetector.detect(mimeType);

        // Save to database
        const savedFile = await this.create({
            url: params.url,
            ip: clientIp,
            originalName: params.originalName,
            storageName: path.basename(params.path || params.url) || params.originalName,
            type: fileType,
            mimeType: mimeType,
            size: params.size,
            extension: fileExtension,
            path: params.path || params.url,
            description: params.description || null,
            uploaderId,
            extensionIdentifier: effectiveExtensionId || null,
        });

        return {
            id: savedFile.id,
            url: savedFile.url,
            originalName: savedFile.originalName,
            size: savedFile.size,
            mimeType: savedFile.mimeType,
            extension: savedFile.extension,
        };
    }
}
