import type {
    ExtendedFetchOptions,
    Interceptor,
    InterceptorManager as IInterceptorManager,
} from "@buildingai/types";

/**
 * Interceptor manager
 * Responsible for managing and executing various interceptors
 */
export class InterceptorManager implements IInterceptorManager {
    /** Request interceptor list */
    private requestHandlers: Interceptor["onRequest"][] = [];

    /** Response interceptor list */
    private responseHandlers: Interceptor["onResponse"][] = [];

    /** Error interceptor list */
    private errorHandlers: Interceptor["onError"][] = [];

    /**
     * Add request interceptor
     * @param handler Interceptor handler function
     * @returns Function to remove interceptor
     */
    request(handler: Interceptor["onRequest"]): () => void {
        this.requestHandlers.push(handler);
        return () => {
            const index = this.requestHandlers.indexOf(handler);
            if (index !== -1) {
                this.requestHandlers.splice(index, 1);
            }
        };
    }

    /**
     * Add response interceptor
     * @param handler Interceptor handler function
     * @returns Function to remove interceptor
     */
    response(handler: Interceptor["onResponse"]): () => void {
        this.responseHandlers.push(handler);
        return () => {
            const index = this.responseHandlers.indexOf(handler);
            if (index !== -1) {
                this.responseHandlers.splice(index, 1);
            }
        };
    }

    /**
     * Add error interceptor
     * @param handler Interceptor handler function
     * @returns Function to remove interceptor
     */
    error(handler: Interceptor["onError"]): () => void {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index !== -1) {
                this.errorHandlers.splice(index, 1);
            }
        };
    }

    /**
     * Execute request interceptors
     * @param config Request configuration
     * @param skipInterceptors Whether to skip interceptors
     * @returns Processed request configuration
     */
    async runRequestInterceptors(
        config: ExtendedFetchOptions,
        skipInterceptors = false,
    ): Promise<ExtendedFetchOptions> {
        if (skipInterceptors) {
            return config;
        }

        let currentConfig = { ...config };

        for (const handler of this.requestHandlers) {
            if (handler) {
                const result = await handler(currentConfig);
                if (result) {
                    currentConfig = result;
                }
            }
        }

        return currentConfig;
    }

    /**
     * Execute response interceptors
     * @param response Response data
     * @param skipInterceptors Whether to skip interceptors
     * @returns Processed response data
     */
    async runResponseInterceptors(response: any, skipInterceptors = false): Promise<any> {
        if (skipInterceptors) {
            return response;
        }

        let currentResponse = response;

        for (const handler of this.responseHandlers) {
            if (handler) {
                const result = await handler(currentResponse);
                if (result) {
                    currentResponse = result;
                }
            }
        }

        return currentResponse;
    }

    /**
     * Execute error interceptors
     * @param error Error object
     * @param skipInterceptors Whether to skip interceptors
     */
    async runErrorInterceptors(error: unknown, skipInterceptors = false): Promise<never> {
        if (skipInterceptors) {
            throw error;
        }

        for (const handler of this.errorHandlers) {
            if (handler) {
                await handler(error);
            }
        }

        throw error; // Continue throwing error
    }
}
