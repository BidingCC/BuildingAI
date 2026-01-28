/**
 * @fileoverview Global type definitions and base interfaces
 * @description Defines common data structures and base types used across the application
 *
 * @author BuildingAI Teams
 */

/** Base entity fields interface */
export interface BaseEntity {
    /** Primary key ID */
    id: string;
    /** Creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
    /** Deletion timestamp (soft delete) */
    deletedAt?: string;
}

/** Base create request type - excludes auto-generated fields */
export type BaseCreateRequest<T extends BaseEntity> = Omit<
    T,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

/** Base update request type - makes all fields optional but ID required */
export type BaseUpdateRequest<T extends BaseEntity> = Partial<BaseCreateRequest<T>> & {
    id?: string;
};

/** Pagination request parameters */
export interface Pagination {
    /** Current page number, starting from 1 */
    page?: number;
    /** Number of items per page */
    pageSize?: number;
    /** Optional: other query parameters */
    [key: string]: any;
}

/** Pagination result interface */
export interface PaginationResult<T> {
    /** Data items list */
    items: T[];
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Number of items per page */
    pageSize: number;
    /** Total number of pages */
    totalPages: number;
}

/** Pagination result interface with extend data */
export interface PaginationResultWithExtend<T, E> {
    /** Data items list */
    items: T[];
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Number of items per page */
    pageSize: number;
    /** Total number of pages */
    totalPages: number;
    /** Extend data */
    extend: E;
}

/** Base query parameters interface */
export interface BaseQueryParams extends Pagination {
    /** Keyword search */
    keyword?: string;
    /** Creation date range - start */
    startDate?: string;
    /** Creation date range - end */
    endDate?: string;
}

/** Chat window style */
export type ChatWindowStyle = "conversation" | "document";

/** File upload status enumeration */
export type FileUploadStatus = "pending" | "uploading" | "success" | "error";

/** File item interface */
export interface FileItem {
    /** Original file name */
    originalName?: string;
    /** Storage file name */
    storageName?: string;
    /** File type */
    type?: "document" | "image" | "video";
    /** MIME type */
    mimeType?: string;
    /** File size in bytes */
    size?: number;
    /** File extension */
    extension?: string;
    /** File path */
    path?: string;
    /** File access URL */
    url?: string;
    /** File description */
    description?: string | null;
    /** Uploader ID */
    uploaderId?: string | null;
    /** File ID */
    id?: string;
    /** Creation timestamp */
    createdAt?: string;
    /** Last update timestamp */
    updatedAt?: string;
    /** Original file object (used during upload process) */
    file?: File;
    /** Upload status */
    status?: FileUploadStatus;
    /** Upload progress (0-100) */
    progress?: number;
    /** Error message */
    error?: string;
    /** Other extended properties */
    [index: string]: any;
}

/** Model classification constants object */
export const MODEL_TYPES = {
    /**
     * Large Language Model
     * General-purpose language model for natural language processing, conversation generation, and other tasks
     */
    LLM: "llm",

    /**
     * Content Moderation Model
     * Used for detecting and filtering harmful, inappropriate, or violating content
     */
    MODERATION: "moderation",

    /**
     * Reranking Model
     * Used for relevance ranking of search results or documents
     */
    RERANK: "rerank",

    /**
     * Speech-to-Text Model
     * Converts speech content to text format
     */
    SPEECH_TO_TEXT: "speech2text",

    /**
     * Text Embedding Model
     * Converts text to vector representation for semantic search and other tasks
     */
    TEXT_EMBEDDING: "text-embedding",

    /**
     * Text-to-Speech Model
     * Converts text content to natural speech
     */
    TTS: "tts",
} as const;

/** Model classification type */
export type ModelType = (typeof MODEL_TYPES)[keyof typeof MODEL_TYPES];
