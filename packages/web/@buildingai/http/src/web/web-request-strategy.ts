/**
 * @fileoverview Web Request Strategy
 * @description Web platform request strategy using ofetch
 *
 * @author BuildingAI Teams
 */

import type { FetchOptions } from "ofetch";
import { ofetch } from "ofetch";

import type { RequestConfig, RequestStrategy, StrategyResponse } from "../common/types";

/**
 * Web request strategy
 * Uses ofetch for HTTP requests in web environment
 */
export class WebRequestStrategy implements RequestStrategy {
    /**
     * Execute HTTP request using ofetch
     * @param config Request configuration
     * @returns Promise with response data and status
     */
    async request<T>(config: RequestConfig): Promise<StrategyResponse<T>> {
        // Note: url is already the full URL (baseURL + path), don't pass baseURL again
        const { method, url, timeout, params, data, headers, signal } = config;

        const fetchConfig: FetchOptions = {
            method,
            timeout,
            signal,
            headers,
            params,
            body: data,
        };

        const response = await ofetch.raw<T>(url, fetchConfig as FetchOptions<"json">);

        return {
            headers: response.headers as Headers,
            data: response._data as T,
            status: response.status,
        };
    }
}
