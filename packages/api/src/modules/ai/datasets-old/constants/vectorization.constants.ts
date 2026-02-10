/**
 * Vectorization configuration
 */
export const VECTORIZATION_CONFIG = {
    /** Default batch size for vectorization */
    DEFAULT_BATCH_SIZE: 10,

    /** Maximum batch size */
    MAX_BATCH_SIZE: 50,

    /** Minimum batch size */
    MIN_BATCH_SIZE: 1,

    /** Progress update interval (percentage) */
    PROGRESS_UPDATE_INTERVAL: 10,

    /** Default timeout for embedding API calls (ms) */
    DEFAULT_TIMEOUT: 30000,

    /** Maximum concurrent requests */
    MAX_CONCURRENT_REQUESTS: 3,
} as const;

/**
 * Retry strategy configuration
 */
export const RETRY_STRATEGY = {
    /** Transient errors: quick retry with exponential backoff */
    TRANSIENT: {
        maxAttempts: 3,
        backoffType: "exponential" as const,
        initialDelay: 1000,
        maxDelay: 10000,
    },

    /** Rate limit errors: slower retry with linear backoff */
    RATE_LIMIT: {
        maxAttempts: 5,
        backoffType: "linear" as const,
        initialDelay: 5000,
        maxDelay: 30000,
    },

    /** Fatal errors: no retry */
    FATAL: {
        maxAttempts: 0,
        backoffType: "none" as const,
        initialDelay: 0,
        maxDelay: 0,
    },
} as const;

/**
 * Error type classification
 */
export enum VectorizationErrorType {
    /** Transient network or API errors */
    TRANSIENT = "transient",

    /** Rate limit exceeded */
    RATE_LIMIT = "rate_limit",

    /** Invalid model configuration */
    INVALID_MODEL = "invalid_model",

    /** Invalid input data */
    INVALID_INPUT = "invalid_input",

    /** Model not found or unavailable */
    MODEL_NOT_FOUND = "model_not_found",

    /** Authentication failed */
    AUTH_FAILED = "auth_failed",

    /** Unknown or fatal error */
    FATAL = "fatal",
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(errorType: VectorizationErrorType): boolean {
    return (
        errorType === VectorizationErrorType.TRANSIENT ||
        errorType === VectorizationErrorType.RATE_LIMIT
    );
}

/**
 * Get retry strategy for error type
 */
export function getRetryStrategy(errorType: VectorizationErrorType) {
    switch (errorType) {
        case VectorizationErrorType.TRANSIENT:
            return RETRY_STRATEGY.TRANSIENT;
        case VectorizationErrorType.RATE_LIMIT:
            return RETRY_STRATEGY.RATE_LIMIT;
        default:
            return RETRY_STRATEGY.FATAL;
    }
}

/**
 * Classify error by type
 */
export function classifyError(error: Error): VectorizationErrorType {
    const message = error.message?.toLowerCase() || "";

    // Rate limit patterns
    if (
        message.includes("rate limit") ||
        message.includes("too many requests") ||
        message.includes("429")
    ) {
        return VectorizationErrorType.RATE_LIMIT;
    }

    // Auth errors
    if (
        message.includes("unauthorized") ||
        message.includes("invalid api key") ||
        message.includes("401") ||
        message.includes("403")
    ) {
        return VectorizationErrorType.AUTH_FAILED;
    }

    // Model errors
    if (message.includes("model not found") || message.includes("invalid model")) {
        return VectorizationErrorType.MODEL_NOT_FOUND;
    }

    // Input validation errors
    if (message.includes("invalid input") || message.includes("validation")) {
        return VectorizationErrorType.INVALID_INPUT;
    }

    // Network/timeout errors
    if (
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("econnrefused") ||
        message.includes("network")
    ) {
        return VectorizationErrorType.TRANSIENT;
    }

    // Default to fatal
    return VectorizationErrorType.FATAL;
}
