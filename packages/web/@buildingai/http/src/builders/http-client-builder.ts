import type { HttpClientOptions } from "@buildingai/types";

import { HttpClientImpl } from "../core/http-client-impl";

/**
 * HTTP client builder
 * Uses builder pattern to construct HTTP client
 */
export class HttpClientBuilder {
    private config: HttpClientOptions = {
        baseURL: "",
        timeout: 30000,
        dedupe: true,
        ignoreResponseError: false,
    };

    /**
     * Set base URL
     * @param baseURL Base URL
     * @returns Builder instance
     */
    setBaseURL(baseURL: string): this {
        this.config.baseURL = baseURL;
        return this;
    }

    /**
     * Set timeout duration
     * @param timeout Timeout duration (milliseconds)
     * @returns Builder instance
     */
    setTimeout(timeout: number): this {
        this.config.timeout = timeout;
        return this;
    }

    /**
     * Set request deduplication
     * @param dedupe Whether to enable request deduplication
     * @returns Builder instance
     */
    setDedupe(dedupe: boolean): this {
        this.config.dedupe = dedupe;
        return this;
    }

    /**
     * Set whether to ignore response errors
     * @param ignore Whether to ignore response errors
     * @returns Builder instance
     */
    setIgnoreResponseError(ignore: boolean): this {
        this.config.ignoreResponseError = ignore;
        return this;
    }

    /**
     * Set fetch options
     * @param options Fetch options
     * @returns Builder instance
     */
    setFetchOptions(options: HttpClientOptions["fetchOptions"]): this {
        this.config.fetchOptions = options;
        return this;
    }

    /**
     * Build HTTP client
     * @returns HTTP client instance
     */
    build(): HttpClientImpl {
        return new HttpClientImpl(this.config);
    }
}
