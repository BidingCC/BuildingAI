/**
 * HTTP Client Toolkit
 * Refactored version - using modular design and design patterns
 */

// Export types and constants
export * from "@buildingai/types";

// Export core modules
export { HttpClientImpl } from "./core/http-client-impl";
export { InterceptorManager } from "./core/interceptor-manager";
export { RequestExecutor } from "./core/request-executor";

// Export utility classes
export { ParamsProcessor } from "./utils/params-processor";
export { RequestCache } from "./utils/request-cache";

// Export handlers
export { ErrorHandler } from "./handlers/error-handler";
export { handleResponse } from "./handlers/response-handler";

// Export feature modules
export { ChatStream } from "./features/chat-stream";
export { FileUpload } from "./features/file-upload";

// Export builders
export { HttpClientBuilder } from "./builders/http-client-builder";

// Import dependencies
import type { HttpClient, HttpClientOptions } from "@buildingai/types";

import { HttpClientBuilder } from "./builders/http-client-builder";

/**
 * Factory function to create HTTP client
 * @param config Client configuration
 * @returns HTTP client instance
 */
export function createHttpClient(config: HttpClientOptions = {}): HttpClient {
    return new HttpClientBuilder()
        .setBaseURL(config.baseURL || "")
        .setTimeout(config.timeout || 30000)
        .setDedupe(config.dedupe !== undefined ? config.dedupe : true)
        .setIgnoreResponseError(config.ignoreResponseError || false)
        .setFetchOptions(config.fetchOptions)
        .build();
}

/**
 * Create default HTTP client instance
 */
export const http = createHttpClient();

export { createHttpClient as default };
