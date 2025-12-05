/**
 * @fileoverview UniApp Request Hooks
 * @description UniApp platform request hooks, completely separated from Web
 *
 * @author BuildingAI Teams
 */

import type { ChatStreamConfig, HttpMethod, RequestOptions, ResponseSchema } from "@buildingai/types";

import { HttpClientBase } from "../common/http-client-base";
import type { HttpClientConfig } from "../common/types";
import { UniAppChatStream } from "../uniapp/uniapp-chat-stream";
import { UniAppErrorHandler } from "../uniapp/uniapp-error-handler";
import { UniAppFileUpload } from "../uniapp/uniapp-file-upload";
import { UniAppRequestStrategy } from "../uniapp/uniapp-request-strategy";

// ==================== API Configuration Constants ====================

/**
 * Get API base URL from storage (UniApp only)
 */
function getBaseApiUrl(): string {
    try {
        // @ts-expect-error - uni is a global object in UniApp environment
        return uni.getStorageSync("BASE_API_URL") || "";
    } catch (_e) {
        return "";
    }
}

/**
 * Get API prefix from storage (UniApp only)
 */
function getApiPrefix(envKey: string, defaultValue: string): string {
    try {
        // @ts-expect-error - uni is a global object in UniApp environment
        return uni.getStorageSync(envKey) || defaultValue;
    } catch (_e) {
        return defaultValue;
    }
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

// ==================== Helper Functions ====================

/**
 * Get user token from storage (UniApp only)
 */
function getUserToken(): string {
    try {
        // @ts-expect-error - uni is a global object in UniApp environment
        return uni.getStorageSync("USER_TOKEN") || "";
    } catch (_e) {
        return "";
    }
}

// ==================== Core Factory Function ====================

/**
 * Create request factory for UniApp platform
 * @param options Configuration options
 * @returns Object containing various HTTP request methods
 */
function createUniAppRequestFactory(options: RequestFactoryOptions) {
    const {
        apiPrefix,
        enableStatusLog = false,
        filterEmptyParams = false,
        requireAuth = false,
        customParamsProcessor,
        customErrorHandler,
    } = options;

    // Create UniApp-specific strategy and error handler
    const strategy = new UniAppRequestStrategy();
    const errorHandler = new UniAppErrorHandler();

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

    // Create ChatStream and FileUpload instances for UniApp
    const chatStream = new UniAppChatStream(() => clientConfig.baseURL || "", http.getInterceptors());
    const fileUpload = new UniAppFileUpload(
        () => clientConfig.baseURL || "",
        http.getInterceptors(),
        errorHandler,
    );

    // Configure status code handling logic
    errorHandler.setCustomCodeHandler((status: number, response: ResponseSchema) => {
        if (enableStatusLog) {
            console.log(`[UniHttp ${status}]`, response);
        }

        // Handle common business status codes
        if (status === 401) {
            // Token expired or unauthorized
            try {
                // @ts-expect-error - uni is a global object in UniApp environment
                uni.removeStorageSync("USER_TOKEN");
                // @ts-expect-error - uni is a global object in UniApp environment
                uni.reLaunch({ url: "/pages/login/index" });
            } catch (_e) {
                // Ignore navigation errors
            }
        }
    });

    // Request interceptor - Handle authentication headers
    http.getInterceptors().request(async (config) => {
        // Initialize request headers
        if (!config.headers) {
            config.headers = {};
        }

        // Get authentication token
        const Authorization = getUserToken();

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
            console.error("[UniApp Request Failed]", typedError.message, error);
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
     * @param data Form data or file path
     * @param opts Upload options configuration
     * @returns Promise<T>
     */
    const upload = <T = any>(
        url: string,
        data?: Record<string, any> | string,
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
        // For UniApp, data should be a file path string or object with path
        const filePath = typeof data === "string" ? data : (data as any)?.file || (data as any)?.path || "";

        const controller = fileUpload.upload<T>(url, {
            file: filePath,
            fieldName: "file",
            formData: typeof data === "object" && data !== null ? data : {},
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
    const requestFactory = createUniAppRequestFactory({
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
    const requestFactory = createUniAppRequestFactory({
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
    let requestFactory: ReturnType<typeof createUniAppRequestFactory> | null = null;

    const getRequestFactory = () => {
        // Get plugin key from storage (UniApp only)
        let finalPluginKey: string = "unknown";

        try {
            // @ts-expect-error - uni is a global object in UniApp environment
            const pluginKey = uni.getStorageSync("CURRENT_PLUGIN_KEY");
            if (pluginKey) {
                finalPluginKey = pluginKey;
            }
        } catch (error) {
            console.warn("[Plugin API] Failed to get plugin key:", error);
        }

        // Build plugin API prefix: /{pluginKey}/{apiType}
        const pluginApiPrefix = `/${finalPluginKey}${apiType}`;

        requestFactory = createUniAppRequestFactory({
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
        upload: <T>(url: string, data?: Record<string, any> | string, opts?: RequestOptions) =>
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

export const {
    useConsoleGet,
    useConsolePost,
    useConsolePut,
    useConsoleDelete,
    useConsolePatch,
    useConsoleRequest,
    useConsoleStream,
    cancelConsoleRequest,
    cancelConsoleAllRequests,
} = createConsoleApiRequest();

// ==================== Export Web API Request Methods ====================

export const {
    useWebGet,
    useWebPost,
    useWebPut,
    useWebDelete,
    useWebPatch,
    useWebRequest,
    useWebUpload,
    useWebStream,
    cancelWebRequest,
    cancelWebAllRequests,
} = createWebApiRequest();

// ==================== Export Plugin API Request Methods ====================

export const {
    usePluginConsoleGet,
    usePluginConsolePost,
    usePluginConsolePut,
    usePluginConsoleDelete,
    usePluginConsolePatch,
    usePluginConsoleRequest,
    usePluginConsoleStream,
    cancelPluginConsoleRequest,
    cancelPluginConsoleAllRequests,
} = createPluginConsoleApiRequest();

export const {
    usePluginWebGet,
    usePluginWebPost,
    usePluginWebPut,
    usePluginWebDelete,
    usePluginWebPatch,
    usePluginWebRequest,
    usePluginWebUpload,
    usePluginWebStream,
    cancelPluginWebRequest,
    cancelPluginWebAllRequests,
} = createPluginWebApiRequest();

// ==================== Export Factory Functions ====================

export {
    createConsoleApiRequest,
    createPluginApiRequest,
    createPluginConsoleApiRequest,
    createPluginWebApiRequest,
    createUniAppRequestFactory,
    createWebApiRequest,
};
