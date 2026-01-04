import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

import { createAbortError, createRequestId } from "../utils/helpers";
import { mergeRequestConfig, type RequestConfig } from "../utils/request";
import {
    type HeadersInput,
    type HttpClientOptions,
    HttpError,
    type HttpMethod,
    type RetryOptions,
} from "./types";

function trimSlashStart(v: string): string {
    return v.replace(/^\/+/, "");
}

function trimSlashEnd(v: string): string {
    return v.replace(/\/+$/, "");
}

function isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function joinPrefix(url: string, prefix?: string): string {
    if (!prefix) return url;
    if (!url) return url;
    if (isAbsoluteUrl(url)) return url;

    const p = trimSlashEnd(prefix);
    const u = trimSlashStart(url);

    if (!p) return `/${u}`;

    return `${p}/${u}`;
}

const defaultRetry: RetryOptions = {
    retries: 0,
    delay: 300,
    factor: 2,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
    retryOnMethods: ["GET", "PUT", "DELETE", "HEAD", "OPTIONS"],
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHeaders(headers?: HeadersInput): Record<string, string> | undefined {
    if (!headers) return undefined;

    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
        if (v === undefined || v === null) continue;
        out[k] = String(v);
    }
    return out;
}

function isAxiosError(error: unknown): error is AxiosError {
    return (
        Boolean(error) && typeof error === "object" && (error as AxiosError).isAxiosError === true
    );
}

function toHttpError(error: unknown): HttpError {
    if (error instanceof HttpError) return error;

    if (isAxiosError(error)) {
        const status = error.response?.status;
        const code = error.code;
        const message = error.message || "Request failed";
        return new HttpError({
            name: "HttpRequestError",
            message,
            code,
            status,
            details: {
                url: error.config?.url,
                method: error.config?.method,
                data: error.response?.data,
            },
            cause: error,
        });
    }

    if (error instanceof Error) {
        return new HttpError({
            name: error.name || "UnknownError",
            message: error.message || "Unknown error",
            cause: error,
        });
    }

    return new HttpError({
        name: "UnknownError",
        message: "Unknown error",
        cause: error,
    });
}

function shouldRetry(method: HttpMethod, status: number | undefined, retry: RetryOptions): boolean {
    if (retry.retries <= 0) return false;
    if (!retry.retryOnMethods?.includes(method)) return false;
    if (status === undefined) return true;
    return retry.retryOnStatuses?.includes(status) ?? false;
}

export class HttpClient {
    private readonly axios: AxiosInstance;
    private readonly options: HttpClientOptions;
    private readonly retry: RetryOptions;

    private unwrapOrThrow<TResponse>(raw: unknown): TResponse {
        if (this.options.parseResponse) {
            const result = this.options.parseResponse<TResponse>(raw);
            if (result.ok) return result.data;
            throw result.error;
        }

        return raw as TResponse;
    }

    public constructor(options: HttpClientOptions = {}) {
        this.options = options;
        this.retry = {
            ...defaultRetry,
            ...(options.retry ?? {}),
            retryOnStatuses: options.retry?.retryOnStatuses ?? defaultRetry.retryOnStatuses,
            retryOnMethods: options.retry?.retryOnMethods ?? defaultRetry.retryOnMethods,
        };

        this.axios = axios.create({
            baseURL: options.baseURL,
            timeout: options.timeoutMs,
            withCredentials: options.withCredentials,
            headers: normalizeHeaders(options.headers),
        });

        this.setupInterceptors();
    }

    public get instance(): AxiosInstance {
        return this.axios;
    }

    public async request<TResponse>(config: RequestConfig): Promise<TResponse> {
        const method = (config.method?.toUpperCase?.() ?? "GET") as HttpMethod;

        const requestId = config.requestId ?? createRequestId();
        const mergedConfig: AxiosRequestConfig = mergeRequestConfig({}, config);

        if (typeof mergedConfig.url === "string") {
            mergedConfig.url = joinPrefix(mergedConfig.url, this.options.pathPrefix);
        }

        mergedConfig.headers = mergedConfig.headers ?? {};
        (mergedConfig.headers as Record<string, string>)["x-request-id"] = requestId;

        let attempt = 0;
        let lastError: unknown;

        while (attempt <= this.retry.retries) {
            try {
                const res = await this.axios.request(mergedConfig);
                const raw = res.data as unknown;
                return this.unwrapOrThrow<TResponse>(raw);
            } catch (error) {
                lastError = error;

                if (
                    (error instanceof DOMException && error.name === "AbortError") ||
                    (isAxiosError(error) && error.code === "ERR_CANCELED")
                ) {
                    throw createAbortError();
                }

                const status = isAxiosError(error) ? error.response?.status : undefined;

                if (status === 401 && this.options.hooks?.refreshAccessToken) {
                    const refreshed = await this.options.hooks.refreshAccessToken();
                    if (refreshed) {
                        attempt += 1;
                        continue;
                    }
                }

                if (!shouldRetry(method, status, this.retry) || attempt >= this.retry.retries) {
                    if (status === 401 && this.options.hooks?.onAuthError) {
                        await this.options.hooks.onAuthError(error);
                    }
                    throw toHttpError(error);
                }

                const factor = this.retry.factor ?? 2;
                const delay = this.retry.delay * Math.pow(factor, attempt);
                attempt += 1;
                await sleep(delay);
            }
        }

        throw toHttpError(lastError);
    }

    public get<TResponse>(url: string, config: RequestConfig = {}): Promise<TResponse> {
        return this.request<TResponse>({ ...config, url, method: "GET" });
    }

    public post<TResponse, TBody = unknown>(
        url: string,
        data?: TBody,
        config: RequestConfig = {},
    ): Promise<TResponse> {
        return this.request<TResponse>({ ...config, url, data, method: "POST" });
    }

    public put<TResponse, TBody = unknown>(
        url: string,
        data?: TBody,
        config: RequestConfig = {},
    ): Promise<TResponse> {
        return this.request<TResponse>({ ...config, url, data, method: "PUT" });
    }

    public patch<TResponse, TBody = unknown>(
        url: string,
        data?: TBody,
        config: RequestConfig = {},
    ): Promise<TResponse> {
        return this.request<TResponse>({ ...config, url, data, method: "PATCH" });
    }

    public delete<TResponse>(url: string, config: RequestConfig = {}): Promise<TResponse> {
        return this.request<TResponse>({ ...config, url, method: "DELETE" });
    }

    public async download(url: string, config: RequestConfig = {}): Promise<Blob> {
        return this.request<Blob>({
            ...config,
            url,
            method: "GET",
            responseType: "blob",
        });
    }

    public async upload<TResponse>(
        url: string,
        form: FormData,
        config: RequestConfig = {},
    ): Promise<TResponse> {
        return this.request<TResponse>({
            ...config,
            url,
            method: "POST",
            data: form,
        });
    }

    private setupInterceptors(): void {
        this.axios.interceptors.request.use(async (cfg) => {
            const tokenGetter = this.options.hooks?.getAccessToken;
            if (tokenGetter) {
                const token = await tokenGetter();
                if (token) {
                    cfg.headers = cfg.headers ?? {};
                    (cfg.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
                }
            }
            return cfg;
        });

        this.axios.interceptors.response.use(
            (res) => res,
            (error: unknown) => Promise.reject(error),
        );
    }
}
