/// <reference types="vite/client" />

import { useUserStore } from "@buildingai/stores/user";

import {
    type ChatStreamConfig,
    createHttpClient,
    type HttpMethod,
    type RequestOptions,
    type ResponseSchema,
} from "../index";

// ==================== API Configuration Constants ====================

/**
 * API configuration constants
 * @description These values are read from environment variables at build time by Vite
 */
const BASE_API =
    process.env.NODE_ENV === "development"
        ? import.meta.env.VITE_DEVELOP_APP_BASE_URL || ""
        : import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";

const WEB_API_PREFIX = import.meta.env.VITE_APP_WEB_API_PREFIX || "/api/web";
const CONSOLE_API_PREFIX = import.meta.env.VITE_APP_CONSOLE_API_PREFIX || "/api/console";

// ==================== Type Definitions ====================

/**
 * Request factory options interface
 * @description Configuration options for creating different types of request instances (Console, Web, Plugin)
 */
export interface RequestFactoryOptions {
    /** API prefix path */
    apiPrefix: string;
    /** Whether to enable status logging */
    enableStatusLog?: boolean;
    /** Whether to enable runtime configuration */
    enableRuntimeConfig?: boolean;
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
 * Universal request factory function
 * @description Creates HTTP request instances with different characteristics based on configuration options
 *
 * @param options Configuration options
 * @returns Object containing various HTTP request methods
 */
function createRequestFactory(options: RequestFactoryOptions) {
    const {
        apiPrefix,
        enableStatusLog = false,
        filterEmptyParams = false,
        requireAuth = false,
        customParamsProcessor,
        customErrorHandler,
    } = options;

    // Create HTTP client instance with basic configuration
    const http = createHttpClient({
        dedupe: true, // Enable request deduplication
        ignoreResponseError: true, // Ignore response errors, handled by interceptors
        timeout: 30000, // 30 second timeout
    });

    // Set API base URL
    http.setBaseURL(`${BASE_API}${apiPrefix}`);

    // Configure status code handling logic
    http.setStatusHandler((status: number, response: ResponseSchema) => {
        if (enableStatusLog && import.meta.client) {
            console.log(`[HTTP ${status}]`, response);
        }
    });

    // Request interceptor - Handle authentication headers and runtime configuration
    http.interceptors.request(async (config) => {
        const userStore = useUserStore();

        // Initialize request headers
        if (!config.headers) {
            config.headers = {};
        }

        // Check if authentication is required, block request if user is not logged in when auth is required
        const Authorization = userStore.token || userStore.temporaryToken;

        // Add authentication token
        const headers = config.headers as Record<string, string>;
        if (Authorization) {
            headers["Authorization"] = `Bearer ${Authorization}`;
        }

        return config;
    });

    // Response interceptor - Handle response data format
    http.interceptors.response(<T>(response: T) => {
        return response;
    });

    // Error interceptor - Unified error handling
    http.interceptors.error((error: unknown) => {
        const typedError = error as Error;

        if (customErrorHandler) {
            customErrorHandler(error);
        } else {
            console.error("[Request Failed]", typedError.message, error);
        }

        throw error; // Continue throwing error for upper layer handling
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
     * @param url Request path
     * @param params Query parameters
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const get = <T>(url: string, params?: Record<string, any>, options?: RequestOptions) =>
        http.get<T>(url, { params, requireAuth, ...options });

    /**
     * POST request
     * @param url Request path
     * @param data Request body data
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const post = <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
        http.post<T>(url, { data, requireAuth, ...options });

    /**
     * PUT request
     * @param url Request path
     * @param data Request body data
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const put = <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
        http.put<T>(url, { data, requireAuth, ...options });

    /**
     * DELETE request
     * @param url Request path
     * @param data Request body data
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const del = <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
        http.delete<T>(url, { data, requireAuth, ...options });

    /**
     * PATCH request
     * @param url Request path
     * @param data Request body data
     * @param options Request configuration options
     * @returns Promise<T>
     */
    const patch = <T>(url: string, data?: Record<string, any>, options?: RequestOptions) =>
        http.patch<T>(url, { data, requireAuth, ...options });

    /**
     * Generic request method
     * @param url Request path
     * @param options Request configuration options (including HTTP method)
     * @returns Promise<T>
     */
    const request = <T>(url: string, options: RequestOptions & { method: HttpMethod }) =>
        http.request<T>(options.method, url, { requireAuth, ...options });

    /**
     * Stream request
     * @param url Stream API endpoint path
     * @param config Stream configuration
     * @returns Promise<Stream controller with control methods>
     */
    const stream = (url: string, config: ChatStreamConfig) => http.chatStream(url, config);

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
        const controller = http.upload<T>(url, {
            file: formData,
            ...opts,
        });

        return controller.promise;
    };

    /**
     * Cancel specific request
     * @param url Request path
     * @param method HTTP method, defaults to GET
     */
    const cancel = (url: string, method: HttpMethod = "GET") => http.cancel(url, method);

    /**
     * Cancel all active requests
     */
    const cancelAll = () => http.cancelAll();

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
 * @description Features:
 * - Uses CONSOLE_API_PREFIX prefix
 * - Status logging disabled
 * - Runtime configuration not required
 * - Empty parameter filtering enabled
 *
 * @returns Console API request method collection
 */
function createConsoleApiRequest() {
    const requestFactory = createRequestFactory({
        apiPrefix: CONSOLE_API_PREFIX,
        enableStatusLog: false,
        enableRuntimeConfig: false,
        filterEmptyParams: true,
        requireAuth: true, // Console API requires authentication
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
 * @description Features:
 * - Uses WEB_API_PREFIX prefix
 * - Status logging enabled
 * - Runtime configuration required
 * - Empty parameter filtering disabled
 * - File upload supported
 *
 * @returns Web API request method collection
 */
function createWebApiRequest() {
    const requestFactory = createRequestFactory({
        apiPrefix: WEB_API_PREFIX,
        enableStatusLog: true,
        enableRuntimeConfig: true,
        filterEmptyParams: false,
        requireAuth: false, // Web API does not require authentication by default, can be adjusted as needed
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
        useWebStream: requestFactory.stream,
        useWebUpload: requestFactory.upload,
        cancelWebRequest: requestFactory.cancel,
        cancelWebAllRequests: requestFactory.cancelAll,
    };
}

// ==================== Plugin API Request Instance ====================

/**
 * Create plugin request instance lazy factory function
 * @description Creates a lazy-initialized request factory for plugin API calls
 *
 * @param apiType API type (console or web)
 * @returns Lazy-initialized request instance factory
 */
function createPluginApiRequest(apiType: string = WEB_API_PREFIX) {
    // Lazy-initialized instance
    let requestFactory: ReturnType<typeof createRequestFactory> | null = null;

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

        requestFactory = createRequestFactory({
            apiPrefix: pluginApiPrefix,
            enableStatusLog: apiType === "web",
            enableRuntimeConfig: apiType === "web",
            filterEmptyParams: apiType === "console",
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
        request: <T>(url: string, options: RequestOptions & { method: HttpMethod }) =>
            getRequestFactory().request<T>(url, options),
        stream: (url: string, config: ChatStreamConfig) => getRequestFactory().stream(url, config),
        upload: <T>(url: string, data?: Record<string, any>, opts?: RequestOptions) =>
            getRequestFactory().upload<T>(url, data, opts),
        cancel: (url: string, method?: HttpMethod) => getRequestFactory().cancel(url, method),
        cancelAll: () => getRequestFactory().cancelAll(),
    };
}

/**
 * Create plugin Console API request method collection
 * @description Creates request methods for plugin backend management functionality
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
 * @description Creates request methods for plugin frontend display functionality
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
        usePluginWebStream: requestFactory.stream,
        usePluginWebUpload: requestFactory.upload,
        cancelPluginWebRequest: requestFactory.cancel,
        cancelPluginWebAllRequests: requestFactory.cancelAll,
    };
}

// ==================== Export Console API Request Methods ====================

/**
 * Export backend management Console API request methods
 * @description Used for data operations in the backend management system
 */
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

/**
 * Export frontend Web API request methods
 * @description Used for data operations in the frontend user interface
 */
export const {
    useWebGet,
    useWebPost,
    useWebPut,
    useWebDelete,
    useWebPatch,
    useWebRequest,
    useWebStream,
    useWebUpload,
    cancelWebRequest,
    cancelWebAllRequests,
} = createWebApiRequest();

// ==================== Export Plugin API Request Methods ====================

/**
 * Export plugin Console API request methods
 * @description Used for plugin backend management functionality
 */
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

/**
 * Export plugin Web API request methods
 * @description Used for plugin frontend display functionality
 */
export const {
    usePluginWebGet,
    usePluginWebPost,
    usePluginWebPut,
    usePluginWebDelete,
    usePluginWebPatch,
    usePluginWebRequest,
    usePluginWebStream,
    usePluginWebUpload,
    cancelPluginWebRequest,
    cancelPluginWebAllRequests,
} = createPluginWebApiRequest();

// ==================== Export Factory Functions ====================

/**
 * Export factory functions for scenarios requiring custom configuration
 */
export {
    createConsoleApiRequest,
    createPluginApiRequest,
    createPluginConsoleApiRequest,
    createPluginWebApiRequest,
    createRequestFactory,
    createWebApiRequest,
};
