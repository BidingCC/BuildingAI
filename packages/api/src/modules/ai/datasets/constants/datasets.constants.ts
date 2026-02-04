import type { SegmentationOptions } from "../interfaces/vectorization.interface";

export const DATASETS_DEFAULT_CONSTANTS = {
    DEFAULT_TOP_K: 3,
    DEFAULT_SCORE_THRESHOLD: 0.5,
    DEFAULT_SEMANTIC_WEIGHT: 0.7,
    DEFAULT_KEYWORD_WEIGHT: 0.3,
} as const;

export const DEFAULT_SEGMENTATION_OPTIONS: SegmentationOptions = {
    segmentIdentifier: "\n\n",
    maxSegmentLength: 500,
    segmentOverlap: 50,
    mode: "automatic",
    separators: ["\n\n", "。", ". ", " ", ""],
    keepSeparator: true,
    replaceConsecutiveWhitespace: true,
    removeUrlsAndEmails: false,
};
