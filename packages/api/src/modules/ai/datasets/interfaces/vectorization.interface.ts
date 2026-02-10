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

export type VectorizationProgressCallback = (
    processed: number,
    total: number,
    percentage: number,
) => void | Promise<void>;

export interface VectorizationResult {
    success: boolean;
    documentId: string;
    totalSegments: number;
    successCount: number;
    failureCount: number;
    processingTime: number;
    finalStatus: string;
}

export interface SegmentationOptions {
    segmentIdentifier: string;
    maxSegmentLength: number;
    segmentOverlap: number;
    mode?: "automatic" | "fixed";
    fixedSeparator?: string;
    separators?: string[];
    keepSeparator?: boolean;
    replaceConsecutiveWhitespace?: boolean;
    removeUrlsAndEmails?: boolean;
}

export interface SegmentInput {
    content: string;
    index: number;
    length: number;
    children?: Array<{ content: string; index: number; length: number }>;
}
