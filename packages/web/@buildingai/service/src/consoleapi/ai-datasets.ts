/**
 * @fileoverview Console API service functions for AI datasets management
 * @description This file contains API functions for AI datasets management,
 * document processing, segment handling, team collaboration, and related type definitions for the console.
 *
 * @author BuildingAI Teams
 */

import type { BaseEntity, BaseQueryParams, Pagination, PaginationResult } from "../models/globals";

// ==================== Base Type Definitions ====================

/**
 * Dataset status enumeration
 * @description Status types for AI datasets
 */
export type DatasetStatus = "processing" | "completed" | "failed" | "pending";

/**
 * Retrieval mode enumeration
 * @description Retrieval mode types for knowledge base search
 */
export type RetrievalMode = "vector" | "fullText" | "hybrid";

/**
 * Processing status enumeration
 * @description Processing status types for documents and segments
 */
export type ProcessingStatus = "processing" | "completed" | "failed" | "pending";

/**
 * Team role enumeration
 * @description Role types for team members in datasets
 */
export type TeamRole = "owner" | "manager" | "editor" | "viewer";

// ==================== Configuration Types ====================

/**
 * Segmentation configuration interface
 * @description Configuration for document segmentation (consistent with backend)
 */
export interface SegmentationConfig {
    /** Segment identifier */
    segmentIdentifier: string;
    /** Maximum segment length */
    maxSegmentLength: number;
    /** Segment overlap length */
    segmentOverlap?: number;
}

/**
 * Sub-segmentation configuration interface
 * @description Configuration for sub-segmentation processing
 */
export interface SubSegmentationConfig {
    /** Segment identifier */
    segmentIdentifier: string;
    /** Maximum segment length */
    maxSegmentLength: number;
}

/**
 * Text preprocessing rules configuration interface
 * @description Configuration for text preprocessing rules
 */
export interface TextPreprocessingRules {
    /** Replace consecutive whitespace, newlines, and tabs */
    replaceConsecutiveWhitespace?: boolean;
    /** Remove all URLs and email addresses */
    removeUrlsAndEmails?: boolean;
}

/**
 * Weight configuration interface
 * @description Unified retrieval parameter configuration
 */
export interface WeightConfig {
    /** Semantic weight (used only in hybrid mode) */
    semanticWeight?: number;
    /** Keyword weight (used only in hybrid mode) */
    keywordWeight?: number;
}

/**
 * Rerank configuration interface
 * @description Configuration for reranking functionality
 */
export interface RerankConfig {
    /** Whether rerank is enabled */
    enabled?: boolean;
    /** Rerank model ID */
    modelId?: string;
}

/**
 * Unified retrieval configuration interface
 * @description Configuration for knowledge base retrieval
 */
export interface RetrievalConfig {
    /** Retrieval mode */
    retrievalMode: RetrievalMode;
    /** Hybrid retrieval strategy (used only in hybrid mode) */
    strategy?: "weighted_score" | "rerank";
    /** Number of results to return */
    topK?: number;
    /** Similarity threshold */
    scoreThreshold?: number;
    /** Whether threshold filtering is enabled */
    scoreThresholdEnabled?: boolean;
    /** Weight configuration (used only in hybrid mode) */
    weightConfig?: WeightConfig;
    /** Rerank configuration */
    rerankConfig?: RerankConfig;
}

/**
 * Indexing configuration interface
 * @description Configuration for document indexing
 */
export interface IndexingConfig {
    /** File ID list */
    fileIds: string[];
    /** Document processing mode */
    documentMode?: "normal" | "hierarchical";
    /** Parent context mode */
    parentContextMode?: "fullText" | "paragraph";
    /** Segmentation configuration */
    segmentation?: SegmentationConfig;
    /** Sub-segmentation configuration */
    subSegmentation?: SubSegmentationConfig;
    /** Text preprocessing rules */
    preprocessingRules?: TextPreprocessingRules;
}

// ==================== Entity Types ====================

/**
 * Dataset entity interface
 * @description Interface for AI dataset entities with all properties
 */
export interface Dataset extends BaseEntity {
    /** Dataset name */
    name: string;
    /** Dataset description */
    description?: string;
    /** Processing status */
    status: DatasetStatus;
    /** Retrieval mode */
    retrievalMode: RetrievalMode;
    /** Document count */
    documentCount: number;
    /** Chunk count */
    chunkCount: number;
    /** Storage size in MB */
    storageSize: number;
    /** Embedding model ID */
    embeddingModelId: string;
    /** Indexing configuration */
    indexingConfig: IndexingConfig;
    /** Retrieval configuration */
    retrievalConfig: RetrievalConfig;
    /** Creator user ID */
    createdBy: string;
    /** Extended metadata */
    metadata?: Record<string, any>;
    /** Related agent count */
    relatedAgentCount?: number;
}

/**
 * Dataset document entity interface
 * @description Interface for dataset document entities
 */
export interface DatasetDocument extends BaseEntity {
    /** Associated dataset ID */
    datasetId: string;
    /** File ID */
    fileId: string;
    /** File name */
    fileName: string;
    /** File type */
    fileType: string;
    /** File size in bytes */
    fileSize: number;
    /** Processing status */
    status: ProcessingStatus;
    /** Processing progress */
    progress: number;
    /** Error message */
    error?: string;
    /** Whether document is enabled */
    enabled: boolean;
    /** Character count */
    characterCount: number;
    /** Chunk count */
    chunkCount: number;
    /** Embedding model ID */
    embeddingModelId: string;
    /** Creator user ID */
    createdBy: string;
    /** Extended metadata */
    metadata?: Record<string, any>;
}

/**
 * Dataset segment entity interface
 * @description Interface for dataset segment entities
 */
export interface DatasetSegment extends BaseEntity {
    /** Associated dataset ID */
    datasetId: string;
    /** Associated document ID */
    documentId: string;
    /** Segment content */
    content: string;
    /** Segment index */
    chunkIndex: number;
    /** Content length */
    contentLength: number;
    /** Processing status */
    status: ProcessingStatus;
    /** Error message */
    error?: string;
    /** Vector embedding */
    embedding?: number[];
    /** Sub-segment content */
    children?: string[];
    /** Embedding model ID */
    embeddingModelId: string;
    /** Creator user ID */
    createdBy: string;
    /** Extended metadata */
    metadata?: Record<string, any>;
    /** Whether segment is enabled (1-enabled, 0-disabled) */
    enabled: number;
}

// ==================== Request/Response Types ====================

/**
 * Create dataset request parameters interface
 * @description Parameters for creating a new dataset
 */
export interface CreateDatasetParams {
    /** Dataset name */
    name: string;
    /** Dataset description */
    description: string;
    /** Indexing configuration */
    indexingConfig: IndexingConfig;
    /** Embedding model ID */
    embeddingModelId: string;
    /** Retrieval configuration */
    retrievalConfig: RetrievalConfig;
}

/**
 * Update dataset request parameters interface
 * @description Parameters for updating an existing dataset
 */
export type UpdateDatasetParams = Partial<Omit<CreateDatasetParams, "indexingConfig">>;

/**
 * Query dataset request parameters interface
 * @description Parameters for querying datasets with filters
 */
export interface QueryDatasetParams extends Pagination {
    /** Keyword search filter */
    keyword?: string;
    /** Whether to show all datasets */
    showAll?: boolean;
}

/**
 * Create document request parameters interface
 * @description Parameters for creating documents in a dataset
 */
export interface CreateDocumentParams {
    /** Associated dataset ID */
    datasetId: string;
    /** Custom document name */
    documentName?: string;
    /** Indexing configuration */
    indexingConfig: IndexingConfig;
}

/**
 * Query document request parameters interface
 * @description Parameters for querying documents with filters
 */
export interface QueryDocumentParams extends BaseQueryParams {
    /** Dataset ID filter */
    datasetId?: string;
    /** Status filter */
    status?: ProcessingStatus | null;
    /** File ID list filter (comma-separated string) */
    fileIds?: string | string[];
}

/**
 * Query segment request parameters interface
 * @description Parameters for querying segments with filters
 */
export interface QuerySegmentParams extends BaseQueryParams {
    /** Dataset ID filter */
    datasetId?: string;
    /** Document ID filter */
    documentId?: string;
    /** Status filter */
    status?: ProcessingStatus | null;
    /** Minimum content length */
    minContentLength?: number;
    /** Maximum content length */
    maxContentLength?: number;
}

/**
 * Create segment request parameters interface
 * @description Parameters for creating segments
 */
export interface CreateSegmentParams {
    /** Associated dataset ID */
    datasetId: string;
    /** Associated document ID */
    documentId: string;
    /** Segment content */
    content: string;
    /** Extended metadata */
    metadata?: Record<string, any>;
}

/**
 * Update segment request parameters interface
 * @description Parameters for updating segments
 */
export interface UpdateSegmentParams {
    /** Associated dataset ID */
    datasetId: string;
    /** Segment content */
    content: string;
    /** Extended metadata */
    metadata?: Record<string, any>;
}

/**
 * Query knowledge base request parameters interface
 * @description Parameters for querying knowledge base
 */
export interface QueryKnowledgeParams {
    /** Query text */
    query: string;
    /** Number of results to return */
    topK?: number;
    /** Similarity threshold */
    scoreThreshold?: number;
}

/**
 * Create document response result interface
 * @description Response structure for document creation
 */
export interface CreateDocumentResponse {
    /** Created document list */
    documents: DatasetDocument[];
    /** Creation count */
    createdCount: number;
    /** Total segment count */
    totalSegments: number;
    /** Processing time in milliseconds */
    processingTime: number;
}

/**
 * Segment result interface
 * @description Structure for segment results
 */
export interface SegmentResult {
    /** Segment index */
    index: number;
    /** Segment content */
    content: string;
    /** Content length */
    length: number;
}

/**
 * File segment result interface
 * @description Structure for file segment results
 */
export interface FileSegmentResult {
    /** File ID */
    fileId: string;
    /** File name */
    fileName: string;
    /** Segment count */
    segmentCount: number;
    /** Segment result list */
    segments: SegmentResult[];
}

/**
 * Indexing segments response result interface
 * @description Response structure for indexing segments
 */
export interface IndexingSegmentsResponse {
    /** Total segment count */
    totalSegments: number;
    /** File segment result list */
    fileResults: FileSegmentResult[];
    /** Processing time in milliseconds */
    processingTime: number;
    /** Number of processed files */
    processedFiles: number;
}

/**
 * Retrieval result interface
 * @description Structure for retrieval results
 */
export interface RetrievalResult {
    /** Segment ID */
    segmentId: string;
    /** Segment content */
    content: string;
    /** Similarity score */
    score: number;
    /** Document information */
    document: {
        /** Document ID */
        id: string;
        /** File name */
        fileName: string;
    };
    /** Dataset information */
    dataset: {
        /** Dataset ID */
        id: string;
        /** Dataset name */
        name: string;
    };
}

/**
 * Query knowledge base response result interface
 * @description Response structure for knowledge base queries
 */
export interface QueryKnowledgeResponse {
    /** Retrieval result list */
    results: RetrievalResult[];
    /** Retrieval time in milliseconds */
    retrievalTime: number;
    /** Retrieval mode used */
    retrievalMode: RetrievalMode;
}

/**
 * Dataset chunk interface
 * @description Type for retrieval segment details (for frontend popup display)
 */
export interface DatasetChunk {
    /** Chunk ID */
    id: string;
    /** Chunk content */
    content: string;
    /** Similarity score */
    score: number;
    /** Chunk metadata */
    metadata?: Record<string, unknown>;
    /** Source information */
    sources?: string[];
    /** Chunk index */
    chunkIndex?: number;
    /** Content length */
    contentLength?: number;
    /** File name */
    fileName?: string;
    /** Highlighted content */
    highlight?: string;
}

// ==================== Team Member Types ====================

/**
 * Team member entity interface
 * @description Interface for team member entities in datasets
 */
export interface TeamMember extends BaseEntity {
    /** Whether user can operate */
    canOperate: boolean;
    /** Whether this is the current user */
    oneself: boolean;
    /** Whether current user is dataset owner */
    isCurrentUserOwner: boolean;
    /** Dataset ID */
    datasetId: string;
    /** User ID */
    userId: string;
    /** Team role */
    role: TeamRole;
    /** Join time */
    createdAt: string;
    /** Inviter user ID */
    invitedBy?: string;
    /** Last active time */
    lastActiveAt?: string;
    /** Whether member is active */
    isActive: boolean;
    /** Note information */
    note?: string;
    /** User information */
    user?: {
        /** User ID */
        id: string;
        /** Username */
        username: string;
        /** Email address */
        email?: string;
        /** User avatar */
        avatar?: string;
        /** User nickname */
        nickname?: string;
    };
    /** Inviter information */
    inviter?: {
        /** Inviter ID */
        id: string;
        /** Inviter username */
        username: string;
        /** Inviter nickname */
        nickname?: string;
    };
}

/**
 * Add team member request parameters interface
 * @description Parameters for adding team members
 */
export interface AddTeamMemberParams {
    /** Dataset ID */
    datasetId: string;
    /** User ID */
    userId: string;
    /** Team role */
    role: TeamRole;
    /** Note information */
    note?: string;
}

/**
 * Update team member role request parameters interface
 * @description Parameters for updating team member roles
 */
export interface UpdateTeamMemberRoleParams {
    /** Member ID */
    memberId: string;
    /** New team role */
    role: TeamRole;
    /** Note information */
    note?: string;
}

/**
 * Remove team member request parameters interface
 * @description Parameters for removing team members
 */
export interface RemoveTeamMemberParams {
    /** Member ID */
    memberId: string;
}

/**
 * Query team member request parameters interface
 * @description Parameters for querying team members with filters
 */
export interface QueryTeamMemberParams extends BaseQueryParams {
    /** Dataset ID */
    datasetId: string;
    /** Role filter */
    role?: TeamRole;
    /** Username search */
    username?: string;
    /** Active status filter */
    isActive?: boolean;
}

/**
 * Transfer ownership request parameters interface
 * @description Parameters for transferring dataset ownership
 */
export interface TransferOwnershipParams {
    /** Dataset ID */
    datasetId: string;
    /** New owner user ID */
    newOwnerId: string;
}

/**
 * Batch team member operation request parameters interface
 * @description Parameters for batch operations on team members
 */
export interface BatchTeamMemberOperationParams {
    /** Member ID list */
    memberIds: string[];
    /** Operation type */
    operation: "remove" | "update_role" | "toggle_active";
    /** New role (required only when operation type is update_role) */
    newRole?: TeamRole;
}

/**
 * User role check response interface
 * @description Response structure for user role checks
 */
export interface UserRoleResponse {
    /** User role */
    role: string | null;
    /** Whether user is active */
    isActive: boolean;
}

/**
 * Membership check response interface
 * @description Response structure for membership checks
 */
export interface MembershipCheckResponse {
    /** Whether user is a member */
    isMember: boolean;
    /** User role */
    role?: string;
}

// ==================== Dataset Related APIs ====================

/**
 * Create dataset
 * @description Create a new AI dataset with specified configuration
 * @param data Dataset creation data
 * @returns Promise with created dataset information
 */
export function apiCreateDataset(data: CreateDatasetParams): Promise<Dataset> {
    return useConsolePost("/ai-datasets/create", data);
}

/**
 * Create empty dataset
 * @description Create an empty dataset with only name and description
 * @param data Dataset creation data (only name and description required)
 * @returns Promise with created dataset information
 */
export function apiCreateEmptyDataset(data: {
    name: string;
    description?: string;
    embeddingModelId: string;
}): Promise<Dataset> {
    return useConsolePost("/ai-datasets/create-empty", data);
}

/**
 * Get dataset list
 * @description Get paginated list of datasets based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated dataset list result
 */
export function apiGetDatasetList(params: QueryDatasetParams): Promise<PaginationResult<Dataset>> {
    return useConsoleGet("/ai-datasets", params, { requireAuth: true });
}

/**
 * Get dataset detail
 * @description Get detailed dataset information by dataset ID
 * @param id Dataset ID
 * @returns Promise with dataset detail information
 */
export function apiGetDatasetDetail(id: string): Promise<Dataset> {
    return useConsoleGet(`/ai-datasets/${id}`);
}

/**
 * Update dataset settings
 * @description Update dataset configuration settings by dataset ID
 * @param id Dataset ID
 * @param data Update data
 * @returns Promise with updated dataset information
 */
export function apiUpdateDataset(id: string, data: UpdateDatasetParams): Promise<Dataset> {
    return useConsolePatch(`/ai-datasets/${id}/update`, data);
}

/**
 * Delete dataset
 * @description Delete specified dataset by dataset ID
 * @param id Dataset ID
 * @returns Promise with deletion result
 */
export function apiDeleteDataset(id: string): Promise<{ success: boolean }> {
    return useConsoleDelete(`/ai-datasets/${id}`);
}

/**
 * Retry dataset vectorization
 * @description Retry vectorization for all failed documents in the dataset
 * @param id Dataset ID
 * @returns Promise with operation result
 */
export function apiRetryDataset(id: string): Promise<{ success: boolean }> {
    return useConsolePost(`/ai-datasets/${id}/retry`);
}

/**
 * Query dataset
 * @description Query knowledge base for retrieval results
 * @param id Dataset ID
 * @param data Query parameters
 * @returns Promise with retrieval results
 */
export function apiQueryDataset(id: string, data: QueryKnowledgeParams): Promise<any> {
    return useConsolePost(`/ai-datasets/${id}/query`, data);
}

/**
 * Retrieval test
 * @description Test retrieval functionality with specified parameters
 * @param id Dataset ID
 * @param data Retrieval test parameters
 * @returns Promise with retrieval test results
 */
export function apiRetrievalTest(
    id: string,
    data: { query: string; retrievalConfig?: RetrievalConfig },
): Promise<{ chunks: DatasetChunk[]; totalTime: number }> {
    return useConsolePost(`/ai-datasets/${id}/retrieval-test`, data, { requireAuth: true });
}

/**
 * Indexing segments
 * @description Process dataset segmentation and cleaning
 * @param data Segmentation parameters
 * @returns Promise with segmentation processing results
 */
export function apiIndexingSegments(data: any): Promise<IndexingSegmentsResponse> {
    return useConsolePost("/ai-datasets/indexing-segments", data);
}

// ==================== Document Related APIs ====================

/**
 * Create document
 * @description Create documents in a dataset
 * @param data Document creation data
 * @returns Promise with created document information
 */
export function apiCreateDocument(data: CreateDocumentParams): Promise<CreateDocumentResponse> {
    return useConsolePost("/ai-datasets-documents/create", data);
}

/**
 * Get document list
 * @description Get paginated list of documents based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated document list result
 */
export function apiGetDocumentList(
    params: QueryDocumentParams,
): Promise<PaginationResult<DatasetDocument[]>> {
    return useConsoleGet("/ai-datasets-documents", params, { requireAuth: true });
}

/**
 * Get all document list
 * @description Get all documents for a specific dataset
 * @param datasetsId Dataset ID
 * @returns Promise with document list
 */
export function apiGetAllDocumentList(datasetsId: string): Promise<DatasetDocument[]> {
    return useConsoleGet("/ai-datasets-documents/all", { datasetsId }, { requireAuth: true });
}

/**
 * Retry document vectorization
 * @description Retry vectorization for all failed segments in the document
 * @param id Document ID
 * @returns Promise with operation result
 */
export function apiRetryDocument(id: string): Promise<{ success: boolean }> {
    return useConsolePost(`/ai-datasets-documents/${id}/retry`);
}

/**
 * Get document detail
 * @description Get detailed document information by document ID
 * @param id Document ID
 * @returns Promise with document detail information
 */
export function apiGetDocumentDetail(id: string): Promise<DatasetDocument> {
    return useConsoleGet(`/ai-datasets-documents/${id}`);
}

/**
 * Rename document
 * @description Rename a document
 * @param id Document ID
 * @param data Rename data
 * @returns Promise with updated document information
 */
export function apiRenameDocument(
    id: string,
    data: { fileName: string; datasetId: string },
): Promise<DatasetDocument> {
    return useConsolePatch(`/ai-datasets-documents/${id}/rename`, data, { requireAuth: true });
}

/**
 * Delete document
 * @description Delete specified document by document ID
 * @param id Document ID
 * @param datasetId Dataset ID
 * @returns Promise with deletion result
 */
export function apiDeleteDocument(id: string, datasetId: string): Promise<{ success: boolean }> {
    return useConsoleDelete(`/ai-datasets-documents/${id}`, { datasetId });
}

/**
 * Set document enabled status
 * @description Set document enabled/disabled status
 * @param id Document ID
 * @param enabled Whether to enable the document
 * @param datasetId Dataset ID
 * @returns Promise with operation result
 */
export function apiSetDocumentEnabled(
    id: string,
    enabled: boolean,
    datasetId: string,
): Promise<{ success: boolean }> {
    return useConsolePatch(`/ai-datasets-documents/${id}/enabled`, { enabled, datasetId });
}

// ==================== Segment Related APIs ====================

/**
 * Create segment
 * @description Create segments in a dataset
 * @param data Segment creation data
 * @returns Promise with created segment information
 */
export function apiCreateSegment(data: CreateSegmentParams): Promise<DatasetSegment> {
    return useConsolePost("/ai-datasets-segments", data);
}

/**
 * Get segment list
 * @description Get paginated list of segments based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated segment list result
 */
export function apiGetSegmentList(
    params: QuerySegmentParams,
): Promise<PaginationResult<DatasetSegment[]>> {
    return useConsoleGet("/ai-datasets-segments", params, { requireAuth: true });
}

/**
 * Get segment detail
 * @description Get detailed segment information by segment ID
 * @param id Segment ID
 * @returns Promise with segment detail information
 */
export function apiGetSegmentDetail(id: string): Promise<DatasetSegment> {
    return useConsoleGet(`/ai-datasets-segments/${id}`);
}

/**
 * Update segment
 * @description Update segment content and metadata
 * @param id Segment ID
 * @param data Update data
 * @returns Promise with updated segment information
 */
export function apiUpdateSegment(id: string, data: UpdateSegmentParams): Promise<DatasetSegment> {
    return useConsolePatch(`/ai-datasets-segments/${id}`, data);
}

/**
 * Delete segment
 * @description Delete specified segment by segment ID
 * @param id Segment ID
 * @param datasetId Dataset ID
 * @returns Promise with deletion result
 */
export function apiDeleteSegment(id: string, datasetId: string): Promise<{ success: boolean }> {
    return useConsoleDelete(`/ai-datasets-segments/${id}`, { datasetId });
}

/**
 * Batch delete segments
 * @description Delete multiple segments by segment ID array
 * @param ids Array of segment IDs
 * @param datasetId Dataset ID
 * @returns Promise with batch deletion result
 */
export function apiBatchDeleteSegments(
    ids: string[],
    datasetId: string,
): Promise<{ success: boolean }> {
    return useConsolePost("/ai-datasets-segments/batch-delete", { ids, datasetId });
}

/**
 * Set segment enabled status
 * @description Set single segment enabled/disabled status
 * @param id Segment ID
 * @param enabled 1-enabled, 0-disabled
 * @returns Promise with operation result
 */
export function apiSetSegmentEnabled(id: string, enabled: number): Promise<{ success: boolean }> {
    return useConsolePatch(`/ai-datasets-segments/${id}/enabled`, { enabled });
}

/**
 * Batch set segment enabled status
 * @description Set multiple segments enabled/disabled status
 * @param ids Array of segment IDs
 * @param enabled 1-enabled, 0-disabled
 * @returns Promise with batch operation result
 */
export function apiBatchSetSegmentEnabled(
    ids: string[],
    enabled: number,
): Promise<{ success: boolean }> {
    return useConsolePost(`/ai-datasets-segments/batch-enabled`, { ids, enabled });
}

// ==================== Team Member Related APIs ====================

/**
 * Add team member
 * @description Add a new member to the dataset team
 * @param data Add member parameters
 * @returns Promise with added member information
 */
export function apiAddTeamMember(data: AddTeamMemberParams): Promise<TeamMember> {
    return useConsolePost("/ai-datasets-team-members", data);
}

/**
 * Update team member role
 * @description Update team member role and permissions
 * @param data Update role parameters
 * @returns Promise with updated member information
 */
export function apiUpdateTeamMemberRole(data: UpdateTeamMemberRoleParams): Promise<TeamMember> {
    return useConsolePut("/ai-datasets-team-members/role", data);
}

/**
 * Remove team member
 * @description Remove a member from the dataset team
 * @param data Remove member parameters
 * @returns Promise with operation result
 */
export function apiRemoveTeamMember(data: RemoveTeamMemberParams): Promise<{ message: string }> {
    return useConsoleDelete("/ai-datasets-team-members", data);
}

/**
 * Get team member list
 * @description Get paginated list of team members based on query conditions
 * @param params Query parameters
 * @returns Promise with paginated team member list result
 */
export function apiGetTeamMembers(
    params: QueryTeamMemberParams,
): Promise<PaginationResult<TeamMember[]>> {
    return useConsoleGet("/ai-datasets-team-members", params, { requireAuth: true });
}

/**
 * Get team member detail
 * @description Get detailed team member information by member ID
 * @param memberId Member ID
 * @returns Promise with team member detail information
 */
export function apiGetTeamMemberDetail(memberId: string): Promise<TeamMember> {
    return useConsoleGet(`/ai-datasets-team-members/${memberId}`);
}

/**
 * Transfer dataset ownership
 * @description Transfer dataset ownership to another user
 * @param data Transfer ownership parameters
 * @returns Promise with operation result
 */
export function apiTransferOwnership(data: TransferOwnershipParams): Promise<{ message: string }> {
    return useConsolePut("/ai-datasets-team-members/ownership/transfer", data);
}

/**
 * Batch team member operation
 * @description Perform batch operations on team members
 * @param data Batch operation parameters
 * @returns Promise with operation result
 */
export function apiBatchTeamMemberOperation(
    data: BatchTeamMemberOperationParams,
): Promise<{ message: string }> {
    return useConsolePut("/ai-datasets-team-members/batch", data);
}

/**
 * Get user role
 * @description Get user's role in the dataset
 * @param datasetId Dataset ID
 * @returns Promise with user role information
 */
export function apiGetUserRole(datasetId: string): Promise<UserRoleResponse> {
    return useConsoleGet(`/ai-datasets-team-members/role/${datasetId}`);
}

/**
 * Check membership
 * @description Check if user is a member of the dataset
 * @param datasetId Dataset ID
 * @returns Promise with membership check result
 */
export function apiCheckMembership(datasetId: string): Promise<MembershipCheckResponse> {
    return useConsoleGet(`/ai-datasets-team-members/check/${datasetId}`);
}

/**
 * Batch add team members
 * @description Add multiple members to the dataset team
 * @param data Batch add member parameters
 * @returns Promise with added member information list
 */
export function apiBatchAddTeamMembers(data: {
    datasetId: string;
    members: Array<{
        userId: string;
        role: TeamRole;
        note?: string;
    }>;
}): Promise<TeamMember[]> {
    return useConsolePost("/ai-datasets-team-members/batch", data);
}
