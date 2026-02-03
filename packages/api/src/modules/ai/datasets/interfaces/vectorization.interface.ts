/**
 * 向量化队列 Job 负载（与 core JobType 对齐）
 */
export interface VectorizationJobPayload {
    type: "document" | "dataset";
    params:
        | {
              documentId: string;
              datasetId?: string;
          }
        | {
              documentId?: string;
              datasetId: string;
          };
}

/**
 * 进度回调：已处理数、总数、百分比
 */
export type VectorizationProgressCallback = (
    processed: number,
    total: number,
    percentage: number,
) => void | Promise<void>;

/**
 * 单文档向量化结果
 */
export interface VectorizationResult {
    success: boolean;
    documentId: string;
    totalSegments: number;
    successCount: number;
    failureCount: number;
    processingTime: number;
    finalStatus: string;
}

/**
 * 分段配置（与 indexing 逻辑一致）
 */
export interface SegmentationOptions {
    /** 分段标识符，如 \n 或句号等 */
    segmentIdentifier: string;
    /** 最大分段长度 */
    maxSegmentLength: number;
    /** 分段重叠长度 */
    segmentOverlap: number;
    /** 是否替换连续空白 */
    replaceConsecutiveWhitespace?: boolean;
    /** 是否移除 URL 和邮箱 */
    removeUrlsAndEmails?: boolean;
}

/**
 * 分段输入（用于写入 Segment 前的中间结构）
 */
export interface SegmentInput {
    content: string;
    index: number;
    length: number;
    children?: Array<{ content: string; index: number; length: number }>;
}
