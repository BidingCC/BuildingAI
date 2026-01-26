import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import type {
    HttpClientConfig,
    HttpClientInstance,
    HttpRequestConfig,
    LogConfig,
    RetryConfig,
} from "./http-client.types.js";

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
    retries: 0,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    shouldRetry: () => true,
};

/**
 * 默认日志配置
 */
const DEFAULT_LOG_CONFIG: Required<Omit<LogConfig, "customLogger">> = {
    enableRequestLog: false,
    enableResponseLog: false,
    enableErrorLog: true,
};

/**
 * 延迟函数
 * @param ms 延迟时间(毫秒)
 * @returns Promise
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 格式化请求日志
 * @param config 请求配置
 * @returns 格式化后的日志信息
 */
const formatRequestLog = (config: InternalAxiosRequestConfig): string => {
    const { method = "GET", url, baseURL, params, data } = config;
    const fullUrl = baseURL ? `${baseURL}${url}` : url;

    const logParts = [
        `[HTTP Request]`,
        `${method.toUpperCase()} ${fullUrl}`,
        params ? `\nParams: ${JSON.stringify(params)}` : "",
        data ? `\nData: ${JSON.stringify(data)}` : "",
    ];

    return logParts.filter(Boolean).join(" ");
};

/**
 * 格式化响应日志
 * @param response 响应对象
 * @returns 格式化后的日志信息
 */
const formatResponseLog = (response: AxiosResponse): string => {
    const { status, statusText, config, data } = response;
    const { method = "GET", url } = config;

    return [
        `[HTTP Response]`,
        `${method.toUpperCase()} ${url}`,
        `Status: ${status} ${statusText}`,
        `Data: ${JSON.stringify(data)}`,
    ].join(" ");
};

/**
 * 格式化错误日志
 * @param error Axios 错误对象
 * @returns 格式化后的日志信息
 */
const formatErrorLog = (error: AxiosError): string => {
    const { config, response, message } = error;
    const method = config?.method?.toUpperCase() || "UNKNOWN";
    const url = config?.url || "UNKNOWN";
    const baseURL = config?.baseURL || "";
    const fullUrl = baseURL ? `${baseURL}${url}` : url;

    // 记录所有请求头（不脱敏）
    const allHeaders: Record<string, string> = {};
    if (config?.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
            allHeaders[key] = String(value);
        });
    }

    const logParts = [
        `[HTTP Error]`,
        `  Method: ${method}`,
        `  URL: ${fullUrl}`,
        response
            ? `  Status: ${response.status} ${response.statusText || ""}`
            : `  Error: ${message}`,
        `  Headers: ${JSON.stringify(allHeaders, null, 2)}`,
        config?.params ? `  Params: ${JSON.stringify(config.params, null, 2)}` : "  Params: {}",
        config?.data ? `  Data: ${JSON.stringify(config.data, null, 2)}` : "  Data: {}",
        response?.data ? `  Response: ${JSON.stringify(response.data, null, 2)}` : "  Response: {}",
        config?.timeout ? `  Timeout: ${config.timeout}ms` : "",
        `  Timestamp: ${new Date().toISOString()}`,
    ].filter(Boolean);

    return logParts.join("\n");
};

/**
 * 判断是否需要重试
 * @param error Axios 错误对象
 * @param retryConfig 重试配置
 * @returns 是否需要重试
 */
const shouldRetryRequest = (error: AxiosError, retryConfig: Required<RetryConfig>): boolean => {
    const { response } = error;
    const { retryStatusCodes, shouldRetry } = retryConfig;

    // 如果没有响应,不重试
    if (!response) {
        return false;
    }

    // 检查状态码是否在重试列表中
    const statusCodeMatch = retryStatusCodes.includes(response.status);

    // 使用自定义重试判断函数
    return statusCodeMatch && shouldRetry(error);
};

/**
 * 创建 HTTP 客户端实例
 * @param config HTTP 客户端配置
 * @returns HTTP 客户端实例
 *
 * @example
 * ```typescript
 * // 基础使用
 * const client = createHttpClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 * });
 *
 * // 发起请求
 * const data = await client.get<UserData>('/users/123');
 *
 * // 带重试配置
 * const client = createHttpClient({
 *   baseURL: 'https://api.example.com',
 *   retryConfig: {
 *     retries: 3,
 *     retryDelay: 1000,
 *   },
 * });
 *
 * // 带日志配置
 * const client = createHttpClient({
 *   baseURL: 'https://api.example.com',
 *   logConfig: {
 *     enableRequestLog: true,
 *     enableResponseLog: true,
 *   },
 * });
 * ```
 */
export function createHttpClient(config: HttpClientConfig = {}): HttpClientInstance {
    const {
        retryConfig = {},
        logConfig = {},
        autoTransformResponse = true,
        timeout = 10000,
        ...axiosConfig
    } = config;

    // 合并配置
    const mergedRetryConfig: Required<RetryConfig> = {
        ...DEFAULT_RETRY_CONFIG,
        ...retryConfig,
    };

    const mergedLogConfig: LogConfig = {
        ...DEFAULT_LOG_CONFIG,
        ...logConfig,
    };

    // 创建 Axios 实例
    const axiosInstance: AxiosInstance = axios.create({
        timeout,
        ...axiosConfig,
    });

    // 请求拦截器 - 日志记录
    axiosInstance.interceptors.request.use(
        (requestConfig: InternalAxiosRequestConfig) => {
            // 跳过日志
            const skipLog = (requestConfig as any).skipLog;
            if (skipLog) {
                return requestConfig;
            }

            // 记录请求日志
            if (mergedLogConfig.enableRequestLog) {
                if (mergedLogConfig.customLogger?.request) {
                    mergedLogConfig.customLogger.request(requestConfig);
                } else {
                    console.log(formatRequestLog(requestConfig));
                }
            }

            return requestConfig;
        },
        (error) => {
            return Promise.reject(error);
        },
    );

    // 响应拦截器 - 日志记录和数据转换
    axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => {
            // 跳过日志
            const skipLog = (response.config as any).skipLog;
            if (!skipLog && mergedLogConfig.enableResponseLog) {
                if (mergedLogConfig.customLogger?.response) {
                    mergedLogConfig.customLogger.response(response);
                } else {
                    console.log(formatResponseLog(response));
                }
            }

            // 自动转换响应数据
            return autoTransformResponse ? response.data : response;
        },
        async (error: AxiosError) => {
            const originalConfig = error.config as InternalAxiosRequestConfig & {
                __retryCount?: number;
                skipRetry?: boolean;
                skipLog?: boolean;
            };

            // 记录错误日志
            if (!originalConfig?.skipLog && mergedLogConfig.enableErrorLog) {
                if (mergedLogConfig.customLogger?.error) {
                    mergedLogConfig.customLogger.error(error);
                } else {
                    console.error(formatErrorLog(error));
                }
            }

            // 如果配置了重试且未跳过重试
            if (
                originalConfig &&
                !originalConfig.skipRetry &&
                mergedRetryConfig.retries > 0 &&
                shouldRetryRequest(error, mergedRetryConfig)
            ) {
                // 初始化重试计数
                originalConfig.__retryCount = originalConfig.__retryCount || 0;

                // 检查是否还能重试
                if (originalConfig.__retryCount < mergedRetryConfig.retries) {
                    originalConfig.__retryCount += 1;

                    // 延迟后重试
                    await delay(mergedRetryConfig.retryDelay);

                    console.log(
                        `[HTTP Retry] ${originalConfig.method?.toUpperCase()} ${originalConfig.url} - Attempt ${originalConfig.__retryCount}/${mergedRetryConfig.retries}`,
                    );

                    return axiosInstance.request(originalConfig);
                }
            }

            return Promise.reject(error);
        },
    );

    // 包装请求方法
    const client: HttpClientInstance = {
        get<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.get(url, config);
        },

        post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.post(url, data, config);
        },

        put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.put(url, data, config);
        },

        patch<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.patch(url, data, config);
        },

        delete<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.delete(url, config);
        },

        head<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.head(url, config);
        },

        options<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
            return axiosInstance.options(url, config);
        },

        request<T = any>(config: HttpRequestConfig): Promise<T> {
            return axiosInstance.request(config);
        },

        getUri(config?: HttpRequestConfig): string {
            return axiosInstance.getUri(config);
        },

        createCancelToken() {
            return axios.CancelToken.source();
        },

        interceptors: axiosInstance.interceptors,

        defaults: axiosInstance.defaults,
    };

    return client;
}

/**
 * 创建默认的 HTTP 客户端实例
 * 使用默认配置,适合快速使用
 *
 * @example
 * ```typescript
 * import { defaultHttpClient } from '@buildingai/utils';
 *
 * const data = await defaultHttpClient.get('https://api.example.com/users');
 * ```
 */
export const defaultHttpClient = createHttpClient({
    timeout: 10000,
    logConfig: {
        enableErrorLog: true,
    },
});
