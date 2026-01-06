export class AISDKError extends Error {
    readonly code: string;
    readonly provider?: string;
    readonly cause?: Error;
    readonly data?: Record<string, unknown>;

    constructor(options: {
        message: string;
        code: string;
        provider?: string;
        cause?: Error;
        data?: Record<string, unknown>;
    }) {
        super(options.message);
        this.name = "AISDKError";
        this.code = options.code;
        this.provider = options.provider;
        this.cause = options.cause;
        this.data = options.data;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            provider: this.provider,
            data: this.data,
            cause: this.cause?.message,
        };
    }
}

export class ProviderCapabilityError extends AISDKError {
    readonly capability: ProviderCapability;

    constructor(provider: string, capability: ProviderCapability) {
        super({
            message: `Provider "${provider}" does not support "${capability}" capability`,
            code: "PROVIDER_CAPABILITY_NOT_SUPPORTED",
            provider,
            data: { capability },
        });
        this.name = "ProviderCapabilityError";
        this.capability = capability;
    }
}

export type ProviderCapability =
    | "language"
    | "embedding"
    | "speech"
    | "transcription"
    | "image"
    | "moderation"
    | "rerank";

export class ProviderNotFoundError extends AISDKError {
    constructor(providerName: string) {
        super({
            message: `Provider "${providerName}" is not registered`,
            code: "PROVIDER_NOT_FOUND",
            data: { providerName },
        });
        this.name = "ProviderNotFoundError";
    }
}

export class ModelNotFoundError extends AISDKError {
    readonly modelId: string;

    constructor(provider: string, modelId: string) {
        super({
            message: `Model "${modelId}" not found in provider "${provider}"`,
            code: "MODEL_NOT_FOUND",
            provider,
            data: { modelId },
        });
        this.name = "ModelNotFoundError";
        this.modelId = modelId;
    }
}

export class APIError extends AISDKError {
    readonly statusCode?: number;
    readonly responseBody?: string;

    constructor(options: {
        message: string;
        provider?: string;
        statusCode?: number;
        responseBody?: string;
        cause?: Error;
    }) {
        super({
            message: options.message,
            code: "API_ERROR",
            provider: options.provider,
            cause: options.cause,
            data: {
                statusCode: options.statusCode,
                responseBody: options.responseBody,
            },
        });
        this.name = "APIError";
        this.statusCode = options.statusCode;
        this.responseBody = options.responseBody;
    }
}

export class AuthenticationError extends AISDKError {
    constructor(provider: string, message?: string) {
        super({
            message: message || `Authentication failed for provider "${provider}"`,
            code: "AUTHENTICATION_ERROR",
            provider,
        });
        this.name = "AuthenticationError";
    }
}

export class RateLimitError extends AISDKError {
    readonly retryAfter?: number;

    constructor(provider: string, retryAfter?: number) {
        super({
            message: `Rate limit exceeded for provider "${provider}"${retryAfter ? `, retry after ${retryAfter}ms` : ""}`,
            code: "RATE_LIMIT_ERROR",
            provider,
            data: { retryAfter },
        });
        this.name = "RateLimitError";
        this.retryAfter = retryAfter;
    }
}

export class ConfigurationError extends AISDKError {
    constructor(message: string, provider?: string) {
        super({
            message,
            code: "CONFIGURATION_ERROR",
            provider,
        });
        this.name = "ConfigurationError";
    }
}

export function isAISDKError(error: unknown): error is AISDKError {
    return error instanceof AISDKError;
}

export function isProviderCapabilityError(error: unknown): error is ProviderCapabilityError {
    return error instanceof ProviderCapabilityError;
}

export function isAPIError(error: unknown): error is APIError {
    return error instanceof APIError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
    return error instanceof RateLimitError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
}
