/**
 * @fileoverview UniApp Request Strategy
 * @description UniApp platform request strategy using uni.request
 *
 * @author BuildingAI Teams
 */

import type { RequestConfig, RequestStrategy, StrategyResponse } from "../common/types";

/**
 * UniApp request strategy
 * Uses uni.request for HTTP requests in UniApp environment
 */
export class UniAppRequestStrategy implements RequestStrategy {
    /**
     * Execute HTTP request using uni.request
     * @param config Request configuration
     * @returns Promise with response data and status
     */
    async request<T>(config: RequestConfig): Promise<StrategyResponse<T>> {
        // Build full URL
        const fullUrl = config.url.startsWith("http")
            ? config.url
            : `${config.baseURL}${config.url.startsWith("/") ? config.url : `/${config.url}`}`;

        // For GET requests, merge params into URL
        let requestUrl = fullUrl;
        if (config.method === "GET" && config.params) {
            const queryString = this.buildQueryString(config.params);
            requestUrl = `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}${queryString}`;
        }

        return new Promise((resolve, reject) => {
            // Handle abort signal for UniApp
            let aborted = false;
            if (config.signal) {
                config.signal.addEventListener("abort", () => {
                    aborted = true;
                    reject(new Error("Request aborted"));
                });
            }

            // @ts-expect-error - uni is a global object in UniApp environment
            uni.request({
                url: requestUrl,
                method: config.method as any,
                data: config.method !== "GET" ? config.data : undefined,
                header: config.headers || {},
                timeout: config.timeout,
                dataType: "json",
                responseType: "text",
                success: (res: any) => {
                    if (aborted) {
                        return;
                    }
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            data: res.data as T,
                            status: res.statusCode,
                        });
                    } else {
                        const error = new Error(`HTTP Error: ${res.statusCode}`);
                        (error as any).statusCode = res.statusCode;
                        reject(error);
                    }
                },
                fail: (err: any) => {
                    if (aborted) {
                        return;
                    }
                    const error = new Error(err.errMsg || "Network Error");
                    (error as any).code = err.errno;
                    reject(error);
                },
            });
        });
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
}
