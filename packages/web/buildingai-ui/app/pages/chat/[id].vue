<script setup lang="ts">
import type { AiMessage, FilesList } from "@buildingai/service/models/message";
import type { AiModel, ChatConfig, QuickMenu } from "@buildingai/service/webapi/ai-conversation";
import {
    apiChatStream,
    apiGetAiConversation,
    apiGetAiConversationDetail,
    apiGetChatConfig,
    apiGetQuickMenu,
    apiUpdateAiConversation,
} from "@buildingai/service/webapi/ai-conversation";
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from "reka-ui";

import { usePreviewSidebar } from "~/components/ask-assistant-chat/preview-sidebar/use-preview-sidebar";

// Reactive state management
const { params: URLQueryParams } = useRoute();
const { t } = useI18n();
const toast = useMessage();
const scrollAreaRef = useTemplateRef("scrollAreaRef");
const { height: scrollAreaHeight } = useElementSize(scrollAreaRef);

// Global state management
const controlsStore = useControlsStore();
const chatStore = useChatStore();

// Chat state and configuration
const currentConversationId = computed(() => (URLQueryParams as Record<string, string>).id);
const queryPaging = shallowReactive({ page: 1, pageSize: 5 });
const hasMore = shallowRef(false);
// 直接使用全局状态中的 selectedModel
const selectedModel = computed(() => controlsStore.selectedModel || ({} as AiModel));
const selectedMcpIdList = shallowRef<string[]>([]);
const isQuickMenu = shallowRef(false);
const quickMenu = shallowRef<QuickMenu>();

// Preview sidebar management
const { previewType, previewData, openFilePreview, closePreview } = usePreviewSidebar();

const { data: messagesData, pending: loading } = await useAsyncData(
    `chat-messages-${currentConversationId.value}`,
    () => apiGetAiConversation(currentConversationId.value as string, queryPaging),
    {
        transform: (data) => {
            data.items = data.items.reverse();
            return data;
        },
    },
);

if (!messagesData.value?.items) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found", fatal: true });
}

hasMore.value = messagesData.value.total > messagesData.value.items.length;

const { data: currentConversation } = await useAsyncData(
    `chat-detail-${currentConversationId.value}`,
    () => apiGetAiConversationDetail(currentConversationId.value as string),
);

const { data: chatConfig } = await useAsyncData("chat-config", () => apiGetChatConfig());

const initialMessages = messagesData.value.items.map((item: AiMessage) => {
    return {
        id: item.id || uuid(),
        role: item.role,
        metadata: item.metadata,
        content: item.errorMessage || item.content,
        status: item.errorMessage ? ("failed" as const) : ("completed" as const),
        mcpToolCalls: item.mcpToolCalls,
    };
});

const { messages, input, files, handleSubmit, reload, stop, status, error } = useChat({
    id: currentConversationId.value,
    api: apiChatStream,
    initialMessages: initialMessages,
    body: {
        get modelId() {
            return selectedModel.value?.id;
        },
        get mcpServers() {
            return JSON.parse(localStorage.getItem("mcpIds") || "[]");
        },
        saveConversation: true,
        get conversationId() {
            return currentConversationId.value;
        },
    },
    onToolCall() {
        scrollToBottom();
    },
    onResponse(response: Response) {
        if (response.status === 401) {
            const userStore = useUserStore();
            userStore.logout(true);
        }
    },
    onError(err: Error) {
        const message = err?.message || t("ai-chat.frontend.sendFailed");
        console.error("Chat error:", message);
    },
    onFinish() {
        const userStore = useUserStore();
        userStore.getUser();
        refreshNuxtData("chats");
        refreshNuxtData(`chat-detail-${currentConversationId.value}`);
    },
});

const isLoading = computed(() => status.value === "loading");

// Auto-scroll state management
const isAtBottom = ref(true);

/**
 * Handle scroll events to update bottom position state
 * @param event - The scroll event
 */
function handleScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const threshold = 40; // Threshold in pixels
    isAtBottom.value = target.scrollHeight - (target.scrollTop + target.clientHeight) <= threshold;
}

/**
 * Load more historical messages
 */
async function loadMoreMessages(): Promise<void> {
    if (!hasMore.value) return;

    queryPaging.page++;
    try {
        const data = await apiGetAiConversation(currentConversationId.value as string, queryPaging);
        const newMessages = data.items.reverse().map(
            (item: AiMessage): AiMessage => ({
                id: item.id || uuid(),
                role: item.role,
                content: item.errorMessage || item.content,
                status: item.errorMessage ? ("failed" as const) : ("completed" as const),
                mcpToolCalls: item.mcpToolCalls,
            }),
        );
        messages.value.unshift(...newMessages);
        hasMore.value = data.total > messages.value.length;
    } catch (err) {
        queryPaging.page--;
        console.error("Failed to load more messages:", err);
        hasMore.value = true;
    }
}

/**
 * Quick menu MCP ID reference
 */
const QUICK_MENU_MCP_ID = ref<string>();

/**
 * Read MCP selection list from localStorage
 * @returns {string[]} Array of MCP IDs (returns empty array if not found or format error)
 */
function readMcpIdsFromStorage(): string[] {
    try {
        const raw = JSON.parse(localStorage.getItem("mcpIds") || "[]");
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

/**
 * Write MCP selection list to localStorage
 * @param {string[]} ids Array of MCP IDs
 */
function writeMcpIdsToStorage(ids: string[]): void {
    if (ids.length) {
        localStorage.setItem("mcpIds", JSON.stringify(ids));
    } else {
        localStorage.removeItem("mcpIds");
    }
}

/**
 * Handle quick menu button click - toggle MCP ID in localStorage and sync state
 * Synchronizes selectedMcpIdList with button active state without affecting existing functionality
 */
const handleQuickMenu = (): void => {
    // Return early if ID is not loaded to avoid writing invalid data
    if (!QUICK_MENU_MCP_ID.value) return;

    // Ensure reactive list exists
    if (!Array.isArray(selectedMcpIdList.value)) {
        selectedMcpIdList.value = [];
    }

    const stored = readMcpIdsFromStorage();
    const quickMenuId = QUICK_MENU_MCP_ID.value;
    const hasInStore = stored.includes(quickMenuId);
    const hasInState = selectedMcpIdList.value.includes(quickMenuId);

    if (!hasInStore && !hasInState) {
        // Add to both localStorage and memory (deduplication)
        stored.push(quickMenuId);
        if (!hasInState) {
            selectedMcpIdList.value.push(quickMenuId);
        }
        writeMcpIdsToStorage(stored);
    } else {
        // Remove ID from both localStorage and memory, but don't affect other selected MCPs
        const nextStore = stored.filter((id) => id !== quickMenuId);
        const nextState = selectedMcpIdList.value.filter((id) => id !== quickMenuId);
        writeMcpIdsToStorage(nextStore);
        selectedMcpIdList.value = nextState;
    }

    // Update button state based on latest storage result
    isQuickMenu.value = readMcpIdsFromStorage().includes(quickMenuId);
};

/**
 * Fetch quick menu configuration and initialize state
 */
const getQuickMenu = async (): Promise<void> => {
    try {
        const res = await apiGetQuickMenu();
        if (!res) return;

        quickMenu.value = res;
        QUICK_MENU_MCP_ID.value = res.id;

        // Initialize button active state (read-only, don't modify localStorage)
        if (res.id) {
            isQuickMenu.value = readMcpIdsFromStorage().includes(res.id);
        }
    } catch (error) {
        console.error("Failed to fetch quick menu:", error);
    }
};

/**
 * Scroll to bottom of chat area
 * @param animate - Whether to animate the scroll
 */
async function scrollToBottom(animate = true): Promise<void> {
    await nextTick();
    scrollAreaRef.value?.scrollToBottom(animate);
}

/**
 * Save edited conversation name
 * @param event - The input change event
 */
async function saveEditedName(event: Event): Promise<void> {
    try {
        await apiUpdateAiConversation(currentConversationId.value as string, {
            title: (event.target as HTMLInputElement).value,
        });
        refreshNuxtData("chats");
    } catch (error) {
        console.error("Failed to save conversation name:", error);
    }
}

/**
 * Handle message submission
 * @param content - The message content to send
 */
async function handleSubmitMessage(content: string): Promise<void> {
    if ((!content.trim() && !files.value.length) || isLoading.value) return;
    if (!selectedModel.value.id) {
        toast.warning(t("ai-chat.frontend.selectModel"));
        return;
    }

    await handleSubmit(content);
    scrollToBottom();
}

// Auto-scroll when last message content changes and scroll is at bottom
watch(
    () => messages.value.at(-1)?.content,
    () =>
        nextTick(() => {
            if (isAtBottom.value) {
                scrollToBottom(true);
            }
        }),
    { flush: "post" },
);

// Mutation observer for content changes
let mutationObserver: MutationObserver | null = null;

onMounted(async () => {
    // Scroll to bottom after initial render
    scrollToBottom(false);

    // Setup scroll event listener and mutation observer
    const viewportComp = scrollAreaRef.value?.getViewportElement();
    const viewportEl = (viewportComp &&
        (viewportComp as { viewportElement?: HTMLElement }).viewportElement) as
        | HTMLElement
        | undefined;

    if (viewportEl) {
        viewportEl.addEventListener("scroll", handleScroll, { passive: true });

        // Initial bottom position check
        handleScroll({ target: viewportEl } as unknown as Event);

        // Monitor content changes (code highlighting, mermaid rendering, etc.)
        mutationObserver = new MutationObserver(() => {
            // Auto-follow only when scroll is at bottom
            if (isAtBottom.value) {
                scrollToBottom(false);
            }
        });
        mutationObserver.observe(viewportEl, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    // Handle cached conversation from store
    const pendingConversation = chatStore.getPendingConversation();
    if (
        messages.value.length === 0 &&
        pendingConversation &&
        pendingConversation.id === currentConversationId.value
    ) {
        const pendingFiles = pendingConversation.files || ([] as FilesList);
        files.value = pendingFiles;

        selectedModel.value.id = pendingConversation.modelId || "";

        // Wait for next tick to ensure files are set before submitting
        await nextTick();
        await handleSubmitMessage(pendingConversation.title || "");
    }

    // Clear pending conversation after use
    chatStore.clearPendingConversation();

    // Fetch quick menu
    await getQuickMenu();
});

onUnmounted(() => {
    // Cleanup event listeners and observers
    const viewportComp = scrollAreaRef.value?.getViewportElement();
    const viewportEl = (viewportComp &&
        (viewportComp as { viewportElement?: HTMLElement }).viewportElement) as
        | HTMLElement
        | undefined;
    viewportEl?.removeEventListener("scroll", handleScroll);
    mutationObserver?.disconnect();
});

definePageMeta({ activePath: "/" });
</script>

<template>
    <div class="ai-chat dark:bg-muted/50 flex h-full min-h-0 w-full overflow-hidden pl-0">
        <div
            class="border-border/50 h-full flex-none border-r pl-0 sm:pl-2"
            :class="{ 'border-none': !controlsStore.chatSidebarVisible }"
        >
            <ChatsChats />
        </div>

        <SplitterGroup id="chat-main-splitter" direction="horizontal" class="h-full min-w-0 flex-1">
            <SplitterPanel
                id="chat-content-panel"
                :min-size="30"
                :default-size="previewType ? 70 : 100"
                class="flex h-full flex-col items-center justify-center overflow-hidden rounded-lg px-4 xl:px-0"
            >
                <div class="flex w-full items-center justify-center py-2">
                    <UInput
                        :model-value="
                            isLoading
                                ? t('ai-chat.frontend.messages.typing')
                                : currentConversation?.title
                        "
                        size="sm"
                        variant="ghost"
                        :ui="{ base: 'text-center text-lg' }"
                        @change="saveEditedName($event)"
                    />
                </div>

                <BdScrollArea
                    class="revert-layer h-full min-h-0 w-full"
                    type="auto"
                    ref="scrollAreaRef"
                    @in-view="scrollToBottom(false)"
                >
                    <BdChatScroll
                        :loading="loading"
                        :has-more="hasMore"
                        :threshold="500"
                        content-class="max-w-[800px] w-full space-y-3 py-6"
                        @load-more="loadMoreMessages"
                    >
                        <ChatsMessages
                            :messages="messages as AiMessage[]"
                            :scroll-area-height="scrollAreaHeight"
                            :error="error as unknown as Error"
                            :assistant="{
                                actions: [
                                    {
                                        label: t('ai-chat.frontend.messages.retry'),
                                        icon: 'i-lucide-rotate-cw-square',
                                        onClick: () => reload(),
                                    },
                                ],
                            }"
                            :spacing-offset="160"
                            @file-preview="openFilePreview"
                        >
                            <template #content="{ message }">
                                <BdMarkdown :content="message.content as string" />
                            </template>
                        </ChatsMessages>
                    </BdChatScroll>
                </BdScrollArea>

                <div class="w-full max-w-[800px]">
                    <ChatsPrompt
                        v-model="input"
                        v-model:file-list="files"
                        :is-loading="isLoading"
                        :needAuth="true"
                        :attachmentSizeLimit="chatConfig?.attachmentSizeLimit"
                        class="sticky bottom-0 z-10 [view-transition-name:chat-prompt]"
                        @stop="stop"
                        @submit="handleSubmitMessage"
                    >
                        <template #panel-left>
                            <ModelSelect
                                :supportedModelTypes="['llm']"
                                :show-billingRule="true"
                                :open-local-storage="true"
                                placeholder="选择AI模型开始对话"
                                @change="controlsStore.setSelectedModel"
                            />
                            <McpToolSelect
                                v-model="selectedMcpIdList"
                                :mcpIds="selectedMcpIdList || []"
                                capability="chat"
                                placeholder="选择MCP..."
                            />

                            <UButton
                                v-if="quickMenu"
                                :color="isQuickMenu ? 'primary' : 'neutral'"
                                variant="ghost"
                                :icon="quickMenu?.icon ? '' : 'tabler:tool'"
                                :ui="{ leadingIcon: 'size-4' }"
                                :class="{ 'bg-primary/10': isQuickMenu }"
                                @click.stop="handleQuickMenu"
                            >
                                <UAvatar
                                    v-if="quickMenu?.icon"
                                    :src="quickMenu?.icon"
                                    :ui="{ root: 'size-4 rounded-md' }"
                                />
                                {{ quickMenu?.alias || quickMenu?.name }}
                            </UButton>
                        </template>
                    </ChatsPrompt>
                </div>

                <div class="text-muted-forgeround w-full p-2 text-center text-xs">
                    {{ (chatConfig as ChatConfig)?.welcomeInfo?.footer }}
                </div>
            </SplitterPanel>

            <SplitterResizeHandle
                v-if="previewType"
                id="chat-resize-handle"
                class="w-px origin-center transition-opacity duration-300"
            />

            <SplitterPanel
                v-show="previewType"
                id="chat-preview-panel"
                :min-size="20"
                :default-size="30"
                class="preview-panel-wrapper relative h-full overflow-hidden"
                style="contain: layout size style"
            >
                <Transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 translate-x-8"
                    enter-to-class="opacity-100 translate-x-0"
                    leave-active-class="transition-all duration-300 ease-in"
                    leave-from-class="opacity-100 translate-x-0"
                    leave-to-class="opacity-0 translate-x-8"
                >
                    <PreviewSidebar
                        v-if="previewType"
                        :type="previewType"
                        :data="previewData"
                        @close="closePreview"
                    />
                </Transition>
            </SplitterPanel>
        </SplitterGroup>
    </div>
</template>
