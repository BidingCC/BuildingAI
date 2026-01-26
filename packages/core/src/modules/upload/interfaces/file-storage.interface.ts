import type { FileType } from "@buildingai/db/entities";

/**
 * File storage path result
 */
export interface FileStoragePath {
    /**
     * Relative storage path (e.g., "image/2024/11")
     */
    path: string;

    /**
     * Generated file name with extension
     */
    fileName: string;

    /**
     * Full path combining path and fileName
     */
    fullPath: string;
}

/**
 * File metadata for storage
 */
export interface FileMetadata {
    /**
     * Original file name
     */
    originalName: string;

    /**
     * File MIME type
     */
    mimeType: string;

    /**
     * File size in bytes
     */
    size: number;

    /**
     * File extension without dot
     */
    extension: string;

    /**
     * File type category
     */
    type: FileType;
}

/**
 * File storage options
 */
export interface FileStorageOptions {
    /**
     * Custom storage root directory
     */
    storageRoot?: string;

    /**
     * Whether to organize files by type
     */
    organizeByType?: boolean;

    /**
     * Whether to organize files by date
     */
    organizeByDate?: boolean;

    /**
     * Extension Identifier
     */
    extensionId?: string;
}

/**
 * Remote file download options
 */
export interface RemoteFileOptions {
    /**
     * Remote file URL
     */
    url: string;

    /**
     * Request timeout in milliseconds
     */
    timeout?: number;

    /**
     * Maximum file size in bytes
     */
    maxSize?: number;
}
