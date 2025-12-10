import { useUserStore } from "@buildingai/stores/user";
import type {
    ExtendedFetchOptions,
    HttpMethod,
    RequestOptions,
    ResponseSchema,
} from "@buildingai/types";
import type { FetchOptions } from "ofetch";
import { ofetch } from "ofetch";

import { ErrorHandler } from "../handlers/error-handler";
import { handleResponse } from "../handlers/response-handler";
import { ParamsProcessor } from "../utils/params-processor";
import { RequestCache } from "../utils/request-cache";
import { InterceptorManager } from "./interceptor-manager";

/**
 * Request executor
 * Responsible for executing HTTP request core logic
 */
export class RequestExecutor {
    constructor(
        private getBaseURL: () => string,
        private getTimeout: () => number,
        private requestCache: RequestCache,
        private paramsProcessor: ParamsProcessor,
        private interceptorManager: InterceptorManager,
        private errorHandler: ErrorHandler,
    ) {}

    /**
     * Execute request
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
            dedupe = true,
            ...restOptions
        } = options;

        // Check user authentication
        if (requireAuth && !useUserStore().token && !useUserStore().temporaryToken) {
            throw new Error("User not logged in, please login first and try again");
        }

        // Merge configuration
        let config: FetchOptions = {
            method,
            baseURL: this.getBaseURL(),
            timeout: this.getTimeout(),
            ignoreResponseError: true,
            ...restOptions,
        };

        // Process request parameters
        if (params || method === "GET") {
            config.params = this.paramsProcessor.process(params as Record<string, unknown>);
        }

        // Add request body
        if (data) {
            config.body = this.paramsProcessor.process(data);
        }

        // Execute request interceptors
        config = (await this.interceptorManager.runRequestInterceptors(
            config as ExtendedFetchOptions,
            skipRequestInterceptors,
        )) as FetchOptions;

        if (dedupe) {
            const cachedRequest = this.requestCache.get<T>(method, url, data);
            if (cachedRequest) {
                return cachedRequest;
            }
        }

        // Set request cancel controller
        const abortController = new AbortController();
        this.requestCache.setAbortController(
            method,
            url,
            data as Record<string, unknown>,
            abortController,
        );

        // Use Promise.race() to simulate timeout interruption (to fix compatibility issues with AbortSignal.any() and AbortSignal.timeout() in older browsers)
        function withTimeout(signal: AbortSignal, timeout: number): AbortSignal {
            const controller = new AbortController();

            const timer = setTimeout(
                () => controller.abort(new DOMException("Timeout", "AbortError")),
                timeout,
            );

            // If the original signal is aborted, also abort this controller
            signal.addEventListener("abort", () => {
                clearTimeout(timer);
                controller.abort(signal.reason);
            });

            return controller.signal;
        }

        // Set signal
        const signal = config.timeout
            ? withTimeout(abortController.signal, config.timeout as number)
            : abortController.signal;

        config.signal = signal;

        // Initiate request
        const requestPromise = ofetch
            .raw<T>(url, config as FetchOptions<"json">)
            .then(async (response) => {
                // Execute response interceptors
                const processedResponse = await this.interceptorManager.runResponseInterceptors(
                    response._data as ResponseSchema,
                    skipResponseInterceptors,
                );

                // Handle error status codes and business error codes
                this.errorHandler.handle(response.status, processedResponse, skipBusinessCheck);

                // Return full response or data only based on configuration
                return handleResponse<T>(processedResponse, returnFullResponse) as T;
            })
            .catch(async (error) => {
                // Execute error interceptors
                return this.interceptorManager.runErrorInterceptors(error, skipErrorInterceptors);
            })
            .finally(() => {
                this.requestCache.cleanup(method, url, data);
            });

        // Cache request
        if (dedupe) {
            this.requestCache.set(method, url, data as Record<string, unknown>, requestPromise);
        }

        return requestPromise;
    }
}
