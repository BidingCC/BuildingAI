/**
 * @fileoverview Web Request Hooks
 * @description Web platform request hooks using new architecture (HttpClientBase + Strategy + ErrorHandler)
 *              Completely separated from UniApp, no shared code with isUniApp checks
 *
 * @author BuildingAI Teams
 */

/// <reference types="vite/client" />

import type {
    ChatStreamConfig,
    HttpMethod,
    RequestOptions,
    ResponseSchema,
} from "@buildingai/types";

import { HttpClientBase } from "../common/http-client-base";
import type { HttpClientConfig } from "../common/types";
import { ChatStream } from "../features/chat-stream";
import { FileUpload } from "../features/file-upload";
import { WebErrorHandler } from "../web/web-error-handler";
import { WebRequestStrategy } from "../web/web-request-strategy";

// ==================== API Configuration Constants ====================

/**
 * Get API base URL from environment variables (Web only)
 */
function getBaseApiUrl(): string {
    try {
        const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
        if (typeof import.meta !== "undefined" && import.meta.env) {
            return isDev
                ? import.meta.env.VITE_DEVELOP_APP_BASE_URL || ""
                : import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
        }
    } catch (_e) {
        // Ignore errors
    }
    return "";
}

/**
 * Get API prefix from environment variables (Web only)
 */
function getApiPrefix(envKey: string, defaultValue: string): string {
    try {
        if (typeof import.meta !== "undefined" && import.meta.env) {
            return import.meta.env[envKey] || defaultValue;
        }
    } catch (_e) {
        // Ignore errors
    }
    return defaultValue;
}

const BASE_API = getBaseApiUrl();
const WEB_API_PREFIX = getApiPrefix("VITE_APP_WEB_API_PREFIX", "/api/web");
const CONSOLE_API_PREFIX = getApiPrefix("VITE_APP_CONSOLE_API_PREFIX", "/api/console");

// ==================== Type Definitions ====================

/**
 * Request factory options interface
 */
export interface RequestFactoryOptions {
    /** API prefix path */
    apiPrefix: string;
    /** Whether to enable status logging */
    enableStatusLog?: boolean;
    /** Whether to filter empty parameters (undefined, null) */
    filterEmptyParams?: boolean;
    /** Whether user authentication is required */
    requireAuth?: boolean;
    /** Custom parameter processor function */
    customParamsProcessor?: (params: Record<string, any>) => Record<string, any>;
    /** Custom error handler function */
    customErrorHandler?: (error: unknown) => void;
}

// ==================== Core Factory Function ====================

/**
 * Create request factory for Web platform
 * @param options Configuration options
 * @returns Object containing various HTTP request methods
 */
function createWebRequestFactory(options: RequestFactoryOptions) {
    const {
        apiPrefix,
        enableStatusLog = false,
        filterEmptyParams = false,
        requireAuth = false,
        customParamsProcessor,
        customErrorHandler,
    } = options;

    // Create Web-specific strategy and error handler
    const strategy = new WebRequestStrategy();
    const errorHandler = new WebErrorHandler();

    // Create HTTP client configuration
    const clientConfig: HttpClientConfig = {
        baseURL: `${BASE_API}${apiPrefix}`,
        timeout: 30000,
        dedupe: true,
        ignoreResponseError: true,
        strategy,
        errorHandler,
    };

    // Create HTTP client instance
    const http = new HttpClientBase(strategy, errorHandler, clientConfig);

    // Create ChatStream and FileUpload instances
    const chatStream = new ChatStream(() => clientConfig.baseURL || "", http.getInterceptors());
    const fileUpload = new FileUpload(
        () => clientConfig.baseURL || "",
        http.getInterceptors(),
        errorHandler,
    );

    // Configure status code handling logic
    errorHandler.setCustomCodeHandler((status: number, response: ResponseSchema) => {
        if (enableStatusLog && import.meta.client) {
            console.log(`[HTTP ${status}]`, response);
        }
    });

    // Request interceptor - Handle authentication headers (useUserStore is auto-imported by Nuxt)
    http.getInterceptors().request(async (config) => {
        const userStore = useUserStore();

        // Initialize request headers
        if (!config.headers) {
            config.headers = {};
        }

        // Get authentication token
        const Authorization = userStore.token || userStore.temporaryToken;

        // Add authentication token
        const headers = config.headers as Record<string, string>;
        if (Authorization) {
            headers["Authorization"] = `Bearer ${Authorization}`;
        }

        return config;
    });

    // Response interceptor
    http.getInterceptors().response(<T>(response: T) => {
        return response;
    });

    // Error interceptor
    http.getInterceptors().error((error: unknown) => {
        const typedError = error as Error;

        if (customErrorHandler) {
            customErrorHandler(error);
        } else {
            console.error("[Web Request Failed]", typedError.message, error);
        }

        throw error;
    });

    // Parameter processor configuration
    http.setParamsProcessor((params: Record<string, any> = {}) => {
        let processedParams = params;

        // Empty value filtering
        if (filterEmptyParams) {
            processedParams = Object.fromEntries(
                Object.entries(params).filter(
                    ([_, value]) => value !== undefined && value !== null,
                ),
            );
        }

        // Custom parameter processing
        if (customParamsProcessor) {
            processedParams = customParamsProcessor(processedParams);
        }

        return processedParams;
    });

    // ==================== HTTP Method Definitions ====================

    /**
     * GET request
     */
    const get = <T>(url: string, params?: Record<string, any>, opts?: RequestOptions) =>
        http.get<T>(url, { params, requireAuth, ...opts });

    /**
     * POST request
     */
    const post = <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
        http.post<T>(url, { data, requireAuth, ...opts });

    /**
     * PUT request
     */
    const put = <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
        http.put<T>(url, { data, requireAuth, ...opts });

    /**
     * DELETE request
     */
    const del = <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
        http.delete<T>(url, { data, requireAuth, ...opts });

    /**
     * PATCH request
     */
    const patch = <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
        http.patch<T>(url, { data, requireAuth, ...opts });

    /**
     * Cancel specific request
     */
    const cancel = (url: string, method: HttpMethod = "GET") => http.cancel(url, method);

    /**
     * Cancel all active requests
     */
    const cancelAll = () => http.cancelAll();

    /**
     * Stream request
     * @param url Stream API endpoint path
     * @param config Stream configuration
     * @returns Promise<Stream controller with control methods>
     */
    const stream = (url: string, config: ChatStreamConfig) => chatStream.create(url, config);

    /**
     * File upload method
     * @param url Upload endpoint path
     * @param data Form data, can include files and other fields
     * @param opts Upload options configuration
     * @returns Promise<T>
     */
    const upload = <T = any>(
        url: string,
        data?: Record<string, any>,
        opts?: {
            /** Upload progress callback function */
            onProgress?: (percent: number) => void;
            /** Custom request headers */
            headers?: Record<string, string>;
            /** Whether to skip business status code check */
            skipBusinessCheck?: boolean;
            /** Whether to return full response object */
            returnFullResponse?: boolean;
        },
    ): Promise<T> => {
        // Build FormData object
        const formData = new FormData();
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                // Handle file arrays
                if (Array.isArray(value) && value[0] instanceof File) {
                    value.forEach((file: File) => {
                        formData.append(key, file);
                    });
                } else {
                    formData.append(key, value);
                }
            });
        }

        // Send upload request
        const controller = fileUpload.upload<T>(url, {
            file: formData,
            fieldName: "file",
            formData: {},
            onProgress: opts?.onProgress,
            headers: opts?.headers,
            skipBusinessCheck: opts?.skipBusinessCheck,
            returnFullResponse: opts?.returnFullResponse,
        });

        return controller.promise;
    };

    /**
     * Generic request method
     * @param method HTTP method
     * @param url Request path
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const request = <T>(method: HttpMethod, url: string, options?: RequestOptions) =>
        http.request<T>(method, url, { requireAuth, ...options });

    // Return all request methods
    return {
        get,
        post,
        put,
        delete: del,
        patch,
        request,
        stream,
        upload,
        cancel,
        cancelAll,
    };
}

// ==================== Console API Request Instance ====================

/**
 * Create Console API request instance for backend management
 */
function createConsoleApiRequest() {
    const requestFactory = createWebRequestFactory({
        apiPrefix: CONSOLE_API_PREFIX,
        enableStatusLog: false,
        filterEmptyParams: true,
        requireAuth: true,
        customErrorHandler: (error: unknown) => {
            const typedError = error as Error;
            console.error("[Console API Request Failed]", typedError.message, error);
        },
    });

    return {
        useConsoleGet: requestFactory.get,
        useConsolePost: requestFactory.post,
        useConsolePut: requestFactory.put,
        useConsoleDelete: requestFactory.delete,
        useConsolePatch: requestFactory.patch,
        useConsoleRequest: requestFactory.request,
        useConsoleStream: requestFactory.stream,
        cancelConsoleRequest: requestFactory.cancel,
        cancelConsoleAllRequests: requestFactory.cancelAll,
    };
}

// ==================== Web API Request Instance ====================

/**
 * Create Web API request instance for frontend
 */
function createWebApiRequest() {
    const requestFactory = createWebRequestFactory({
        apiPrefix: WEB_API_PREFIX,
        enableStatusLog: true,
        filterEmptyParams: false,
        requireAuth: false,
        customErrorHandler: (error: unknown) => {
            const typedError = error as Error;
            console.error("[Web API Request Failed]", typedError.message);
        },
    });

    return {
        useWebGet: requestFactory.get,
        useWebPost: requestFactory.post,
        useWebPut: requestFactory.put,
        useWebDelete: requestFactory.delete,
        useWebPatch: requestFactory.patch,
        useWebRequest: requestFactory.request,
        useWebUpload: requestFactory.upload,
        useWebStream: requestFactory.stream,
        cancelWebRequest: requestFactory.cancel,
        cancelWebAllRequests: requestFactory.cancelAll,
    };
}

// ==================== Plugin API Request Instance ====================

/**
 * Create plugin request instance lazy factory function
 * @description Creates a lazy-initialized request factory for plugin API calls
 *
 * @param apiType API type prefix (console or web)
 * @returns Lazy-initialized request instance factory
 */
function createPluginApiRequest(apiType: string = WEB_API_PREFIX) {
    // Lazy-initialized instance
    let requestFactory: ReturnType<typeof createWebRequestFactory> | null = null;

    const getRequestFactory = () => {
        // Get plugin key from location.pathname
        let finalPluginKey: string = "unknown";

        try {
            if (typeof window !== "undefined" && window.location) {
                const pathname = window.location.pathname;
                // Match pattern: /extensions/{pluginKey}/
                const match = pathname.match(/\/extensions\/([^/]+)/);
                if (match && match[1]) {
                    finalPluginKey = match[1];
                }
            }
        } catch (error) {
            console.warn("[Plugin API] Failed to extract plugin key from pathname:", error);
        }

        // Build plugin API prefix: /{pluginKey}/{apiType}
        const pluginApiPrefix = `/${finalPluginKey}${apiType}`;

        requestFactory = createWebRequestFactory({
            apiPrefix: pluginApiPrefix,
            enableStatusLog: apiType === WEB_API_PREFIX,
            filterEmptyParams: apiType === CONSOLE_API_PREFIX,
            requireAuth: apiType === CONSOLE_API_PREFIX,
            customErrorHandler: (error: unknown) => {
                const typedError = error as Error;
                console.error(
                    `[Plugin ${finalPluginKey} ${apiType.toUpperCase()} API Request Failed]`,
                    typedError.message,
                    error,
                );
            },
        });
        return requestFactory;
    };

    // Return lazily-called methods
    return {
        get: <T>(url: string, params?: Record<string, any>, options?: RequestOptions) =>
            getRequestFactory().get<T>(url, params, options),
        post: <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
            getRequestFactory().post<T>(url, data, options),
        put: <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
            getRequestFactory().put<T>(url, data, options),
        delete: <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
            getRequestFactory().delete<T>(url, data, options),
        patch: <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
            getRequestFactory().patch<T>(url, data, options),
        request: <T>(method: HttpMethod, url: string, options?: RequestOptions) =>
            getRequestFactory().request<T>(method, url, options),
        stream: (url: string, config: ChatStreamConfig) => getRequestFactory().stream(url, config),
        upload: <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
            getRequestFactory().upload<T>(url, data, opts),
        cancel: (url: string, method?: HttpMethod) => getRequestFactory().cancel(url, method),
        cancelAll: () => getRequestFactory().cancelAll(),
    };
}

/**
 * Create plugin Console API request method collection
 */
function createPluginConsoleApiRequest() {
    const requestFactory = createPluginApiRequest(CONSOLE_API_PREFIX);

    return {
        usePluginConsoleGet: requestFactory.get,
        usePluginConsolePost: requestFactory.post,
        usePluginConsolePut: requestFactory.put,
        usePluginConsoleDelete: requestFactory.delete,
        usePluginConsolePatch: requestFactory.patch,
        usePluginConsoleRequest: requestFactory.request,
        usePluginConsoleStream: requestFactory.stream,
        cancelPluginConsoleRequest: requestFactory.cancel,
        cancelPluginConsoleAllRequests: requestFactory.cancelAll,
    };
}

/**
 * Create plugin Web API request method collection
 */
function createPluginWebApiRequest() {
    const requestFactory = createPluginApiRequest(WEB_API_PREFIX);

    return {
        usePluginWebGet: requestFactory.get,
        usePluginWebPost: requestFactory.post,
        usePluginWebPut: requestFactory.put,
        usePluginWebDelete: requestFactory.delete,
        usePluginWebPatch: requestFactory.patch,
        usePluginWebRequest: requestFactory.request,
        usePluginWebUpload: requestFactory.upload,
        usePluginWebStream: requestFactory.stream,
        cancelPluginWebRequest: requestFactory.cancel,
        cancelPluginWebAllRequests: requestFactory.cancelAll,
    };
}

// ==================== Export Console API Request Methods ====================

const _consoleApi = createConsoleApiRequest();
export const useConsoleGet = _consoleApi.useConsoleGet;
export const useConsolePost = _consoleApi.useConsolePost;
export const useConsolePut = _consoleApi.useConsolePut;
export const useConsoleDelete = _consoleApi.useConsoleDelete;
export const useConsolePatch = _consoleApi.useConsolePatch;
export const useConsoleRequest = _consoleApi.useConsoleRequest;
export const useConsoleStream = _consoleApi.useConsoleStream;
export const cancelConsoleRequest = _consoleApi.cancelConsoleRequest;
export const cancelConsoleAllRequests = _consoleApi.cancelConsoleAllRequests;

// ==================== Export Web API Request Methods ====================

const _webApi = createWebApiRequest();
export const useWebGet = _webApi.useWebGet;
export const useWebPost = _webApi.useWebPost;
export const useWebPut = _webApi.useWebPut;
export const useWebDelete = _webApi.useWebDelete;
export const useWebPatch = _webApi.useWebPatch;
export const useWebRequest = _webApi.useWebRequest;
export const useWebUpload = _webApi.useWebUpload;
export const useWebStream = _webApi.useWebStream;
export const cancelWebRequest = _webApi.cancelWebRequest;
export const cancelWebAllRequests = _webApi.cancelWebAllRequests;

// ==================== Export Plugin API Request Methods ====================

const _pluginConsoleApi = createPluginConsoleApiRequest();
export const usePluginConsoleGet = _pluginConsoleApi.usePluginConsoleGet;
export const usePluginConsolePost = _pluginConsoleApi.usePluginConsolePost;
export const usePluginConsolePut = _pluginConsoleApi.usePluginConsolePut;
export const usePluginConsoleDelete = _pluginConsoleApi.usePluginConsoleDelete;
export const usePluginConsolePatch = _pluginConsoleApi.usePluginConsolePatch;
export const usePluginConsoleRequest = _pluginConsoleApi.usePluginConsoleRequest;
export const usePluginConsoleStream = _pluginConsoleApi.usePluginConsoleStream;
export const cancelPluginConsoleRequest = _pluginConsoleApi.cancelPluginConsoleRequest;
export const cancelPluginConsoleAllRequests = _pluginConsoleApi.cancelPluginConsoleAllRequests;

const _pluginWebApi = createPluginWebApiRequest();
export const usePluginWebGet = _pluginWebApi.usePluginWebGet;
export const usePluginWebPost = _pluginWebApi.usePluginWebPost;
export const usePluginWebPut = _pluginWebApi.usePluginWebPut;
export const usePluginWebDelete = _pluginWebApi.usePluginWebDelete;
export const usePluginWebPatch = _pluginWebApi.usePluginWebPatch;
export const usePluginWebRequest = _pluginWebApi.usePluginWebRequest;
export const usePluginWebUpload = _pluginWebApi.usePluginWebUpload;
export const usePluginWebStream = _pluginWebApi.usePluginWebStream;
export const cancelPluginWebRequest = _pluginWebApi.cancelPluginWebRequest;
export const cancelPluginWebAllRequests = _pluginWebApi.cancelPluginWebAllRequests;

// ==================== Export Factory Functions ====================

export {
    createConsoleApiRequest,
    createPluginApiRequest,
    createPluginConsoleApiRequest,
    createPluginWebApiRequest,
    createWebApiRequest,
    createWebRequestFactory,
};
