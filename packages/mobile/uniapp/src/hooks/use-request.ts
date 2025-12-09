import type { RequestOptions } from "@buildingai/types";

import { useUserStore } from "@/stores/user";

interface ApiResponse<T = unknown> {
    code: number;
    data: T;
    message?: string;
}

const getBaseUrl = (): string => {
    console.log(
        import.meta.env.VITE_DEVELOP_APP_BASE_URL,
        import.meta.env.VITE_PRODUCTION_APP_BASE_URL,
    );
    if (import.meta.env.DEV) {
        return import.meta.env.VITE_DEVELOP_APP_BASE_URL || "";
    }
    return import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
};

const WEB_PREFIX = import.meta.env.VITE_APP_WEB_API_PREFIX || "/api";
const CONSOLE_PREFIX = import.meta.env.VITE_APP_CONSOLE_API_PREFIX || "/consoleapi";

async function request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    url: string,
    prefix: string,
    params?: Record<string, unknown>,
    data?: Record<string, unknown>,
    options?: RequestOptions,
): Promise<T> {
    const baseUrl = getBaseUrl();

    console.log(baseUrl, prefix, url);
    const fullUrl = `${baseUrl}${prefix}${url}`;

    const requestParams: UniApp.RequestOptions = {
        url: fullUrl,
        method: method as UniApp.RequestOptions["method"],
        timeout: options?.timeout || 30000,
        header: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    };

    const token: string | null = useUserStore().token;
    if (token && options?.requireAuth !== false) {
        requestParams.header = {
            ...requestParams.header,
            Authorization: `Bearer ${token}`,
        };
    }

    if (method === "GET") {
        requestParams.data = params;
    } else {
        requestParams.data = data;
    }

    return new Promise<T>((resolve, reject) => {
        uni.request({
            ...requestParams,
            success: (res) => {
                if (!options?.skipBusinessCheck) {
                    const response = res.data as ApiResponse<T>;
                    if (response.code > 300 && response.code < 200) {
                        const error = new Error(response.message || "请求失败");
                        if (options?.onError) {
                            options.onError(error);
                        }
                        reject(error);
                        return;
                    }

                    if (options?.returnFullResponse) {
                        resolve(res.data as T);
                    } else {
                        resolve(response.data);
                    }
                } else {
                    resolve(res.data as T);
                }
            },
            fail: (err) => {
                console.log("error", err);
                const error = new Error(err.errMsg || "请求失败");
                if (options?.onError) {
                    options.onError(error);
                }
                reject(error);
            },
        });
    });
}

export const useWebGet = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("GET", url, WEB_PREFIX, params, undefined, options);
};

export const useWebPost = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("POST", url, WEB_PREFIX, undefined, data, options);
};

export const useWebPut = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("PUT", url, WEB_PREFIX, undefined, data, options);
};

export const useWebDelete = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("DELETE", url, WEB_PREFIX, undefined, data, options);
};

export const useWebPatch = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("PATCH", url, WEB_PREFIX, undefined, data, options);
};

export const useConsoleGet = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("GET", url, CONSOLE_PREFIX, params, undefined, {
        requireAuth: true,
        ...options,
    });
};

export const useConsolePost = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("POST", url, CONSOLE_PREFIX, undefined, data, {
        requireAuth: true,
        ...options,
    });
};

export const useConsolePut = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("PUT", url, CONSOLE_PREFIX, undefined, data, {
        requireAuth: true,
        ...options,
    });
};

export const useConsoleDelete = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("DELETE", url, CONSOLE_PREFIX, undefined, data, {
        requireAuth: true,
        ...options,
    });
};

export const useConsolePatch = <T = unknown>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: Record<string, any>,
    options?: RequestOptions,
): Promise<T> => {
    return request<T>("PATCH", url, CONSOLE_PREFIX, undefined, data, {
        requireAuth: true,
        ...options,
    });
};
