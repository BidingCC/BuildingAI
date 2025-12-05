/**
 * @fileoverview HTTP Client Base
 * @description Platform-agnostic HTTP client base class
 *
 * @author BuildingAI Teams
 */

import type {
    ExtendedFetchOptions,
    HttpMethod,
    RequestOptions,
    ResponseSchema,
} from "@buildingai/types";

import { InterceptorManager } from "./interceptor-manager";
import { ParamsProcessor } from "./params-processor";
import { RequestCache } from "./request-cache";
import { handleResponse } from "./response-handler";
import type { ErrorHandler, HttpClientConfig, RequestStrategy } from "./types";

const NEW_TOKEN_HEADER = "x-new-token";

/**
 * HTTP client base class
 * Contains all platform-agnostic logic
 * Platform-specific implementations are injected via strategy pattern
 */
export class HttpClientBase {
    private interceptorsManager: InterceptorManager;
    protected paramsProcessor: ParamsProcessor;
    protected cache: RequestCache;
    protected config: HttpClientConfig;

    constructor(
        protected strategy: RequestStrategy,
        protected errorHandler: ErrorHandler,
        config: HttpClientConfig,
    ) {
        this.config = {
            baseURL: "",
            timeout: 30000,
            dedupe: true,
            ignoreResponseError: false,
            ...config,
        };

        this.interceptorsManager = new InterceptorManager();
        this.paramsProcessor = new ParamsProcessor();
        this.cache = new RequestCache();
    }

    /**
     * Execute HTTP request
     * @param method HTTP method
     * @param url Request URL
     * @param options Request options
     * @returns Request result
     */
    async execute<T>(method: HttpMethod, url: string, options: RequestOptions = {}): Promise<T> {
        const {
            params,
            data,
            requireAuth = false,
            returnFullResponse = false,
            skipBusinessCheck = false,
            skipRequestInterceptors = false,
            skipResponseInterceptors = false,
            skipErrorInterceptors = false,
            dedupe = this.config.dedupe ?? true,
            timeout,
            headers,
            ...restOptions
        } = options;

        // Check user authentication (same as old RequestExecutor)
        if (requireAuth) {
            const userStore = useUserStore();
            if (!userStore.token && !userStore.temporaryToken) {
                // Show error and redirect to login
                this.errorHandler.showError("Please login first", "common.request.401");
                this.errorHandler.handleLogin();
                throw new Error("User not logged in, please login first and try again");
            }
        }

        // Build full URL
        const baseURL = this.config.baseURL || "";
        const fullUrl = url.startsWith("http")
            ? url
            : `${baseURL}${url.startsWith("/") ? url : `/${url}`}`;

        // Process parameters
        let processedParams = params
            ? this.paramsProcessor.process(params as Record<string, unknown>)
            : undefined;
        let processedData = data ? this.paramsProcessor.process(data) : undefined;

        // Build request config
        let requestConfig: ExtendedFetchOptions = {
            url: fullUrl,
            method,
            baseURL,
            timeout: timeout || this.config.timeout || 30000,
            params: processedParams,
            body: processedData,
            headers: headers || {},
            ...restOptions,
        } as ExtendedFetchOptions;

        // Execute request interceptors
        requestConfig = await this.interceptorsManager.runRequestInterceptors(
            requestConfig,
            skipRequestInterceptors,
        );

        // Check for cached request
        if (dedupe) {
            const cachedRequest = this.cache.get<T>(method, url, data);
            if (cachedRequest) {
                return cachedRequest;
            }
        }

        // Set abort controller (only for web environment)
        let signal: AbortSignal | undefined;
        if (typeof AbortController !== "undefined") {
            const abortController = new AbortController();
            this.cache.setAbortController(
                method,
                url,
                data as Record<string, unknown>,
                abortController,
            );

            // Handle timeout
            if (requestConfig.timeout) {
                const timeoutId = setTimeout(
                    () => abortController.abort(new DOMException("Timeout", "AbortError")),
                    requestConfig.timeout,
                );
                abortController.signal.addEventListener("abort", () => clearTimeout(timeoutId));
            }

            signal = abortController.signal;
        }

        requestConfig.signal = signal;

        // Build strategy config
        const strategyConfig = {
            url: fullUrl,
            method,
            baseURL,
            timeout: requestConfig.timeout || this.config.timeout || 30000,
            params: processedParams,
            data: processedData,
            headers: requestConfig.headers as Record<string, string> | undefined,
            signal,
        };

        // Execute request using strategy
        const requestPromise = this.strategy
            .request<T>(strategyConfig)
            .then(async (response) => {
                const newToken = response.headers.get(NEW_TOKEN_HEADER) || "";
                if (newToken) {
                    const userStore = useUserStore();
                    userStore.setToken(newToken);
                    console.log("[Token Refresh] Token has been automatically refreshed");
                }

                // Execute response interceptors
                const processedResponse = await this.interceptorsManager.runResponseInterceptors(
                    response.data as ResponseSchema,
                    skipResponseInterceptors,
                );

                // Handle error status codes and business error codes
                if (this.isResponseSchema(processedResponse)) {
                    const responseSchema = processedResponse as unknown as ResponseSchema<T>;
                    this.errorHandler.handle(response.status, responseSchema, skipBusinessCheck);

                    // Return full response or data only based on configuration
                    return handleResponse<T>(responseSchema, returnFullResponse) as T;
                }

                return processedResponse;
            })
            .catch(async (error) => {
                // Execute error interceptors
                return this.interceptorsManager.runErrorInterceptors(error, skipErrorInterceptors);
            })
            .finally(() => {
                this.cache.cleanup(method, url, data);
            });

        // Cache request
        if (dedupe) {
            this.cache.set(method, url, data as Record<string, unknown>, requestPromise);
        }

        return requestPromise;
    }

    /**
     * Check if response is a standard response schema
     * @param response Response object
     * @returns Whether response is a ResponseSchema
     */
    private isResponseSchema(response: unknown): boolean {
        return (
            typeof response === "object" &&
            response !== null &&
            "code" in response &&
            "data" in response
        );
    }

    /**
     * Send GET request
     */
    get<T>(url: string, options?: RequestOptions): Promise<T> {
        // For GET requests, merge params into URL
        if (options?.params) {
            const queryString = this.buildQueryString(
                this.paramsProcessor.process(options.params as Record<string, unknown>),
            );
            const separator = url.includes("?") ? "&" : "?";
            url = `${url}${separator}${queryString}`;
            delete options.params;
        }
        return this.execute<T>("GET", url, options);
    }

    /**
     * Send POST request
     */
    post<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.execute<T>("POST", url, options);
    }

    /**
     * Send PUT request
     */
    put<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.execute<T>("PUT", url, options);
    }

    /**
     * Send DELETE request
     */
    delete<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.execute<T>("DELETE", url, options);
    }

    /**
     * Send PATCH request
     */
    patch<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.execute<T>("PATCH", url, options);
    }

    /**
     * Send custom request
     */
    request<T>(method: HttpMethod, url: string, options?: RequestOptions): Promise<T> {
        return this.execute<T>(method, url, options);
    }

    /**
     * Build query string from object
     */
    private buildQueryString(params: Record<string, unknown>): string {
        return Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(
                ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
            )
            .join("&");
    }

    /**
     * Cancel specific request
     */
    cancel(url: string, method: HttpMethod = "GET"): void {
        this.cache.cancel(url, method);
    }

    /**
     * Cancel all requests
     */
    cancelAll(): void {
        this.cache.cancelAll();
    }

    /**
     * Interceptor manager accessor
     */
    get interceptors(): InterceptorManager {
        return this.interceptorsManager;
    }

    /**
     * Get interceptor manager (public accessor)
     */
    getInterceptors(): InterceptorManager {
        return this.interceptorsManager;
    }

    /**
     * Set parameter processor
     */
    setParamsProcessor(
        processor: (params: Record<string, unknown>) => Record<string, unknown>,
    ): this {
        this.paramsProcessor.setProcessor(processor);
        return this;
    }
}
