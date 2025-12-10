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

import { InterceptorManager } from "../core/interceptor-manager";

function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Chat stream handler
 * Responsible for handling streaming chat requests
 */
export class ChatStream {
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
            ...restOptions
        } = config;

        // Create abort controller
        const abortController = new AbortController();
        let isAborted = false;

        // Build request body
        const requestBody = {
            messages,
            ...body,
        };

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
                const response = await fetch(fullUrl, {
                    method: "POST",
                    body: JSON.stringify(requestBody),
                    headers: {
                        "Content-Type": "application/json",
                        ...processedConfig.headers,
                    },
                    signal: abortController.signal,
                    ...restOptions,
                });

                // Call response callback
                if (onResponse) {
                    // eslint-disable-next-line no-useless-catch
                    try {
                        await onResponse(response);
                    } catch (err) {
                        throw err;
                    }
                }

                // Check response status
                if (!response.ok) {
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
                await this.processStream({
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
                    onError?.(error as Error);
                }
            }
        })();

        // Return controller immediately
        return controller;
    }

    /**
     * Process chat stream response
     */
    private async processStream({
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
        onToolCall?: (chunk: McpCallChunk<McpToolCall>) => void;
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
        };

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
                        // eslint-disable-next-line no-useless-catch
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
                                });
                            } else if (parsed.type === "reasoning" && parsed.data) {
                                // Handle deep thinking data
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
                                // Handle other types of messages (context, references, suggestions, annotations, etc.)
                                onUpdate?.({
                                    type: "metadata",
                                    message: { ...currentMessage },
                                    metadata: {
                                        type: parsed.type,
                                        data: parsed.data,
                                    },
                                });
                            }
                        } catch (e) {
                            // Parse failure can be ignored or warned
                            // console.warn("Failed to parse stream data:", line, e);
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
}
