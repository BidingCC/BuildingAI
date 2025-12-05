/**
 * @fileoverview Common Types
 * @description Platform-agnostic type definitions
 *
 * @author BuildingAI Teams
 */

import type { HttpMethod, ResponseSchema } from "@buildingai/types";

/**
 * Request configuration for strategy
 */
export interface RequestConfig {
    url: string;
    method: HttpMethod;
    baseURL: string;
    timeout: number;
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

/**
 * Response from strategy
 */
export interface StrategyResponse<T> {
    headers: Headers;
    data: T;
    status: number;
}

/**
 * Request strategy interface
 * Platform-specific implementations must implement this interface
 */
export interface RequestStrategy {
    /**
     * Execute HTTP request
     * @param config Request configuration
     * @returns Promise with response data and status
     */
    request<T>(config: RequestConfig): Promise<StrategyResponse<T>>;
}

/**
 * Error handler interface
 * Platform-specific implementations must implement this interface
 */
export interface ErrorHandler {
    /**
     * Show error message
     * @param message Error message
     * @param title Optional error title
     */
    showError(message: string, title?: string): void;

    /**
     * Handle login redirect
     */
    handleLogin(): void;

    /**
     * Handle complete error flow
     * @param status HTTP status code
     * @param response Response data
     * @param skipBusinessCheck Whether to skip business status code check
     */
    handle(status: number, response: ResponseSchema, skipBusinessCheck?: boolean): void;

    /**
     * Set custom status code handler
     * @param handler Status code handler function
     */
    setCustomCodeHandler(handler: (status: number, response: ResponseSchema) => void): void;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
    baseURL?: string;
    timeout?: number;
    dedupe?: boolean;
    ignoreResponseError?: boolean;
    strategy: RequestStrategy;
    errorHandler: ErrorHandler;
}
