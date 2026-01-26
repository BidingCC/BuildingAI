import type { ChatStreamChunk, ChatStreamConfig, McpCallChunk } from "@buildingai/http";
import type { McpToolCall } from "@buildingai/service/consoleapi/mcp-server";
import type { AiMessage, FilesList } from "@buildingai/service/models/message";
import { apiChatStream } from "@buildingai/service/webapi/ai-conversation";

const generateUuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

export interface ChatConfig {
    avatar?: string;
    [key: string]: any;
}

export interface UseChatOptions {
    id?: string;
    api?: (
        messages: AiMessage[],
        config?: Partial<ChatStreamConfig>,
    ) => Promise<{ abort: () => void }>;
    initialMessages?: AiMessage[];
    body?: Record<string, any>;
    onToolCall?: (message: McpToolCall) => void;
    onResponse?: (response: any) => void | Promise<void>;
    onUpdate?: (chunk: ChatStreamChunk) => void;
    onError?: (error: Error) => void;
    onFinish?: (message: AiMessage) => void;
    chatConfig?: ChatConfig;
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
}

/**
 * Chat composable hook similar to @ai-sdk/vue useChat
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const {
        api,
        initialMessages = [],
        body = {},
        onResponse,
        onUpdate,
        onError,
        onFinish,
        onToolCall,
        chatConfig,
    } = options;

    const messages = ref<AiMessage[]>([...initialMessages]);
    const input = ref<string>("");
    const files = ref<FilesList>([]);
    const status = ref<ChatStatus>("idle");
    const error = ref<Error | null>(null);
    const streamController = ref<{ abort: () => void } | null>(null);
    const reactiveChatConfig = computed(() => chatConfig || {});

    const setMessages = (newMessages: AiMessage[]) => {
        messages.value = [...newMessages];
    };

    const append = async (message: AiMessage) => {
        const messageWithId = {
            id: generateUuid(),
            ...message,
            // 只为非用户消息设置 createdAt（用户消息不需要显示时间）
            ...(message.role !== "user" &&
                !message.createdAt && {
                    createdAt: new Date().toISOString(),
                }),
        };

        messages.value.push(messageWithId);

        if (message.role === "user") {
            await generateAIResponse();
        }
    };

    const generateAIResponse = async () => {
        if (status.value === "loading") return;

        status.value = "loading";
        error.value = null;

        const aiMessage: AiMessage = {
            id: generateUuid(),
            role: "assistant",
            content: "",
            status: "loading",
            mcpToolCalls: [],
            avatar: reactiveChatConfig.value.avatar,
            createdAt: new Date().toISOString(),
        };

        messages.value.push(aiMessage);

        try {
            const ChatsMessages: AiMessage[] = messages.value.slice(0, -1).map((msg) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
            }));

            const chatApi = api || apiChatStream;
            const resolvedBody = JSON.parse(
                JSON.stringify({
                    ...body,
                    modelId: body.modelId,
                    conversationId: body.conversationId,
                }),
            );

            const updateReasoningEndTime = () => {
                if (
                    aiMessage.metadata?.reasoning?.startTime &&
                    !aiMessage.metadata.reasoning.endTime
                ) {
                    const endTime = Date.now();
                    aiMessage.metadata.reasoning.endTime = endTime;
                    aiMessage.metadata.reasoning.duration =
                        endTime - aiMessage.metadata.reasoning.startTime;
                }
            };

            streamController.value = await chatApi(ChatsMessages, {
                body: resolvedBody,
                onResponse,
                onUpdate(chunk) {
                    if (chunk.delta) {
                        updateReasoningEndTime();
                        aiMessage.content += chunk.delta;
                        aiMessage.status = "active";
                        messages.value = [...messages.value];
                    }

                    if (chunk.type === "metadata" && chunk.metadata) {
                        if (!aiMessage.metadata) {
                            aiMessage.metadata = {};
                        }

                        const { type, data } = chunk.metadata;

                        switch (type) {
                            case "context":
                                aiMessage.metadata.context = data;
                                break;
                            case "references":
                                aiMessage.metadata.references = data;
                                break;
                            case "suggestions":
                                aiMessage.metadata.suggestions = data;
                                break;
                            case "tokenUsage":
                                aiMessage.metadata.tokenUsage = data;
                                break;
                            case "conversation_id":
                                onUpdate?.({ type: "conversation_id", data } as ChatStreamChunk);
                                break;
                            case "annotations":
                                aiMessage.metadata.annotations = data;
                                break;
                            case "reasoning":
                                if (!aiMessage.metadata.reasoning) {
                                    aiMessage.metadata.reasoning = {
                                        content: data,
                                        startTime: Date.now(),
                                    };
                                } else {
                                    aiMessage.metadata.reasoning.content += data;
                                }
                                break;
                            default:
                                aiMessage.metadata[type] = data;
                        }

                        messages.value = [...messages.value];
                    }
                },
                onToolCall(chunk: McpCallChunk<McpToolCall>) {
                    const newCall = chunk.data;
                    aiMessage.status = "active";

                    if (!aiMessage.mcpToolCalls) {
                        aiMessage.mcpToolCalls = [];
                    }

                    const index = aiMessage.mcpToolCalls.findIndex(
                        (item) => item.id === newCall.id,
                    );

                    if (index !== -1) {
                        aiMessage.mcpToolCalls[index] = newCall;
                    } else {
                        aiMessage.mcpToolCalls.push(newCall);
                    }

                    onToolCall?.(newCall);
                    messages.value = [...messages.value];
                },
                onFinish(message) {
                    aiMessage.status = "completed";
                    aiMessage.content = message.content || aiMessage.content;
                    // 如果后端返回了 createdAt，使用后端的值（更准确）
                    if ((message as any).createdAt) {
                        aiMessage.createdAt = (message as any).createdAt;
                    }
                    updateReasoningEndTime();

                    messages.value = [...messages.value];
                    streamController.value = null;
                    status.value = "idle";
                    onFinish?.(aiMessage);
                    useUserStore().getUser();
                },
                onError(err) {
                    if (err.message === "BodyStreamBuffer was aborted") {
                        aiMessage.status = "completed";
                        status.value = "idle";
                        return;
                    }

                    aiMessage.status = "failed";
                    aiMessage.content = err.message || aiMessage.content;
                    messages.value = [...messages.value];
                    streamController.value = null;
                    status.value = "error";
                    error.value = err;
                    onError?.(err);
                },
            });
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err));
            aiMessage.status = "failed";
            messages.value = [...messages.value];
            streamController.value = null;
            status.value = "error";
            error.value = errorObj;
            onError?.(errorObj);
        }
    };

    const handleSubmit = async (event?: Event | string) => {
        if (event && typeof event === "object" && "preventDefault" in event) {
            event.preventDefault();
        }

        const content = typeof event === "string" ? event : input.value.trim();

        if ((!content && !files.value.length) || status.value === "loading") return;

        let messageContent: string | any[] = content;

        if (files.value.length > 0) {
            const contentArray: any[] = [...files.value];

            if (content) {
                contentArray.push({ type: "text", text: content });
            }

            messageContent = contentArray;
        }

        input.value = "";
        files.value = [];

        await append({
            id: generateUuid(),
            role: "user",
            // content: [
            //     {
            //         type: "image_url",
            //         image_url: {
            //             url: "https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/FileBizType.BIZ_BOT_REF_BG_IMAGE_CROP/1682717607724762_1723210638452479612.jpeg?lk3s=ca44e09c&x-expires=1760921014&x-signature=aciq0Kbqp81oZNM58n8BymgIkL4%3D",
            //         },
            //     },
            //     {
            //         type: "text",
            //         text: "这张图片是什么",
            //     },
            // ],
            // content: [
            //     {
            //         type: "input_audio",
            //         input_audio: {
            //             data: "https://www.zowlsat.com/cdn/guozai.mp3",
            //             format: "mp3",
            //         },
            //     },
            //     {
            //         type: "text",
            //         text: "这段音频是什么",
            //     },
            // ],
            // content: "歌词是什么？",
            content: messageContent,
            status: "completed",
            mcpToolCalls: [],
        });
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

        await generateAIResponse();
    };

    const stop = () => {
        if (streamController.value) {
            streamController.value.abort();
            streamController.value = null;
            status.value = "idle";

            const lastMessage = messages.value[messages.value.length - 1];
            if (lastMessage?.role === "assistant") {
                lastMessage.status = "completed";
                messages.value = [...messages.value];

                // 调用 onFinish 回调，确保消息被保存到数据库
                // 即使流被中止，也要保存已生成的内容
                onFinish?.(lastMessage);
            }
        }
    };

    onUnmounted(() => stop());

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
    };
}
