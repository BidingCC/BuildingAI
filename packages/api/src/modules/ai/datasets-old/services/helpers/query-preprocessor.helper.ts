import { Injectable, Logger } from "@nestjs/common";
import { Jieba } from "@node-rs/jieba";

/**
 * Query preprocessor constants
 */
const QUERY_PREPROCESSOR_CONSTANTS = {
    /** Maximum tokens to use in full-text search */
    MAX_TOKENS: 3,
    /** Token validation regex (Chinese, English, numbers) */
    TOKEN_VALIDATION_REGEX: /[\u4e00-\u9fa5a-zA-Z0-9]/,
} as const;

/**
 * Query preprocessor service
 *
 * Handles query text preprocessing including Chinese word segmentation (jieba)
 * and full-text search query formatting.
 */
@Injectable()
export class QueryPreprocessor {
    private readonly logger = new Logger(QueryPreprocessor.name);
    private readonly jieba: Jieba;

    constructor() {
        try {
            this.jieba = new Jieba();
            this.logger.log("Jieba word segmentation initialized successfully");
        } catch (error) {
            this.logger.error(`Failed to initialize Jieba: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Segment Chinese text using jieba
     *
     * Uses full mode for better word group recognition (e.g., "黄彪" as a name).
     *
     * @param query - Query text to segment
     * @returns Segmented text with spaces
     */
    segment(query: string): string {
        try {
            return this.jieba.cut(query, true).join(" ");
        } catch (error) {
            this.logger.warn(`Jieba segmentation failed: ${error.message}`);
            return query; // Fallback to original query
        }
    }

    /**
     * Preprocess query for PostgreSQL full-text search
     *
     * 1. Segment Chinese text using jieba
     * 2. Filter valid tokens (Chinese, English, numbers)
     * 3. Limit token count for performance
     * 4. Join with '&' for PostgreSQL tsquery
     *
     * @param query - Raw query text
     * @returns Preprocessed query for tsquery
     */
    preprocessForFullText(query: string): string {
        const segmented = this.segment(query);

        const tokens = segmented
            .split(" ")
            .filter(
                (token) =>
                    token.length >= 1 &&
                    QUERY_PREPROCESSOR_CONSTANTS.TOKEN_VALIDATION_REGEX.test(token),
            )
            .slice(0, QUERY_PREPROCESSOR_CONSTANTS.MAX_TOKENS);

        return tokens.length > 0 ? tokens.join(" & ") : query;
    }
}
