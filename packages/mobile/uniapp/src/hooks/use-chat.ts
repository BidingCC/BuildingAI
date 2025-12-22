/**
 * @fileoverview Chat composable hook for mobile uniapp
 * @description This file contains the useChat composable for managing chat state and streaming
 * @author BuildingAI Teams
 */

import type { McpToolCall } from "@buildingai/service/consoleapi/mcp-server";
import type { AiMessage, FilesList } from "@buildingai/service/models/message";
import type { MessageContent, MessageContentPart } from "@buildingai/types";

import { getBaseUrl } from "@/hooks/use-request";
import { useUserStore } from "@/stores/user";

/**
 * Generate UUID
 * @returns UUID string
 */
export function generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Chat configuration interface
 */
export interface ChatConfig {
    /** Avatar URL for assistant messages */
    avatar?: string;
    [key: string]: unknown;
}

/**
 * Stream client instance interface
 */
export interface StreamClientInstance {
    /** Start chat stream */
    startChat: (config: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        timeout?: number;
        heartbeatTimeout?: number;
        maxRetryCount?: number;
    }) => void;
    /** Stop chat stream */
    stopChat: (...args: unknown[]) => void;
}

/**
 * Stream message update chunk
 */
export interface StreamUpdateChunk {
    type: string;
    message?: AiMessage;
    delta?: string;
    data?: unknown;
}

/**
 * Parsed stream message
 */
interface ParsedStreamMessage {
    type?: string;
    data?: string | { message?: string; id?: string; [key: string]: unknown };
    metadata?: {
        type?: string;
        data?: unknown;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/**
 * HTTP Response interface
 */
export interface HttpResponse {
    status?: number;
    statusText?: string;
    headers?: Headers | Record<string, string>;
    [key: string]: unknown;
}

/**
 * UseChat options interface
 */
export interface UseChatOptions {
    /** Conversation ID */
    id?: string | (() => string | undefined);
    /** Initial messages to display */
    initialMessages?: AiMessage[];
    /** Additional body parameters for API requests */
    body?: Record<string, unknown> | (() => Record<string, unknown>);
    /** API endpoint URL (relative to base URL, e.g., "/ai-chat/stream") */
    apiUrl?: string;
    /** Callback when tool is called */
    onToolCall?: (message: McpToolCall) => void;
    /** Callback when response is received */
    onResponse?: (response: HttpResponse) => void | Promise<void>;
    /** Callback when stream chunk is received */
    onUpdate?: (chunk: StreamUpdateChunk) => void;
    /** Callback when error occurs */
    onError?: (error: Error) => void;
    /** Callback when stream finishes */
    onFinish?: (message: AiMessage) => void;
    /** Chat configuration */
    chatConfig?: ChatConfig;
    /** Stream client timeout (ms) */
    timeout?: number;
    /** Heartbeat timeout (ms) */
    heartbeatTimeout?: number;
    /** Max retry count */
    maxRetryCount?: number;
    /** Custom stream URL builder (overrides apiUrl if provided) */
    buildStreamUrl?: () => string;
    /** Custom headers builder */
    buildHeaders?: () => Record<string, string>;
}

/**
 * Chat status type
 */
export type ChatStatus = "idle" | "loading" | "error" | "completed";

/**
 * UseChat return interface
 */
export interface UseChatReturn {
    /** Current messages */
    messages: Ref<AiMessage[]>;
    /** Input value */
    input: Ref<string>;
    /** Files list */
    files: Ref<FilesList>;
    /** Current status */
    status: Ref<ChatStatus>;
    /** Error object if any */
    error: Ref<Error | null>;
    /** Handle form submission */
    handleSubmit: (event?: Event | string) => Promise<void>;
    /** Reload last message */
    reload: () => Promise<void>;
    /** Stop current stream */
    stop: () => void;
    /** Set messages directly */
    setMessages: (messages: AiMessage[]) => void;
    /** Append a new message */
    append: (message: AiMessage) => Promise<void>;
    /** Stream client ref (for template usage) */
    streamClientRef: Ref<StreamClientInstance | null>;
    /** Handle stream open event */
    handleStreamOpen: () => void;
    /** Handle stream message event */
    handleStreamMessage: (msg: { data: string; event?: string }) => void;
    /** Handle stream error event */
    handleStreamError: (err: string | Error) => void;
    /** Handle stream finish event */
    handleStreamFinish: () => void;
    /** Handle retry upper limit event */
    handleRetryUpperLimit: () => void;
    /** Stream client timeout (ms) */
    timeout: number;
    /** Stream client heartbeat timeout (ms) */
    heartbeatTimeout: number;
    /** Stream client max retry count */
    maxRetryCount: number;
}

/**
 * Chat composable hook similar to @ai-sdk/vue useChat
 * @description Manages chat state and streaming for AI conversations
 * @param options - Configuration options for the chat
 * @returns Chat state and control functions
 * @example
 * ```typescript
 * const { messages, input, handleSubmit, status } = useChat({
 *   api: apiChatStream,
 *   initialMessages: [],
 *   body: {
 *     modelId: "model-123",
 *     conversationId: "conv-456",
 *   },
 *   onFinish: (message) => {
 *     console.log("Chat finished:", message);
 *   },
 * });
 * ```
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const {
        id,
        initialMessages = [],
        body = {},
        apiUrl = "/ai-chat/stream",
        onUpdate,
        onError,
        onFinish,
        onToolCall,
        chatConfig,
        timeout = 300000,
        heartbeatTimeout = 120000,
        maxRetryCount = 5,
        buildStreamUrl: customBuildStreamUrl,
        buildHeaders: customBuildHeaders,
    } = options;

    const userStore = useUserStore();
    const messages = ref<AiMessage[]>([...initialMessages]);
    const input = ref<string>("");
    const files = ref<FilesList>([]);
    const status = ref<ChatStatus>("idle");
    const error = ref<Error | null>(null);
    const streamClientRef = ref<StreamClientInstance | null>(null);
    const currentAssistantMessage = ref<AiMessage | null>(null);
    const messageHistory = ref<AiMessage[]>([]);
    const reactiveChatConfig = computed(() => chatConfig || {});

    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    const UPDATE_DEBOUNCE_MS = 50;

    messageHistory.value = [...initialMessages];

    /**
     * 创建助手消息对象
     */
    const createAssistantMessage = (): AiMessage => {
        return {
            id: generateUuid(),
            role: "assistant",
            content: "",
            status: "loading",
            mcpToolCalls: [],
            metadata: {},
            avatar: reactiveChatConfig.value.avatar,
        };
    };

    /**
     * 更新 messages 数组中的消息
     */
    const updateMessageInArray = (message: AiMessage) => {
        const messageIndex = messages.value.findIndex((msg) => msg.id === message.id);
        if (messageIndex >= 0) {
            messages.value[messageIndex] = { ...message };
        }
    };

    /**
     * 确保助手消息已创建
     */
    const ensureAssistantMessage = (): boolean => {
        if (!currentAssistantMessage.value) {
            currentAssistantMessage.value = createAssistantMessage();
            messages.value.push({ ...currentAssistantMessage.value });
            return true;
        }
        return false;
    };

    /**
     * 批量更新消息（防抖）
     */
    const debouncedUpdate = (callback: () => void) => {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(() => {
            callback();
            updateTimer = null;
        }, UPDATE_DEBOUNCE_MS);
    };

    const clearUpdateTimer = () => {
        if (updateTimer) {
            clearTimeout(updateTimer);
            updateTimer = null;
        }
    };

    const setMessages = (newMessages: AiMessage[]) => {
        messages.value = [...newMessages];
        messageHistory.value = [...newMessages];
    };

    const getConversationId = (): string | undefined => {
        return typeof id === "function" ? id() : id;
    };

    const getBody = (): Record<string, unknown> => {
        return typeof body === "function" ? body() : body;
    };

    const buildStreamUrl = (): string => {
        if (customBuildStreamUrl) {
            return customBuildStreamUrl();
        }
        const baseUrl = getBaseUrl();
        const WEB_PREFIX = import.meta.env.VITE_APP_WEB_API_PREFIX || "/api";
        const normalizedApiUrl = apiUrl.startsWith("/") ? apiUrl : `/${apiUrl}`;
        return `${baseUrl}${WEB_PREFIX}${normalizedApiUrl}`;
    };

    const buildHeaders = (): Record<string, string> => {
        if (customBuildHeaders) {
            return customBuildHeaders();
        }
        const token = userStore.token;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    };

    const buildRequestBody = () => {
        const historyMessages = messageHistory.value.map((msg) => {
            let content = msg.content;
            if (Array.isArray(content)) {
                content = content.map((item) => {
                    if (typeof item === "object" && item !== null) {
                        return { ...item };
                    }
                    return item;
                });
            }
            return {
                role: msg.role as "user" | "assistant" | "system",
                content: content,
            };
        });

        const bodyParams = getBody();
        const requestBody = {
            messages: historyMessages,
            saveConversation: true,
            conversationId: getConversationId(),
            ...bodyParams,
        };

        return JSON.parse(JSON.stringify(requestBody));
    };

    const append = async (message: AiMessage) => {
        const messageWithId = {
            id: generateUuid(),
            ...message,
        };

        messages.value.push(messageWithId);
        messageHistory.value.push(messageWithId);

        if (message.role === "user") {
            await generateAIResponse();
        }
    };

    const parseStreamMessage = (msg: { data: string; event?: string }) => {
        if (!msg.data) {
            return;
        }

        const dataLines = msg.data.split("\n").filter((line) => line.trim());

        for (const line of dataLines) {
            const trimmedLine = line.trim();
            if (trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
                clearUpdateTimer();
                handleStreamFinish();
                return;
            }

            let jsonStr = trimmedLine;
            if (jsonStr.startsWith("data:")) {
                jsonStr = jsonStr.slice(5).trim();
            }
            if (!jsonStr) {
                continue;
            }

            try {
                const parsed = JSON.parse(jsonStr) as ParsedStreamMessage;

                if (parsed.type === "error") {
                    const errorData = parsed.data as { message?: string } | undefined;
                    const errorMsg = errorData?.message || "未知错误";
                    error.value = new Error(errorMsg);
                    status.value = "error";
                    if (currentAssistantMessage.value) {
                        currentAssistantMessage.value.status = "failed";
                        currentAssistantMessage.value.content = errorMsg;
                    }
                    onError?.(new Error(errorMsg));
                    return;
                }

                if (parsed.type?.startsWith("mcp_tool_")) {
                    const type = parsed.type.replace(/^mcp_tool_/, "");
                    const toolData = parsed.data as McpToolCall | { message?: string } | undefined;
                    if (type === "error") {
                        const errorMsg =
                            (toolData as { message?: string })?.message || "工具调用错误";
                        error.value = new Error(errorMsg);
                        onError?.(new Error(errorMsg));
                    } else if (currentAssistantMessage.value && toolData) {
                        if (!currentAssistantMessage.value.mcpToolCalls) {
                            currentAssistantMessage.value.mcpToolCalls = [];
                        }
                        const toolCall = toolData as McpToolCall;
                        const index = currentAssistantMessage.value.mcpToolCalls.findIndex(
                            (item) => item.id === toolCall.id,
                        );
                        if (index >= 0) {
                            currentAssistantMessage.value.mcpToolCalls[index] = toolCall;
                        } else {
                            currentAssistantMessage.value.mcpToolCalls.push(toolCall);
                        }
                        onToolCall?.(toolCall);
                    }
                    return;
                }

                if (parsed.type === "chunk" && parsed.data && typeof parsed.data === "string") {
                    const chunkData = parsed.data;
                    const isNewMessage = ensureAssistantMessage();

                    if (currentAssistantMessage.value) {
                        if (isNewMessage) {
                            currentAssistantMessage.value.content = chunkData;
                        } else {
                            currentAssistantMessage.value.content += chunkData;
                            currentAssistantMessage.value.status = "active";
                        }

                        if (isNewMessage) {
                            onUpdate?.({
                                type: "content",
                                message: { ...currentAssistantMessage.value },
                                delta: chunkData,
                            });
                        } else {
                            debouncedUpdate(() => {
                                if (currentAssistantMessage.value) {
                                    updateMessageInArray(currentAssistantMessage.value);
                                    onUpdate?.({
                                        type: "content",
                                        message: { ...currentAssistantMessage.value },
                                        delta: chunkData,
                                    });
                                }
                            });
                        }
                    }
                    return;
                }

                if (parsed.type === "metadata" && parsed.metadata) {
                    ensureAssistantMessage();
                    if (!currentAssistantMessage.value?.metadata) {
                        if (currentAssistantMessage.value) {
                            currentAssistantMessage.value.metadata = {};
                        }
                    }

                    const metadata = parsed.metadata as { type?: string; data?: unknown };
                    const { type: metaType, data } = metadata;
                    if (metaType === "conversation_id") {
                        onUpdate?.({ type: "conversation_id", data });
                    } else if (
                        metaType === "reasoning" &&
                        typeof data === "string" &&
                        currentAssistantMessage.value?.metadata
                    ) {
                        if (!currentAssistantMessage.value.metadata.reasoning) {
                            currentAssistantMessage.value.metadata.reasoning = {
                                content: data,
                                startTime: Date.now(),
                            };
                        } else {
                            currentAssistantMessage.value.metadata.reasoning.content += data;
                        }
                    } else if (metaType && currentAssistantMessage.value?.metadata) {
                        currentAssistantMessage.value.metadata[metaType] = data;
                    }

                    if (currentAssistantMessage.value) {
                        updateMessageInArray(currentAssistantMessage.value);
                        onUpdate?.({
                            type: "metadata",
                            message: { ...currentAssistantMessage.value },
                        });
                    }
                    return;
                }

                if (parsed.type === "reasoning" && parsed.data && typeof parsed.data === "string") {
                    ensureAssistantMessage();
                    if (currentAssistantMessage.value) {
                        if (!currentAssistantMessage.value.metadata) {
                            currentAssistantMessage.value.metadata = {};
                        }
                        if (!currentAssistantMessage.value.metadata.reasoning) {
                            currentAssistantMessage.value.metadata.reasoning = {
                                content: parsed.data,
                                startTime: Date.now(),
                            };
                        } else {
                            currentAssistantMessage.value.metadata.reasoning.content += parsed.data;
                        }
                        updateMessageInArray(currentAssistantMessage.value);
                    }
                    return;
                }

                const metadataTypes = [
                    "context",
                    "references",
                    "suggestions",
                    "conversation_id",
                    "annotations",
                    "tokenUsage",
                ];
                if (parsed.type && metadataTypes.includes(parsed.type)) {
                    ensureAssistantMessage();
                    if (parsed.type === "conversation_id") {
                        onUpdate?.({ type: "conversation_id", data: parsed.data });
                    } else if (parsed.type && currentAssistantMessage.value) {
                        if (!currentAssistantMessage.value.metadata) {
                            currentAssistantMessage.value.metadata = {};
                        }
                        currentAssistantMessage.value.metadata[parsed.type] = parsed.data;
                    }
                    return;
                }
            } catch (_err) {
                if (line && line.trim() && !line.startsWith("data:")) {
                    const isNewMessage = ensureAssistantMessage();
                    if (currentAssistantMessage.value) {
                        if (isNewMessage) {
                            currentAssistantMessage.value.content = line;
                            onUpdate?.({
                                type: "content",
                                message: { ...currentAssistantMessage.value },
                                delta: line,
                            });
                        } else {
                            currentAssistantMessage.value.content += line;
                            currentAssistantMessage.value.status = "active";
                            debouncedUpdate(() => {
                                if (currentAssistantMessage.value) {
                                    updateMessageInArray(currentAssistantMessage.value);
                                    onUpdate?.({
                                        type: "content",
                                        message: { ...currentAssistantMessage.value },
                                        delta: line,
                                    });
                                }
                            });
                        }
                    }
                }
            }
        }
    };

    const handleStreamMessage = (msg: { data: string; event?: string }) => {
        parseStreamMessage(msg);
    };

    const handleStreamOpen = () => {
        status.value = "loading";
        error.value = null;
    };

    const handleStreamError = (err: string | Error) => {
        const errorMsg = typeof err === "string" ? err : err?.message || "连接错误";
        error.value = new Error(errorMsg);
        status.value = "error";

        if (currentAssistantMessage.value) {
            currentAssistantMessage.value.status = "failed";
            currentAssistantMessage.value.content = errorMsg;
        }

        if (typeof err === "string" && err.includes("401")) {
            userStore.logout();
        }

        const errorObj = new Error(errorMsg);
        onError?.(errorObj);
    };

    const handleStreamFinish = () => {
        clearUpdateTimer();
        status.value = "completed";

        if (currentAssistantMessage.value) {
            currentAssistantMessage.value.status = "completed";

            if (
                currentAssistantMessage.value.metadata?.reasoning?.startTime &&
                !currentAssistantMessage.value.metadata.reasoning.endTime
            ) {
                const endTime = Date.now();
                currentAssistantMessage.value.metadata.reasoning.endTime = endTime;
                currentAssistantMessage.value.metadata.reasoning.duration =
                    endTime - currentAssistantMessage.value.metadata.reasoning.startTime;
            }

            updateMessageInArray(currentAssistantMessage.value);
            messageHistory.value.push({ ...currentAssistantMessage.value });

            onUpdate?.({
                type: "content",
                message: { ...currentAssistantMessage.value },
            });

            onFinish?.(currentAssistantMessage.value);
            userStore.getUser();
        }

        currentAssistantMessage.value = null;
    };

    const handleRetryUpperLimit = () => {
        status.value = "error";
        if (currentAssistantMessage.value) {
            currentAssistantMessage.value.status = "failed";
        }
        onError?.(new Error("达到最大重试次数，请稍后重试"));
    };

    const startStreamRequest = () => {
        if (!streamClientRef.value) return;

        const requestBody = buildRequestBody();
        const url = buildStreamUrl();
        const headers = buildHeaders();

        streamClientRef.value.startChat({
            url,
            method: "POST",
            headers,
            body: requestBody,
        });
    };

    const generateAIResponse = async () => {
        if (status.value === "loading") return;

        status.value = "loading";
        error.value = null;
        currentAssistantMessage.value = null;
        startStreamRequest();
    };

    const handleSubmit = async (event?: Event | string) => {
        if (event && typeof event === "object" && "preventDefault" in event) {
            event.preventDefault();
        }

        const content = typeof event === "string" ? event : input.value.trim();

        if ((!content && !files.value.length) || status.value === "loading") return;

        const userMessageContent: MessageContent =
            files.value.length > 0
                ? ([
                      ...files.value,
                      ...(content ? [{ type: "text", text: content }] : []),
                  ] as MessageContentPart[])
                : content;

        const userMessage: AiMessage = {
            id: generateUuid(),
            role: "user",
            content: userMessageContent,
            status: "completed",
            mcpToolCalls: [],
        };

        messages.value.push(userMessage);
        messageHistory.value.push({
            ...userMessage,
            content: typeof userMessage.content === "string" ? userMessage.content : content || "",
        });

        input.value = "";
        files.value = [];

        currentAssistantMessage.value = null;
        status.value = "loading";
        error.value = null;

        startStreamRequest();
    };

    const reload = async () => {
        if (messages.value.length === 0) return;

        status.value = "idle";
        error.value = null;

        const lastUserMessageIndex = messages.value
            .map((msg, index) => ({ msg, index }))
            .reverse()
            .find(({ msg }) => msg.role === "user")?.index;

        if (lastUserMessageIndex === undefined) return;

        messages.value = messages.value.slice(0, lastUserMessageIndex + 1);
        messageHistory.value = messages.value.slice(0, lastUserMessageIndex + 1);

        const userMessage = messages.value[lastUserMessageIndex];
        if (!userMessage) return;

        const content = typeof userMessage.content === "string" ? userMessage.content : "";
        await handleSubmit(content);
    };

    const stop = () => {
        clearUpdateTimer();

        if (streamClientRef.value) {
            streamClientRef.value.stopChat();
            status.value = "completed";
            if (currentAssistantMessage.value) {
                currentAssistantMessage.value.status = "completed";
            }
            currentAssistantMessage.value = null;
        }
    };

    onUnmounted(() => {
        clearUpdateTimer();
        stop();
    });

    return {
        messages,
        input,
        files,
        status,
        error,
        handleSubmit,
        reload,
        stop,
        setMessages,
        append,
        streamClientRef,
        handleStreamOpen,
        handleStreamMessage,
        handleStreamError,
        handleStreamFinish,
        handleRetryUpperLimit,
        timeout,
        heartbeatTimeout,
        maxRetryCount,
    };
}
