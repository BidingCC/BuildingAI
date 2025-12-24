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
import ReferenceKnowledge from "./reference/reference-knowledge.vue";
import ReferenceMcpToolCall from "./reference/reference-mcp-tool-call.vue";
import ReferenceReasoning from "./reference/reference-reasoning.vue";

interface AssistantConfig {
    actions?: Array<{
        label: string;
        icon: string;
        show?: boolean;
        onClick?: (message: AiMessage, index: number) => void;
    }>;
}

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

defineEmits<{
    (e: "file-preview", file: { name: string; url: string }): void;
}>();

const { t } = useI18n();
const { userInfo } = useUserStore();

const getMessageAvatar = (message: AiMessage) =>
    message.role === "user" ? userInfo?.avatar || "" : message.avatar || "";

const getMessageName = (message: AiMessage) => {
    const nameMap: Record<string, string> = {
        user: t("common.chat.messages.me") || "我",
        assistant: message.model?.model || t("common.chat.messages.assistant") || "助手",
    };
    return nameMap[message.role] || t("common.chat.messages.unknown") || "未知";
};

const getMessageTextContent = (content: AiMessage["content"]): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.find((item) => item.type === "text")?.text || "";
    }
    return "";
};

const getMessageImages = (content: AiMessage["content"]) => {
    if (!Array.isArray(content)) return [];
    return content
        .filter((item) => item.type === "image_url" && item.image_url)
        .map((item) => ({
            url: item.image_url?.url || "",
            detail: item.image_url?.detail,
        }));
};

const getMessageVideos = (content: AiMessage["content"]) => {
    if (!Array.isArray(content)) return [];
    return content
        .filter((item) => item.type === "video_url" && item.video_url)
        .map((item) => ({
            url: item.video_url?.url || "",
        }));
};

const getMessageAudios = (content: AiMessage["content"]) => {
    if (!Array.isArray(content)) return [];
    return content
        .filter((item) => item.type === "input_audio" && item.input_audio)
        .map((item) => ({
            url: item.input_audio?.data || "",
            format: item.input_audio?.format || "mp3",
        }));
};

const getMessageFiles = (content: AiMessage["content"]) => {
    if (!Array.isArray(content)) return [];
    return content
        .filter((item) => item.type === "file_url" && item.url && item.name)
        .map((item) => ({
            name: item.name || "Unknown file",
            url: item.url || "",
        }));
};

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

const allMessages = computed(() => [...props.messages]);

const shouldReasoningDefaultOpen = (message: AiMessage) =>
    !!(message.metadata?.reasoning && !message.metadata.reasoning.endTime);

const handleFileClick = (
    file: { name: string; url: string; mediaType?: string },
    message: AiMessage,
) => {
    if (file.mediaType === "image") {
        const imageUrls = getMessageImages(message.content).map((img) => img.url);
        uni.previewImage({
            urls: imageUrls,
            current: file.url,
        });
    }
};
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
                <!-- File preview for user messages -->
                <view
                    v-if="
                        message.role === 'user' &&
                        (getMessageFiles(message.content).length > 0 ||
                            getMessageImages(message.content).length > 0 ||
                            getMessageVideos(message.content).length > 0 ||
                            getMessageAudios(message.content).length > 0)
                    "
                    class="mb-2 flex flex-wrap justify-end"
                    style="gap: 8px; max-width: 70%"
                >
                    <view
                        v-for="(file, fIndex) in [
                            ...getMessageFiles(message.content).map((f) => ({
                                ...f,
                                mediaType: 'file' as const,
                            })),
                            ...getMessageImages(message.content).map((img) => ({
                                name: img.url.split('/').pop() || 'image',
                                url: img.url,
                                mediaType: 'image' as const,
                            })),
                            ...getMessageVideos(message.content).map((video) => ({
                                name: video.url.split('/').pop() || 'video',
                                url: video.url,
                                mediaType: 'video' as const,
                            })),
                            ...getMessageAudios(message.content).map((audio) => ({
                                name: audio.url.split('/').pop() || `audio.${audio.format}`,
                                url: audio.url,
                                mediaType: 'audio' as const,
                            })),
                        ]"
                        :key="fIndex"
                        class="relative"
                    >
                        <!-- Image preview -->
                        <view v-if="file.mediaType === 'image'" class="relative">
                            <image
                                :src="file.url"
                                mode="aspectFill"
                                class="rounded-lg"
                                style="width: 50px; height: 50px; min-width: 50px"
                                @click="handleFileClick(file, message)"
                            />
                        </view>

                        <!-- Video preview -->
                        <view v-else-if="file.mediaType === 'video'" class="relative">
                            <view
                                class="relative rounded-lg bg-black"
                                style="width: 50px; height: 50px"
                                @click="handleFileClick(file, message)"
                            >
                                <video
                                    :src="file.url"
                                    class="rounded-lg"
                                    style="width: 100%; height: 100%"
                                    :controls="false"
                                    :show-center-play-btn="true"
                                />
                            </view>
                        </view>

                        <!-- Audio preview -->
                        <view
                            v-else-if="file.mediaType === 'audio'"
                            class="border-border bg-primary-50 relative flex items-center gap-2 rounded-lg border p-2 pr-4"
                            @click="handleFileClick(file, message)"
                        >
                            <view
                                class="border-border flex items-center justify-center rounded-lg border shadow-md"
                                style="width: 50px; height: 50px"
                            >
                                <text
                                    class="i-lucide-audio-lines text-foreground"
                                    style="font-size: 16px"
                                />
                            </view>
                            <view class="text-foreground max-w-[200px] truncate text-sm font-bold">
                                {{ file.name }}
                            </view>
                        </view>

                        <!-- File preview -->
                        <view
                            v-else
                            class="border-border bg-primary-50 relative flex items-center gap-2 rounded-lg border py-2.5 pr-4 pl-2"
                            @click="handleFileClick(file, message)"
                        >
                            <view
                                class="border-border flex items-center justify-center rounded-lg border shadow-md"
                                style="width: 32px; height: 32px"
                            >
                                <text
                                    class="i-lucide-file-box text-foreground"
                                    style="font-size: 16px"
                                />
                            </view>
                            <view
                                class="text-foreground me-auto max-w-[250px] truncate text-sm font-bold"
                            >
                                {{ file.name }}
                            </view>
                        </view>
                    </view>
                </view>

                <!-- Loading state -->
                <view
                    v-if="
                        message.status === 'loading' &&
                        !message.mcpToolCalls?.length &&
                        !Object.keys(message.metadata || {}).length
                    "
                    class="bg-background flex h-8 items-center gap-2 rounded-lg px-4 py-2"
                >
                    <text class="i-lucide-loader-2 animate-spin text-xs" />
                    <text class="text-xs">
                        {{ t("common.chat.messages.thinking") || "思考中..." }}
                    </text>
                </view>

                <!-- Error state -->
                <view
                    v-if="message.status === 'failed'"
                    class="flex items-center gap-2 px-4 text-red-500"
                >
                    <text class="i-lucide-alert-circle text-lg" />
                    <text>{{ getErrorMessage(error, message) }}</text>
                </view>

                <!-- Reasoning display -->
                <ReferenceReasoning
                    v-if="message.role === 'assistant' && message.metadata?.reasoning?.content"
                    :reasoning="message.metadata.reasoning"
                    :message-id="message.id"
                    :is-thinking="!message.metadata.reasoning.endTime"
                    :default-open="shouldReasoningDefaultOpen(message)"
                    :key="`reasoning-${message.id}-${JSON.stringify(message.metadata.reasoning)}`"
                />

                <!-- Knowledge reference display -->
                <ReferenceKnowledge
                    v-if="
                        message.metadata?.references &&
                        message.metadata.references.length > 0 &&
                        message.role === 'assistant'
                    "
                    :references="message.metadata.references"
                />

                <!-- MCP tool call display -->
                <ReferenceMcpToolCall
                    v-if="message.role === 'assistant' && message.mcpToolCalls?.length"
                    :tool-calls="message.mcpToolCalls"
                    :message-id="message.id"
                    :key="`tool-${message.id}-${message.mcpToolCalls.map((item) => item.output)}`"
                />

                <!-- Message bubble -->
                <ChatsBubble
                    v-if="
                        getMessageTextContent(message.content) ||
                        (Array.isArray(message.content) && message.content.length > 0)
                    "
                    :type="message.role === 'user' ? 'user' : 'system'"
                    :class="{
                        'max-w-[70%]': message.role === 'user',
                        'min-h-8 w-full': message.role !== 'user',
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
