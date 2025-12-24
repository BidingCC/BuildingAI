import type { McpToolCall } from "@buildingai/service/consoleapi/mcp-server";
import type { AiMessage, FilesList } from "@buildingai/service/models/message";

import { getBaseUrl } from "@/hooks/use-request";
import { useUserStore } from "@/stores/user";

export function generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export interface ChatConfig {
    avatar?: string;
    [key: string]: unknown;
}

export interface StreamClientInstance {
    startChat: (config: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        timeout?: number;
        heartbeatTimeout?: number;
        maxRetryCount?: number;
    }) => void;
    stopChat: (...args: unknown[]) => void;
}

export interface StreamUpdateChunk {
    type: string;
    message?: AiMessage;
    delta?: string;
    data?: unknown;
}

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

export interface HttpResponse {
    status?: number;
    statusText?: string;
    headers?: Headers | Record<string, string>;
    [key: string]: unknown;
}

export interface UseChatOptions {
    id?: string | (() => string | undefined);
    initialMessages?: AiMessage[];
    body?: Record<string, unknown> | (() => Record<string, unknown>);
    apiUrl?: string;
    onToolCall?: (message: McpToolCall) => void;
    onResponse?: (response: HttpResponse) => void | Promise<void>;
    onUpdate?: (chunk: StreamUpdateChunk) => void;
    onError?: (error: Error) => void;
    onFinish?: (message: AiMessage) => void;
    chatConfig?: ChatConfig;
    timeout?: number;
    heartbeatTimeout?: number;
    maxRetryCount?: number;
    buildStreamUrl?: () => string;
    buildHeaders?: () => Record<string, string>;
}

export type ChatStatus = "idle" | "loading" | "error" | "completed";

export interface UseChatReturn {
    messages: Ref<AiMessage[]>;
    input: Ref<string>;
    files: Ref<FilesList>;
    status: Ref<ChatStatus>;
    error: Ref<Error | null>;
    handleSubmit: (event?: Event | string) => Promise<void>;
    reload: () => Promise<void>;
    stop: () => void;
    setMessages: (messages: AiMessage[]) => void;
    append: (message: AiMessage) => Promise<void>;
    streamClientRef: Ref<StreamClientInstance | null>;
    handleStreamOpen: () => void;
    handleStreamMessage: (msg: { data: string; event?: string }) => void;
    handleStreamError: (err: string | Error) => void;
    handleStreamFinish: () => void;
    handleRetryUpperLimit: () => void;
    timeout: number;
    heartbeatTimeout: number;
    maxRetryCount: number;
}

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
    const reactiveChatConfig = computed(() => chatConfig || {});
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    const UPDATE_DEBOUNCE_MS = 50;

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

    const ensureAssistantMessage = (): boolean => {
        if (currentAssistantMessage.value) {
            return false;
        }

        const existingMessage = messages.value.find(
            (msg) => msg.role === "assistant" && msg.status === "loading",
        );

        if (existingMessage) {
            currentAssistantMessage.value = existingMessage;
            return false;
        }

        currentAssistantMessage.value = createAssistantMessage();
        // 适配倒序模式，新消息添加到数组开头
        messages.value.unshift({ ...currentAssistantMessage.value });
        return true;
    };

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
        const messagesToSend = messages.value.filter((msg) => {
            if (
                msg.role === "assistant" &&
                msg.status === "loading" &&
                (!msg.content || msg.content === "")
            ) {
                return false;
            }
            return true;
        });

        const reversedMessages = [...messagesToSend].reverse();

        const historyMessages = reversedMessages.map((msg) => {
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

    const updateAssistantContent = (delta: string, isNewMessage: boolean) => {
        if (!currentAssistantMessage.value) return;

        if (isNewMessage) {
            currentAssistantMessage.value.content = delta;
        } else {
            currentAssistantMessage.value.content += delta;
            currentAssistantMessage.value.status = "active";
        }

        if (isNewMessage) {
            onUpdate?.({
                type: "content",
                message: { ...currentAssistantMessage.value },
                delta,
            });
        } else {
            debouncedUpdate(() => {
                if (currentAssistantMessage.value) {
                    onUpdate?.({
                        type: "content",
                        message: { ...currentAssistantMessage.value },
                        delta,
                    });
                }
            });
        }
    };

    const updateAssistantMetadata = (type: string, data: unknown) => {
        if (!currentAssistantMessage.value) return;

        if (!currentAssistantMessage.value.metadata) {
            currentAssistantMessage.value.metadata = {};
        }

        switch (type) {
            case "conversation_id":
                onUpdate?.({ type: "conversation_id", data });
                break;
            case "reasoning":
                if (!currentAssistantMessage.value.metadata.reasoning) {
                    currentAssistantMessage.value.metadata.reasoning = {
                        content: data as string,
                        startTime: Date.now(),
                    };
                } else {
                    currentAssistantMessage.value.metadata.reasoning.content += data as string;
                }
                break;
            default:
                currentAssistantMessage.value.metadata[type] = data;
        }

        onUpdate?.({
            type: "metadata",
            message: { ...currentAssistantMessage.value },
        });
    };

    const handleToolCall = (toolData: McpToolCall) => {
        if (!currentAssistantMessage.value) return;

        if (!currentAssistantMessage.value.mcpToolCalls) {
            currentAssistantMessage.value.mcpToolCalls = [];
        }

        const index = currentAssistantMessage.value.mcpToolCalls.findIndex(
            (item) => item.id === toolData.id,
        );

        if (index >= 0) {
            currentAssistantMessage.value.mcpToolCalls[index] = toolData;
        } else {
            currentAssistantMessage.value.mcpToolCalls.push(toolData);
        }

        onToolCall?.(toolData);
    };

    const parseStreamMessage = (msg: { data: string; event?: string }) => {
        if (!msg.data) return;

        const dataLines = msg.data.split("\n").filter((line) => line.trim());

        for (const line of dataLines) {
            const trimmedLine = line.trim();

            // 检查是否结束
            if (trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
                clearUpdateTimer();
                handleStreamFinish();
                return;
            }

            // 提取 JSON 字符串
            let jsonStr = trimmedLine;
            if (jsonStr.startsWith("data:")) {
                jsonStr = jsonStr.slice(5).trim();
            }
            if (!jsonStr) continue;

            try {
                const parsed = JSON.parse(jsonStr) as ParsedStreamMessage;

                // 处理错误
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

                // 处理工具调用
                if (parsed.type?.startsWith("mcp_tool_")) {
                    const type = parsed.type.replace(/^mcp_tool_/, "");
                    const toolData = parsed.data as McpToolCall | { message?: string } | undefined;

                    if (type === "error") {
                        const errorMsg =
                            (toolData as { message?: string })?.message || "工具调用错误";
                        error.value = new Error(errorMsg);
                        onError?.(new Error(errorMsg));
                    } else if (currentAssistantMessage.value && toolData) {
                        handleToolCall(toolData as McpToolCall);
                    }
                    return;
                }

                // 处理内容块
                if (parsed.type === "chunk" && parsed.data && typeof parsed.data === "string") {
                    const isNewMessage = ensureAssistantMessage();
                    updateAssistantContent(parsed.data, isNewMessage);
                    return;
                }

                // 处理元数据
                if (parsed.type === "metadata" && parsed.metadata) {
                    ensureAssistantMessage();
                    const metadata = parsed.metadata as { type?: string; data?: unknown };
                    if (metadata.type && metadata.data !== undefined) {
                        updateAssistantMetadata(metadata.type, metadata.data);
                    }
                    return;
                }

                // 处理 reasoning 类型
                if (parsed.type === "reasoning" && parsed.data && typeof parsed.data === "string") {
                    ensureAssistantMessage();
                    updateAssistantMetadata("reasoning", parsed.data);
                    return;
                }

                // 处理其他元数据类型
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
                    } else if (parsed.data !== undefined) {
                        updateAssistantMetadata(parsed.type, parsed.data);
                    }
                    return;
                }
            } catch (_err) {
                // 如果解析失败，尝试作为纯文本内容处理
                if (line && line.trim() && !line.startsWith("data:")) {
                    const isNewMessage = ensureAssistantMessage();
                    updateAssistantContent(line, isNewMessage);
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

        onError?.(new Error(errorMsg));
    };

    const handleStreamFinish = () => {
        clearUpdateTimer();
        status.value = "completed";

        if (currentAssistantMessage.value) {
            currentAssistantMessage.value.status = "completed";

            // 更新 reasoning 结束时间
            if (
                currentAssistantMessage.value.metadata?.reasoning?.startTime &&
                !currentAssistantMessage.value.metadata.reasoning.endTime
            ) {
                const endTime = Date.now();
                currentAssistantMessage.value.metadata.reasoning.endTime = endTime;
                currentAssistantMessage.value.metadata.reasoning.duration =
                    endTime - currentAssistantMessage.value.metadata.reasoning.startTime;
            }

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
        await handleSubmit();
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

    const append = async (message: AiMessage) => {
        const messageWithId = {
            id: generateUuid(),
            ...message,
        };

        // 适配倒序模式
        messages.value.unshift(messageWithId);

        if (message.role === "user") {
            await generateAIResponse();
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
