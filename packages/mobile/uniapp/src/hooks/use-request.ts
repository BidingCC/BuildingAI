import type {
    ChatMessage as HttpChatMessage,
    ChatStreamChunk,
    ChatStreamConfig,
    McpCallChunk,
    McpCallType,
    RequestOptions,
} from "@buildingai/types";

import i18n from "@/i18n";
import { useUserStore } from "@/stores/user";
import { objectToQuery } from "@/utils/navigate";

interface ApiResponse<T = unknown> {
    code: number;
    data: T;
    message?: string;
}

interface UploadResponse {
    id?: string;
    url: string;
    originalName?: string;
    size?: number;
    type?: string;
    extension?: string;
    [key: string]: unknown;
}

export const getBaseUrl = (): string => {
    if (import.meta.env.DEV) {
        return import.meta.env.VITE_DEVELOP_APP_BASE_URL || "";
    }
    return import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
};

const WEB_PREFIX = import.meta.env.VITE_APP_WEB_API_PREFIX || "/api";
const CONSOLE_PREFIX = import.meta.env.VITE_APP_CONSOLE_API_PREFIX || "/consoleapi";

/**
 * Generate UUID
 * @returns UUID string
 */
function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

const handleHttpError = (
    status: number,
    errorMessage: string,
    errorPath = "",
    options?: RequestOptions,
): Error => {
    switch (status) {
        case 400:
            useToast().error(`${i18n.global.t("common.request.400")}: ${errorMessage}`);
            return new Error(`${i18n.global.t("common.request.400")}: ${errorMessage}${errorPath}`);

        case 401:
            if (options?.requireAuth) {
                useUserStore().toLogin();
            }
            if (options?.requireAuth !== false) {
                useToast().error(`${i18n.global.t("common.request.401")}: ${errorMessage}`);
            }
            useUserStore().clearToken();
            return new Error(`${i18n.global.t("common.request.401")}: ${errorMessage}`);

        case 403:
            useToast().error(`${i18n.global.t("common.request.403")}: ${errorMessage}`);
            return new Error(`${i18n.global.t("common.request.403")}: ${errorMessage}${errorPath}`);

        case 404:
            useToast().error(`${i18n.global.t("common.request.404")}: ${errorMessage}${errorPath}`);
            return new Error(`${i18n.global.t("common.request.404")}: ${errorMessage}${errorPath}`);

        case 500:
            useToast().error(`${i18n.global.t("common.request.500")}: ${errorMessage}${errorPath}`);
            return new Error(`${i18n.global.t("common.request.500")}: ${errorMessage}${errorPath}`);

        default:
            useToast().error(errorMessage + errorPath);
            return new Error(`HTTP Error ${status}: ${errorMessage}${errorPath}`);
    }
};

async function request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    url: string,
    prefix: string,
    params?: Record<string, unknown>,
    data?: Record<string, unknown>,
    options?: RequestOptions,
): Promise<T> {
    const baseUrl = getBaseUrl();

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

    // Check user authentication
    if (options?.requireAuth === false && !token && !useUserStore().temporaryToken) {
        throw new Error("User not logged in, please login first and try again");
    }

    if (token) {
        requestParams.header = {
            ...requestParams.header,
            Authorization: `Bearer ${token}`,
        };
    }

    if (method === "GET") {
        if (params && Object.keys(params).length > 0) {
            const queryString = objectToQuery(params);
            if (queryString) {
                requestParams.url = `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}${queryString}`;
            }
            // GET 请求不需要 data 参数，参数已经在 URL 中
            requestParams.data = undefined;
        }
    } else {
        requestParams.data = data;
    }

    return new Promise<T>((resolve, reject) => {
        uni.request({
            ...requestParams,
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (!options?.skipBusinessCheck) {
                        const response = res.data as ApiResponse<T>;
                        if (options?.returnFullResponse) {
                            resolve(res.data as T);
                        } else {
                            resolve(response.data);
                        }
                    } else {
                        resolve(res.data as T);
                    }
                } else {
                    const errorMessage =
                        (res.data as ApiResponse<T>)?.message ||
                        i18n.global.t("common.requestFailed");
                    const error = handleHttpError(res.statusCode, errorMessage, url, options);
                    if (options?.onError) {
                        options.onError(error);
                    }
                    reject(error);
                }
            },
            fail: (err) => {
                console.log("error", err);
                const error = new Error(err.errMsg || i18n.global.t("common.requestFailed"));
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

/**
 * @example
 * ```typescript
 * const uploadTask = useUpload({
 *   data: { file: fileObject, extensionId: 'xxx' },
 *   success: (res) => {
 *     console.log('Upload success:', res);
 *   },
 *   fail: (errMsg) => {
 *     console.error('Upload failed:', errMsg);
 *   }
 * });
 *
 * uploadTask.onProgressUpdate((res) => {
 *   console.log('Progress:', res.progress);
 *   console.log('Total bytes:', res.totalBytesExpectedToSend);
 *   console.log('Sent bytes:', res.totalBytesSent);
 * });
 * ```
 */
export const useUpload = <T = UploadResponse>(opts: {
    data: { file: File | string; extensionId?: string; [key: string]: unknown };
    success: (res: T) => void;
    fail: (errMsg: string) => void;
    complete?: () => void;
}): UniApp.UploadTask => {
    const { data, success, fail, complete } = opts;
    const { file, ...formData } = data;

    let fileInfo: { filePath?: string; file?: File };
    if (typeof file === "string") {
        fileInfo = { filePath: file };
    } else {
        fileInfo = { file };
    }

    const userStore = useUserStore();
    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${WEB_PREFIX}/upload/file`;

    return uni.uploadFile({
        header: {
            Authorization: userStore.token ? `Bearer ${userStore.token}` : "",
        },
        url: fullUrl,
        name: "file",
        timeout: 30000,
        ...fileInfo,
        formData,
        success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const result = JSON.parse(res.data) as ApiResponse<T>;
                    success(result.data);
                    userStore.refreshToken();
                } catch (error) {
                    console.error("Parse upload response error:", error);
                    const errorMsg = i18n.global.t("common.parseResponseFailed");
                    useToast().error(errorMsg);
                    fail(errorMsg);
                }
            } else {
                try {
                    const result = JSON.parse(res.data) as ApiResponse<T>;
                    const errorMessage = result.message || i18n.global.t("common.uploadFailed");
                    const error = handleHttpError(res.statusCode, errorMessage);
                    fail(error.message);
                } catch (_parseError) {
                    const error = handleHttpError(
                        res.statusCode,
                        i18n.global.t("common.uploadFailed"),
                    );
                    fail(error.message);
                }
            }
            console.log("Upload success:", res);
        },
        fail: (err) => {
            console.error("Upload error:", err);
            const errorMsg = err.errMsg || i18n.global.t("common.uploadFailed");
            useToast().error(errorMsg);
            fail(errorMsg);
        },
        complete: () => {
            complete?.();
        },
    });
};

/**
 * @example
 * ```typescript
 * useDownloadFile({
 *   type: 'image',
 *   fileUrl: 'https://example.com/image.jpg',
 *   success: (res) => {
 *     console.log('Download success:', res);
 *   },
 *   fail: (errMsg) => {
 *     console.error('Download failed:', errMsg);
 *   }
 * });
 * ```
 */
export const useDownloadFile = (opts: {
    type: "image" | "video";
    fileUrl: string;
    success: (res: unknown) => void;
    fail: (errMsg: string) => void;
    complete?: () => void;
}): void => {
    const { type, fileUrl, success, fail, complete } = opts;

    if (fileUrl === "") {
        const errorMsg = i18n.global.t("common.filePathEmpty");
        useToast().error(errorMsg);
        fail(errorMsg);
        return;
    }

    uni.downloadFile({
        url: fileUrl,
        timeout: 30000,
        success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const handler: Record<string, () => void> = {
                    image: () => {
                        uni.saveImageToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: (saveRes) => {
                                useToast().success(i18n.global.t("common.savedToAlbum"));
                                success(saveRes);
                            },
                            fail: (saveErr) => {
                                if (
                                    saveErr.errMsg ===
                                    "saveImageToPhotosAlbum:fail invalid file type"
                                ) {
                                    useToast().error(i18n.global.t("common.downloadFormatError"));
                                } else {
                                    useToast().error(i18n.global.t("common.savePhotoFailed"));
                                }
                                fail(
                                    `${i18n.global.t("common.savePhotoFailed")}: ${saveErr.errMsg}`,
                                );
                            },
                        });
                    },
                    video: () => {
                        uni.saveVideoToPhotosAlbum({
                            filePath: res.tempFilePath,
                            success: (saveRes) => {
                                useToast().success(i18n.global.t("common.savedToAlbum"));
                                success(saveRes);
                            },
                            fail: (saveErr) => {
                                if (
                                    saveErr.errMsg ===
                                    "saveImageToPhotosAlbum:fail invalid file type"
                                ) {
                                    useToast().error(i18n.global.t("common.downloadFormatError"));
                                } else {
                                    useToast().error(i18n.global.t("common.saveVideoFailed"));
                                }
                                fail(
                                    `${i18n.global.t("common.saveVideoFailed")}: ${saveErr.errMsg}`,
                                );
                            },
                        });
                    },
                };

                const downloadHandler = handler[type];
                if (downloadHandler) {
                    downloadHandler();
                } else {
                    fail(i18n.global.t("common.unsupportedFileType"));
                }
            } else {
                const error = handleHttpError(
                    res.statusCode,
                    i18n.global.t("common.downloadFailed"),
                );
                fail(error.message);
            }
        },
        fail: (err) => {
            console.error("Download error:", err);
            const errorMsg = typeof err !== "string" ? JSON.stringify(err) : err;
            useToast().error(i18n.global.t("common.downloadFailed"));
            fail(errorMsg);
        },
        complete: () => {
            complete?.();
        },
    });
};

/**
 * Create stream request for chat
 * @description Creates a streaming chat request using fetch API (H5 only)
 * @param url Chat API endpoint URL (relative to WEB_PREFIX)
 * @param config Chat stream configuration
 * @returns Promise with stream controller containing abort method
 * @example
 * ```typescript
 * const controller = await useStream("/ai-chat/stream", {
 *   messages: [{ role: "user", content: "Hello" }],
 *   onUpdate: (chunk) => {
 *     console.log("Received chunk:", chunk);
 *   },
 *   onFinish: (message) => {
 *     console.log("Stream finished:", message);
 *   },
 *   onError: (error) => {
 *     console.error("Stream error:", error);
 *   }
 * });
 *
 * // Abort the stream
 * controller.abort();
 * ```
 */
export const useStream = (
    url: string,
    config: ChatStreamConfig,
): Promise<{ abort: () => void }> => {
    // #ifndef H5
    throw new Error("useStream is only available in H5 platform");
    // #endif

    // #ifdef H5
    const {
        messages,
        body = {},
        onResponse,
        onToolCall,
        onUpdate,
        onFinish,
        onError,
        generateId = () => uuid(),
        headers = {},
        ...restOptions
    } = config;

    // Build request body
    const requestBody = {
        messages,
        ...body,
    };

    // Build full URL
    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${WEB_PREFIX}${url}`;

    // Get token
    const token: string | null = useUserStore().token;
    const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
    };

    if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
    }

    // Create abort controller
    const abortController = new AbortController();
    let isAborted = false;

    // Create controller object (return immediately)
    const controller = {
        abort: () => {
            isAborted = true;
            abortController.abort();
        },
    };

    // Async process stream, don't block controller return
    (async () => {
        try {
            // Initiate request
            const response = await fetch(fullUrl, {
                method: "POST",
                body: JSON.stringify(requestBody),
                headers: requestHeaders,
                signal: abortController.signal,
                ...restOptions,
            });

            // Call response callback
            if (onResponse) {
                try {
                    await onResponse(response);
                } catch (err) {
                    throw err;
                }
            }

            // Check response status (201 Created is also a success status)
            if (!response.ok && response.status !== 201) {
                const errorText = await response.text();
                const error = new Error(errorText || "Failed to fetch the chat response.");
                onError?.(error);
                throw error;
            }

            if (!response.body) {
                const error = new Error("The response body is empty.");
                onError?.(error);
                throw error;
            }

            // Process streaming response
            await processStream({
                stream: response.body,
                onUpdate,
                onFinish,
                onError,
                onToolCall,
                generateId,
                abortController,
            });
        } catch (error) {
            if (!isAborted) {
                const err =
                    error instanceof Error ? error : new Error(String(error) || "Unknown error");
                // Check if it's a network error that we can handle gracefully
                if (
                    err.message.includes("ERR_INCOMPLETE_CHUNKED_ENCODING") ||
                    err.message.includes("network error")
                ) {
                    console.warn("Network error during stream, may be recoverable:", err.message);
                }
                onError?.(err);
            }
        }
    })();

    // Return controller immediately
    return Promise.resolve(controller);
    // #endif
};

/**
 * Process chat stream response
 * @description Processes the ReadableStream from fetch response
 */
// #ifdef H5
async function processStream({
    stream,
    onUpdate,
    onToolCall,
    onFinish,
    onError,
    generateId,
    abortController,
}: {
    stream: ReadableStream;
    onUpdate?: (chunk: ChatStreamChunk) => void;
    onToolCall?: (chunk: McpCallChunk<unknown>) => void;
    onFinish?: (message: HttpChatMessage) => void;
    onError?: (error: Error) => void;
    generateId: () => string;
    abortController: AbortController;
}): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let contentBuffer = "";
    const currentMessage: HttpChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
    } as HttpChatMessage;

    // Export currentMessage for use in error handling
    (processStream as any).currentMessage = currentMessage;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;
            if (abortController.signal.aborted) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed === "data: [DONE]" || trimmed === "[DONE]") {
                    onFinish?.(currentMessage);
                    return;
                }

                if (trimmed.startsWith("data:")) {
                    const jsonStr = trimmed.slice(5).trim();
                    if (!jsonStr) continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.type === "error") {
                            throw new Error(parsed.data.message);
                        } else if (parsed.type.startsWith("mcp_tool_")) {
                            const type: McpCallType = parsed.type.replace(/^mcp_tool_/, "");
                            if (type === "error") {
                                throw new Error(parsed.data.message);
                            } else {
                                onToolCall?.({
                                    type,
                                    data: parsed.data,
                                });
                            }
                        } else if (parsed.type === "chunk" && parsed.data) {
                            contentBuffer += parsed.data;
                            currentMessage.content = contentBuffer;
                            onUpdate?.({
                                type: "content",
                                message: { ...currentMessage },
                                delta: parsed.data,
                            } as ChatStreamChunk);
                        } else if (parsed.type === "reasoning" && parsed.data) {
                            // Handle deep thinking data
                            onUpdate?.({
                                type: "metadata",
                                message: { ...currentMessage },
                                metadata: {
                                    type: "reasoning",
                                    data: parsed.data,
                                },
                            } as ChatStreamChunk);
                        } else if (
                            parsed.type === "context" ||
                            parsed.type === "references" ||
                            parsed.type === "suggestions" ||
                            parsed.type === "conversation_id" ||
                            parsed.type === "annotations"
                        ) {
                            // Handle other types of messages
                            onUpdate?.({
                                type: "metadata",
                                message: { ...currentMessage },
                                metadata: {
                                    type: parsed.type,
                                    data: parsed.data,
                                },
                            } as ChatStreamChunk);
                        }
                    } catch (e) {
                        // Parse failure can be ignored or warned
                        throw e;
                    }
                }
            }
        }

        // If we reach here without calling onFinish, the stream ended normally
        if (!abortController.signal.aborted) {
            onFinish?.(currentMessage);
        }
    } catch (error) {
        onError?.(error as Error);
        throw error;
    } finally {
        reader.releaseLock();
    }
}
// #endif
