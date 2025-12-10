/**
 * Request cache manager
 * Responsible for request deduplication and cancellation control
 */
export class RequestCache {
    /** Request cache mapping */
    private cache = new Map<string, Promise<unknown>>();

    /** Abort controller mapping */
    private abortControllers = new Map<string, AbortController>();

    /**
     * Generate request cache key
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @returns Cache key
     */
    private generateCacheKey(method: string, url: string, data?: unknown): string {
        return `${method}:${url}:${JSON.stringify(data || {})}`;
    }

    /**
     * Get cached request
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @returns Cached request Promise
     */
    get<T>(method: string, url: string, params?: unknown): Promise<T> | undefined {
        const key = this.generateCacheKey(method, url, params);
        return this.cache.get(key) as Promise<T> | undefined;
    }

    /**
     * Set request cache
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @param promise Request Promise
     */
    set<T>(method: string, url: string, data: unknown, promise: Promise<T>): void {
        const key = this.generateCacheKey(method, url, data);
        this.cache.set(key, promise);
    }

    /**
     * Delete request cache
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     */
    delete(method: string, url: string, data?: unknown): void {
        const key = this.generateCacheKey(method, url, data);
        this.cache.delete(key);
    }

    /**
     * Set abort controller
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @param controller Abort controller
     */
    setAbortController(
        method: string,
        url: string,
        data: unknown,
        controller: AbortController,
    ): void {
        const key = this.generateCacheKey(method, url, data);
        this.abortControllers.set(key, controller);
    }

    /**
     * Get abort controller
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     * @returns Abort controller
     */
    getAbortController(method: string, url: string, data?: unknown): AbortController | undefined {
        const key = this.generateCacheKey(method, url, data);
        return this.abortControllers.get(key);
    }

    /**
     * Delete abort controller
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     */
    deleteAbortController(method: string, url: string, data?: unknown): void {
        const key = this.generateCacheKey(method, url, data);
        this.abortControllers.delete(key);
    }

    /**
     * Cancel specific request
     * @param url Request URL
     * @param method HTTP method
     */
    cancel(url: string, method = "GET"): void {
        const keyPrefix = `${method}:${url}`;

        for (const [key, controller] of this.abortControllers.entries()) {
            if (key.startsWith(keyPrefix)) {
                controller.abort();
                this.abortControllers.delete(key);
                this.cache.delete(key);
            }
        }
    }

    /**
     * Cancel all requests
     */
    cancelAll(): void {
        for (const controller of this.abortControllers.values()) {
            controller.abort();
        }

        this.abortControllers.clear();
        this.cache.clear();
    }

    /**
     * Clean up cache and controller for specific request
     * @param method HTTP method
     * @param url Request URL
     * @param data Request data
     */
    cleanup(method: string, url: string, data?: unknown): void {
        this.delete(method, url, data);
        this.deleteAbortController(method, url, data);
    }
}
