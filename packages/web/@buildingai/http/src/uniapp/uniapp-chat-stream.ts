/**
 * @fileoverview UniApp Chat Stream Handler
 * @description UniApp platform chat stream using uni.request with requestTask
 *
 * @author BuildingAI Teams
 */

import type {
    ExtendedFetchOptions,
    McpCallChunk,
    McpCallType,
    McpToolCall,
} from "@buildingai/types";
import type {
    ChatMessage as HttpChatMessage,
    ChatStreamChunk,
    ChatStreamConfig,
} from "@buildingai/types/http/types";

import { InterceptorManager } from "../common/interceptor-manager";

function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * UniApp Chat stream handler
 * Uses uni.request for streaming chat requests
 * Note: UniApp has limited SSE support, this implementation uses polling or chunked transfer
 */
export class UniAppChatStream {
    constructor(
        private getBaseURL: () => string,
        private interceptorManager: InterceptorManager,
    ) {}

    /**
     * Create chat stream connection
     * @param url Chat API endpoint URL
     * @param config Chat configuration options
     * @returns Chat controller with control methods
     */
    async create(url: string, config: ChatStreamConfig): Promise<{ abort: () => void }> {
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
        } = config;

        // Create abort flag
        let isAborted = false;
        // @ts-expect-error - UniApp requestTask type
        let requestTask: any = null;

        // Build request body
        const requestBody = {
            messages,
            ...body,
        };

        // Create controller object (return immediately)
        const controller = {
            abort: () => {
                isAborted = true;
                if (requestTask && typeof requestTask.abort === "function") {
                    requestTask.abort();
                }
            },
        };

        // Async process stream, don't block controller return
        (async () => {
            try {
                // Execute request interceptors
                const processedConfig = await this.interceptorManager.runRequestInterceptors(
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...headers,
                        },
                        body: requestBody,
                    } as ExtendedFetchOptions,
                    false,
                );

                // Initiate request
                const baseURL = this.getBaseURL();
                const fullUrl = baseURL ? `${baseURL}${url}` : url;

                // @ts-expect-error - uni is a global object in UniApp environment
                requestTask = uni.request({
                    url: fullUrl,
                    method: "POST",
                    data: requestBody,
                    header: {
                        "Content-Type": "application/json",
                        ...processedConfig.headers,
                    },
                    // Enable chunked transfer for streaming
                    enableChunked: true,
                    success: (res: any) => {
                        if (isAborted) return;

                        // Call response callback
                        if (onResponse) {
                            onResponse(res);
                        }

                        // Check response status
                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            const error = new Error(res.data?.message || "Failed to fetch the chat response.");
                            onError?.(error);
                            return;
                        }

                        // Process response data
                        this.processResponse({
                            data: res.data,
                            onUpdate,
                            onFinish,
                            onError,
                            onToolCall,
                            generateId,
                            isAborted: () => isAborted,
                        });
                    },
                    fail: (err: any) => {
                        if (!isAborted) {
                            onError?.(new Error(err.errMsg || "Request failed"));
                        }
                    },
                });

                // Listen for chunked data (if supported)
                if (requestTask && typeof requestTask.onChunkReceived === "function") {
                    let buffer = "";
                    let contentBuffer = "";
                    const currentMessage: HttpChatMessage = {
                        id: generateId(),
                        role: "assistant",
                        content: "",
                    };

                    requestTask.onChunkReceived((res: any) => {
                        if (isAborted) return;

                        try {
                            // Decode chunk data
                            const chunk = new TextDecoder().decode(res.data);
                            buffer += chunk;

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
                                        this.handleParsedData(
                                            parsed,
                                            currentMessage,
                                            contentBuffer,
                                            onUpdate,
                                            onToolCall,
                                            (newContent) => {
                                                contentBuffer = newContent;
                                            },
                                        );
                                    } catch (_e) {
                                        // Parse failure can be ignored
                                    }
                                }
                            }
                        } catch (_e) {
                            // Chunk processing error
                        }
                    });
                }
            } catch (error) {
                if (!isAborted) {
                    onError?.(error as Error);
                }
            }
        })();

        // Return controller immediately
        return controller;
    }

    /**
     * Process non-streaming response data
     */
    private processResponse({
        data,
        onUpdate,
        onFinish,
        onError,
        onToolCall,
        generateId,
        isAborted,
    }: {
        data: any;
        onUpdate?: (chunk: ChatStreamChunk) => void;
        onFinish?: (message: HttpChatMessage) => void;
        onError?: (error: Error) => void;
        onToolCall?: (chunk: McpCallChunk<McpToolCall>) => void;
        generateId: () => string;
        isAborted: () => boolean;
    }): void {
        if (isAborted()) return;

        const currentMessage: HttpChatMessage = {
            id: generateId(),
            role: "assistant",
            content: "",
        };

        try {
            // Handle string response (SSE format)
            if (typeof data === "string") {
                let contentBuffer = "";
                const lines = data.split("\n");

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    if (trimmed === "data: [DONE]" || trimmed === "[DONE]") {
                        break;
                    }

                    if (trimmed.startsWith("data:")) {
                        const jsonStr = trimmed.slice(5).trim();
                        if (!jsonStr) continue;

                        try {
                            const parsed = JSON.parse(jsonStr);
                            this.handleParsedData(
                                parsed,
                                currentMessage,
                                contentBuffer,
                                onUpdate,
                                onToolCall,
                                (newContent) => {
                                    contentBuffer = newContent;
                                },
                            );
                        } catch (_e) {
                            // Ignore parse errors
                        }
                    }
                }

                currentMessage.content = contentBuffer;
            } else if (data && typeof data === "object") {
                // Handle JSON response
                if (data.content) {
                    currentMessage.content = data.content;
                    onUpdate?.({
                        type: "content",
                        message: { ...currentMessage },
                        delta: data.content,
                    });
                }
            }

            onFinish?.(currentMessage);
        } catch (error) {
            onError?.(error as Error);
        }
    }

    /**
     * Handle parsed SSE data
     */
    private handleParsedData(
        parsed: any,
        currentMessage: HttpChatMessage,
        contentBuffer: string,
        onUpdate?: (chunk: ChatStreamChunk) => void,
        onToolCall?: (chunk: McpCallChunk<McpToolCall>) => void,
        setContentBuffer?: (content: string) => void,
    ): void {
        if (parsed.type === "error") {
            throw new Error(parsed.data.message);
        } else if (parsed.type?.startsWith("mcp_tool_")) {
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
            const newContent = contentBuffer + parsed.data;
            setContentBuffer?.(newContent);
            currentMessage.content = newContent;
            onUpdate?.({
                type: "content",
                message: { ...currentMessage },
                delta: parsed.data,
            });
        } else if (parsed.type === "reasoning" && parsed.data) {
            onUpdate?.({
                type: "metadata",
                message: { ...currentMessage },
                metadata: {
                    type: "reasoning",
                    data: parsed.data,
                },
            });
        } else if (
            parsed.type === "context" ||
            parsed.type === "references" ||
            parsed.type === "suggestions" ||
            parsed.type === "conversation_id" ||
            parsed.type === "annotations"
        ) {
            onUpdate?.({
                type: "metadata",
                message: { ...currentMessage },
                metadata: {
                    type: parsed.type,
                    data: parsed.data,
                },
            });
        }
    }
}

