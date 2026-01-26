<script setup lang="ts">
import type { FilesList } from "@buildingai/service/models/message";
import type { ChatConfig, QuickMenu } from "@buildingai/service/webapi/ai-conversation";
import {
    apiCreateAiConversation,
    apiGetChatConfig,
    apiGetQuickMenu,
} from "@buildingai/service/webapi/ai-conversation";

// Reactive state management
const appStore = useAppStore();
const { t } = useI18n();

// Global state management
const controlsStore = useControlsStore();
const chatStore = useChatStore();

// Form inputs and selections
const selectedModelId = computed(() => controlsStore.selectedModel?.id || "");
const inputValue = shallowRef("");
const selectedMcpIdList = shallowRef<string[]>([]);
const isQuickMenu = shallowRef(false);
const quickMenu = shallowRef<QuickMenu>();
const QUICK_MENU_MCP_ID = shallowRef<string>();
const files = shallowRef<FilesList>([]);
// Fetch chat configuration
const { data: chatConfig } = await useAsyncData("chat-config", () => apiGetChatConfig());

// Computed properties for UI configuration
const suggestionsEnabled = computed(
    () => (chatConfig.value as ChatConfig)?.suggestionsEnabled ?? true,
);

const suggestions = computed(() => (chatConfig.value as ChatConfig)?.suggestions || []);

const welcomeInfo = computed(() => (chatConfig.value as ChatConfig)?.welcomeInfo || {});

function handleFileListUpdate(value: FilesList): void {
    files.value = value;
}

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
 * Fetch quick menu configuration and initialize state
 */
const getQuickMenu = async (): Promise<void> => {
    try {
        const res = await apiGetQuickMenu();
        if (!res) return;

        quickMenu.value = res;
        QUICK_MENU_MCP_ID.value = res.id;

        // Initialize button active state (read-only, don't modify localStorage)
        isQuickMenu.value = readMcpIdsFromStorage().includes(QUICK_MENU_MCP_ID.value || "");
    } catch (error) {
        console.error("Failed to fetch quick menu:", error);
    }
};

/**
 * Create a new chat conversation
 * @param prompt - The initial prompt for the conversation
 */
async function createChat(prompt: string): Promise<void> {
    try {
        // Validate model selection for logged-in users
        if (!selectedModelId.value && useUserStore().isLogin) {
            useMessage().warning(t("ai-chat.frontend.selectModel"));
            return;
        }

        const chat = await apiCreateAiConversation({
            title: "",
        });

        // Store conversation metadata in store
        chatStore.setPendingConversation({
            id: chat.id,
            modelId: selectedModelId.value,
            title: prompt,
            files: files.value.length > 0 ? files.value : undefined,
        });

        // Refresh chat data and navigate to new conversation
        refreshNuxtData("chats");
        await navigateTo({
            path: `/chat/${chat.id}`,
        });
    } catch (error) {
        console.error("Failed to create conversation:", error);
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
    const mcpId = QUICK_MENU_MCP_ID.value;
    const hasInStore = stored.includes(mcpId);
    const hasInState = selectedMcpIdList.value.includes(mcpId);

    if (!hasInStore && !hasInState) {
        // Add to both localStorage and memory (deduplication)
        stored.push(mcpId);
        if (!hasInState) {
            selectedMcpIdList.value.push(mcpId);
        }
        writeMcpIdsToStorage(stored);
    } else {
        // Remove ID from both localStorage and memory, but don't affect other selected MCPs
        const nextStore = stored.filter((id) => id !== mcpId);
        const nextState = selectedMcpIdList.value.filter((id) => id !== mcpId);
        writeMcpIdsToStorage(nextStore);
        selectedMcpIdList.value = nextState;
    }

    // Update button state based on latest storage result
    isQuickMenu.value = readMcpIdsFromStorage().includes(mcpId);
};

// Initialize quick menu on component mount
onMounted(() => {
    getQuickMenu();
});

// Page metadata configuration
definePageMeta({
    layout: "default",
    name: "menu.home",
    auth: false,
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="ai-chat dark:bg-muted/50 flex h-full min-h-0 items-center justify-center pl-0">
        <div
            class="border-border/50 h-full flex-none border-r pl-0"
            :class="{ 'border-none': !controlsStore.chatSidebarVisible }"
        >
            <ChatsChats />
        </div>

        <div
            class="bg-background flex h-full min-h-0 flex-1 flex-col items-center justify-center rounded-lg"
        >
            <!-- 主内容区 -->
            <div class="flex h-full w-full max-w-[800px] flex-col items-center justify-center">
                <!-- 欢迎标题 -->
                <div class="mb-8 text-center">
                    <h1 class="mb-2 flex items-center justify-center text-2xl font-bold">
                        {{ welcomeInfo.title }}
                    </h1>
                    <p class="text-accent-foreground text-sm">
                        {{ welcomeInfo.description }}
                    </p>
                </div>

                <!-- 输入框 -->
                <div class="w-full px-4">
                    <ChatsPrompt
                        class="[view-transition-name:chat-prompt]"
                        v-model="inputValue"
                        :file-list="files"
                        :rows="2"
                        :needAuth="true"
                        :attachmentSizeLimit="chatConfig?.attachmentSizeLimit"
                        @submit="createChat"
                        @update:file-list="handleFileListUpdate"
                    >
                        <template #panel-left>
                            <ModelSelect
                                v-model="selectedModelId"
                                :modelId="selectedModelId || ''"
                                :supportedModelTypes="['llm']"
                                :show-billingRule="true"
                                :open-local-storage="true"
                                placeholder="选择AI模型开始对话"
                                @change="controlsStore.setSelectedModel"
                            />
                            <McpToolSelect
                                v-model="selectedMcpIdList"
                                :mcpIds="selectedMcpIdList || []"
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

                <!-- 建议选项 -->
                <div
                    class="my-4 flex w-full flex-wrap justify-center gap-3"
                    v-if="suggestionsEnabled"
                >
                    <UButton
                        v-for="(suggestion, index) in suggestions"
                        :key="index"
                        variant="outline"
                        color="neutral"
                        size="md"
                        @click="createChat(suggestion.text)"
                    >
                        <span class="mr-1">{{ suggestion.icon }}</span>
                        {{ suggestion.text }}
                    </UButton>
                </div>
            </div>

            <!-- 页脚 -->
            <div class="w-full p-2 text-center text-xs text-gray-400">
                <div class="flex flex-col items-center justify-center gap-1">
                    <span>{{ welcomeInfo.footer }}</span>
                    <div class="flex items-center justify-center gap-2">
                        <a
                            :href="appStore.siteConfig?.copyright.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="hover:text-primary flex items-center justify-center gap-1 transition-colors"
                        >
                            <UAvatar
                                v-if="appStore.siteConfig?.copyright.iconUrl"
                                :src="appStore.siteConfig?.copyright.iconUrl"
                                :ui="{ root: 'size-4 rounded-md' }"
                            />
                            <span>{{ appStore.siteConfig?.copyright.displayName }}</span>
                        </a>
                        <span
                            v-if="
                                (appStore.siteConfig?.copyright.displayName ||
                                    appStore.siteConfig?.copyright.iconUrl) &&
                                (appStore.siteConfig?.copyright.copyrightText ||
                                    appStore.siteConfig?.copyright.copyrightBrand)
                            "
                            >|</span
                        >
                        <span class="space-x-1">
                            <span>{{ appStore.siteConfig?.copyright.copyrightText }}</span>
                            <a
                                class="text-primary font-bold"
                                :href="appStore.siteConfig?.copyright.copyrightUrl"
                                target="_blank"
                            >
                                {{ appStore.siteConfig?.copyright.copyrightBrand }}
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
