<script setup lang="ts">
import { STORAGE_KEYS } from "@buildingai/constants/web";
import type { ChatWindowStyle } from "@buildingai/service/models/globals";
import type { AiMessage } from "@buildingai/service/models/message";
import { useElementSize } from "@vueuse/core";
import { computed } from "vue";

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
        messages?: AiMessage[];
        assistant?: AssistantConfig;
        error?: Error;
        spacingOffset?: number;
        scrollAreaHeight?: number;
    }>(),
    {
        messages: () => [],
        assistant: () => ({ actions: [] }),
        spacingOffset: 0,
        scrollAreaHeight: 0,
    },
);

const emit = defineEmits<{
    (e: "file-preview", file: { name: string; url: string }): void;
}>();

const { t } = useI18n();
const { userInfo } = useUserStore();

const lastUserMessageRef = useTemplateRef<HTMLElement>("lastUserMessageRef");
const { height: userMessageHeight } = useElementSize(lastUserMessageRef);

const chatWindowStyleCookie = useCookie<ChatWindowStyle>(STORAGE_KEYS.CHAT_WINDOW_STYLE, {
    default: () => "conversation",
});

const isConversationMode = computed(() => chatWindowStyleCookie.value === "conversation");

const containerClasses = computed(() =>
    ["flex flex-col gap-4", props.spacingOffset > 0 ? `pb-[${props.spacingOffset}px]` : ""].filter(
        Boolean,
    ),
);

const allMessages = computed(() => [...props.messages]);

const isLastNonUserMessage = computed(() => {
    const messages = allMessages.value;
    return messages.length > 0 && messages[messages.length - 1]?.role !== "user";
});

const dynamicMinHeight = computed(() => {
    if (!isLastNonUserMessage.value || !props.scrollAreaHeight) return 120;

    const actualUserHeight = userMessageHeight.value > 0 ? userMessageHeight.value : 80;
    const calculatedHeight = props.scrollAreaHeight - actualUserHeight - 60;
    return Math.max(calculatedHeight, 120);
});

const getMessageAvatar = (message: AiMessage) =>
    message.role === "user" ? userInfo?.avatar || "" : message.avatar || "";

const getMessageName = (message: AiMessage) => {
    const nameMap: Record<string, string> = {
        user: t("common.chat.messages.me"),
        assistant: message.model?.model || t("common.chat.messages.assistant"),
    };
    return nameMap[message.role] || t("common.chat.messages.unknown");
};

const shouldReasoningDefaultOpen = (message: AiMessage) =>
    !!(message.metadata?.reasoning && !message.metadata.reasoning.endTime);

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
        return getMessageTextContent(message.content) || t("common.chat.messages.sendFailed");
    if (typeof error === "string") return error || t("common.chat.messages.sendFailed");
    if (typeof error === "object") {
        let errorMessage = "";
        try {
            const errorData = JSON.parse(error.message);
            errorMessage = errorData.message;
        } catch {
            // If parsing fails, use the original error message
        }

        return (
            errorMessage ||
            error.message ||
            (error as Error & { content?: string }).content ||
            getMessageTextContent(message.content) ||
            t("common.chat.messages.sendFailed")
        );
    }
    return JSON.stringify(error);
};
</script>

<template>
    <div :class="containerClasses">
        <div
            v-for="(message, index) in allMessages"
            :key="message.id"
            class="flex w-full gap-3"
            :class="{
                'flex-row-reverse': isConversationMode && message.role === 'user',
            }"
            :data-role="message.role"
            :ref="message.role === 'user' && !userMessageHeight ? 'lastUserMessageRef' : undefined"
        >
            <div
                v-if="message.role === 'user' || (message.role === 'assistant' && message.avatar)"
                class="flex-none"
                :class="{ 'pt-2': message.role === 'assistant' }"
            >
                <UAvatar
                    :src="getMessageAvatar(message)"
                    :alt="getMessageName(message)"
                    size="xl"
                />
            </div>

            <div
                class="flex min-w-0 flex-1 flex-col gap-2"
                :class="isConversationMode && message.role === 'user' ? 'items-end' : 'items-start'"
            >
                <div
                    class="flex justify-end"
                    v-if="
                        message.role === 'user' &&
                        (getMessageFiles(message.content).length > 0 ||
                            getMessageImages(message.content).length > 0 ||
                            getMessageVideos(message.content).length > 0 ||
                            getMessageAudios(message.content).length > 0)
                    "
                >
                    <PromptFilePreview
                        :files="[
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
                        :show-actions="false"
                        class="max-w-[70%] justify-end"
                        @view="emit('file-preview', $event)"
                    />
                </div>

                <ChatsBubble
                    :type="message.role === 'user' ? 'user' : 'system'"
                    :style="{
                        minHeight:
                            index === allMessages.length - 1 && message.role !== 'user'
                                ? `${dynamicMinHeight}px`
                                : 'auto',
                        maxWidth: message.role === 'user' ? '70%' : 'auto',
                        width: message.role !== 'user' ? '100%' : 'auto',
                    }"
                >
                    <div
                        class="rounded-lg"
                        :class="{ 'bg-background p-4': message.role === 'assistant' }"
                    >
                        <div
                            v-if="
                                message.status === 'loading' &&
                                !message.mcpToolCalls?.length &&
                                !Object.keys(message.metadata || {}).length
                            "
                            class="bg-background flex items-center gap-2 rounded-lg"
                        >
                            <UIcon name="i-lucide-loader-2" class="animate-spin" />
                            <span>{{ t("common.chat.messages.thinking") }}</span>
                        </div>

                        <!-- Reasoning display -->
                        <ReferenceReasoning
                            v-if="
                                message.role === 'assistant' && message.metadata?.reasoning?.content
                            "
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

                        <div
                            v-if="message.status === 'failed'"
                            class="flex items-center gap-2 px-4 text-red-500"
                        >
                            <UIcon name="i-lucide-alert-circle" />
                            <span>{{ getErrorMessage(error, message) }}</span>
                        </div>

                        <slot
                            v-else-if="message.role !== 'user'"
                            name="content"
                            :message="message"
                            :index="index"
                        >
                            <div
                                v-dompurify-html="getMessageTextContent(message.content)"
                                class="prose dark:prose-invert whitespace-pre-wrap"
                            />
                        </slot>

                        <div
                            v-else-if="getMessageTextContent(message.content)"
                            v-dompurify-html="getMessageTextContent(message.content)"
                            class="prose dark:prose-invert whitespace-pre-wrap"
                        />
                    </div>

                    <div
                        v-if="
                            message.role === 'assistant' &&
                            assistant.actions?.length &&
                            !['active', 'loading'].includes(message.status || '')
                        "
                        class="action flex items-center justify-between pl-4"
                    >
                        <div class="flex items-center gap-1">
                            <BdButtonCopy
                                :content="getMessageTextContent(message.content)"
                                size="xs"
                                color="neutral"
                                variant="ghost"
                            />
                            <template v-for="action in assistant.actions">
                                <UTooltip v-if="!action.show" :text="action.label" :delay="100">
                                    <UButton
                                        :key="action.label"
                                        :icon="action.icon"
                                        size="xs"
                                        color="neutral"
                                        variant="ghost"
                                        class="p-2"
                                        @click="action.onClick?.(message, index)"
                                    />
                                </UTooltip>
                            </template>
                            <span v-if="message.status !== 'failed'" class="text-muted text-xs">
                                {{ t("ai-chat.frontend.messages.aiDisclaimer") }}
                            </span>
                        </div>
                        <TimeDisplay
                            v-if="message.createdAt"
                            :datetime="message.createdAt"
                            mode="datetime"
                            class="text-muted-foreground text-xs"
                        />
                    </div>

                    <slot name="after-tools" :message="message" :index="index" />
                </ChatsBubble>

                <div v-if="message.role === 'user'" class="mt-1 flex items-center gap-2">
                    <TimeDisplay
                        v-if="message.createdAt"
                        :datetime="message.createdAt"
                        mode="datetime"
                        class="text-muted-foreground text-xs"
                    />
                    <BdButtonCopy
                        :content="getMessageTextContent(message.content)"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
