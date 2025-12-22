<script setup lang="ts">
import type { AiMessage } from "@buildingai/service/models/message";
import { computed } from "vue";

// #ifdef H5
import BdMarkdown from "@/async-components/bd-markdown/index.vue?async";
// #endif
// #ifndef H5
import UaMarkdown from "@/async-components/ua-markdown/ua-markdown.vue?async";

// #endif
import ChatsBubble from "./chats-bubble.vue";

/**
 * Assistant configuration interface
 * @description Configuration for assistant message actions
 */
interface AssistantConfig {
    /** Action buttons for assistant messages */
    actions?: Array<{
        /** Action label */
        label: string;
        /** Action icon */
        icon: string;
        /** Whether to show the action */
        show?: boolean;
        /** Click handler */
        onClick?: (message: AiMessage, index: number) => void;
    }>;
}

/**
 * Component props interface
 * @description Props for the chats messages component
 */
const props = withDefaults(
    defineProps<{
        /** List of messages to display */
        messages?: AiMessage[];
        /** Assistant configuration */
        assistant?: AssistantConfig;
        /** Error object if any */
        error?: Error;
        /** Spacing offset for layout */
        spacingOffset?: number;
        /** Scroll area height */
        scrollAreaHeight?: number;
    }>(),
    {
        messages: () => [],
        assistant: () => ({ actions: [] }),
        spacingOffset: 0,
        scrollAreaHeight: 0,
    },
);

/**
 * Component emits interface
 * @description Events emitted by the component
 */
defineEmits<{
    /** File preview event */
    (e: "file-preview", file: { name: string; url: string }): void;
}>();

const { t } = useI18n();
const { userInfo } = useUserStore();

/**
 * Get message avatar URL
 * @param message - Message object
 * @returns Avatar URL string
 */
const getMessageAvatar = (message: AiMessage) =>
    message.role === "user" ? userInfo?.avatar || "" : message.avatar || "";

/**
 * Get message sender name
 * @param message - Message object
 * @returns Sender name string
 */
const getMessageName = (message: AiMessage) => {
    const nameMap: Record<string, string> = {
        user: t("common.chat.messages.me") || "我",
        assistant: message.model?.model || t("common.chat.messages.assistant") || "助手",
    };
    return nameMap[message.role] || t("common.chat.messages.unknown") || "未知";
};

/**
 * Get text content from message
 * @param content - Message content (string or array)
 * @returns Text content string
 */
const getMessageTextContent = (content: AiMessage["content"]): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.find((item) => item.type === "text")?.text || "";
    }
    return "";
};

/**
 * Get error message from error object or message
 * @param error - Error object
 * @param message - Message object
 * @returns Error message string
 */
const getErrorMessage = (error: Error | undefined, message: AiMessage): string => {
    if (!error)
        return (
            getMessageTextContent(message.content) ||
            t("common.chat.messages.sendFailed") ||
            "发送失败"
        );
    if (typeof error === "string")
        return error || t("common.chat.messages.sendFailed") || "发送失败";
    if (typeof error === "object") {
        return (
            error.message ||
            (error as Error & { content?: string }).content ||
            getMessageTextContent(message.content) ||
            t("common.chat.messages.sendFailed") ||
            "发送失败"
        );
    }
    return JSON.stringify(error);
};

/**
 * All messages computed property
 * @description Returns all messages as a computed array
 */
const allMessages = computed(() => [...props.messages]);
</script>

<template>
    <view
        class="flex flex-col gap-4 px-4"
        :style="{ paddingBottom: spacingOffset > 0 ? `${spacingOffset}px` : '0' }"
    >
        <view
            v-for="(message, index) in allMessages"
            :key="message.id"
            class="flex w-full gap-3"
            :class="{
                'flex-row-reverse': message.role === 'user',
            }"
            :data-role="message.role"
        >
            <!-- Avatar -->
            <view
                v-if="message.role === 'user' || (message.role === 'assistant' && message.avatar)"
                class="flex-none"
                :class="{ 'pt-2': message.role === 'assistant' }"
            >
                <image
                    v-if="getMessageAvatar(message)"
                    :src="getMessageAvatar(message)"
                    :alt="getMessageName(message)"
                    class="h-10 w-10 rounded-full"
                    mode="aspectFill"
                />
                <view
                    v-else
                    class="bg-muted flex h-10 w-10 items-center justify-center rounded-full"
                >
                    <text class="text-muted-foreground text-xs">
                        {{ getMessageName(message).charAt(0) }}
                    </text>
                </view>
            </view>

            <!-- Message content -->
            <view
                class="flex min-w-0 flex-1 flex-col gap-0"
                :class="message.role === 'user' ? 'items-end' : 'items-start'"
            >
                <!-- Loading state -->
                <view
                    v-if="
                        message.status === 'loading' &&
                        !message.mcpToolCalls?.length &&
                        !Object.keys(message.metadata || {}).length
                    "
                    class="bg-background flex items-center gap-2 rounded-lg px-4 py-2"
                >
                    <text class="i-lucide-loader-2 animate-spin text-lg" />
                    <text>{{ t("common.chat.messages.thinking") || "思考中..." }}</text>
                </view>

                <!-- Error state -->
                <view
                    v-if="message.status === 'failed'"
                    class="flex items-center gap-2 px-4 text-red-500"
                >
                    <text class="i-lucide-alert-circle text-lg" />
                    <text>{{ getErrorMessage(error, message) }}</text>
                </view>

                <!-- Message bubble -->
                <ChatsBubble
                    v-else
                    :type="message.role === 'user' ? 'user' : 'system'"
                    :class="{
                        'max-w-[70%]': message.role === 'user',
                        'w-full': message.role !== 'user',
                    }"
                >
                    <!-- User message content -->
                    <view v-if="message.role === 'user'" class="whitespace-pre-wrap">
                        {{ getMessageTextContent(message.content) }}
                    </view>

                    <!-- Assistant message content -->
                    <template v-else>
                        <!-- Markdown content slot -->
                        <slot name="content" :message="message" :index="index">
                            <!-- #ifdef H5 -->
                            <BdMarkdown :content="getMessageTextContent(message.content)" />
                            <!-- #endif -->
                            <!-- #ifndef H5 -->
                            <UaMarkdown :content="getMessageTextContent(message.content)" />
                            <!-- #endif -->
                        </slot>
                    </template>
                </ChatsBubble>

                <!-- Action buttons for assistant messages -->
                <view
                    v-if="
                        message.role === 'assistant' &&
                        assistant.actions?.length &&
                        !['active', 'loading'].includes(message.status || '')
                    "
                    class="action flex items-center justify-between"
                >
                    <view class="text-muted-foreground flex items-center gap-1">
                        <template v-for="action in assistant.actions" :key="action.label">
                            <view
                                v-if="action.show !== false"
                                class="p-1"
                                @click="action.onClick?.(message, index)"
                            >
                                <view :class="action.icon" class="text-sm" />
                            </view>
                        </template>
                    </view>
                    <view text="xs muted-foreground" class="mt-1 ml-2 text-[14.5px]">
                        AI 的回答未必正确无误，请仔细核查
                    </view>
                </view>

                <!-- Timestamp for user messages -->
                <view v-if="message.role === 'user'" class="mt-1 flex items-center gap-2">
                    <text v-if="message.createdAt" class="text-muted-foreground text-xs">
                        {{ new Date(message.createdAt).toLocaleTimeString() }}
                    </text>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
