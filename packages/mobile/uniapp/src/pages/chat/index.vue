<script setup lang="ts">
definePage({
    style: {
        navigationBarTitle: "pages.chat",
        auth: false,
        hiddenHeader: true,
    },
});

import type { AiMessage } from "@buildingai/service/models/message";
import type { MessageContentPart } from "@buildingai/types";

// #ifdef H5
import BdMarkdown from "@/async-components/bd-markdown/index.vue?async";
// #endif
import McpSelect from "@/async-components/mcp-select/index.vue?async";
// #ifndef H5
import UaMarkdown from "@/async-components/ua-markdown/ua-markdown.vue?async";
// #endif
import ChatsChats from "@/components/ask-assistant-chat/chats-chats.vue";
import ChatsMessages from "@/components/ask-assistant-chat/chats-messages.vue";
import ChatsPrompt from "@/components/ask-assistant-chat/chats-prompt/chats-prompt.vue";
import BdModal from "@/components/bd-modal.vue";
import BdNavbar from "@/components/bd-navbar.vue";
import ModelSelect from "@/components/model-select/model-select.vue";
import { generateUuid, useChat } from "@/hooks/use-chat";
import { useHalfPopupInteraction } from "@/hooks/use-half-popup-interaction";
import type { AiModel } from "@/service/ai-conversation";
import {
    type AiConversation,
    apiDeleteAiConversation,
    apiGetAiConversation,
    apiGetAiConversationDetail,
    apiGetChatConfig,
    apiUpdateAiConversation,
} from "@/service/ai-conversation";

const { t } = useI18n();
const userStore = useUserStore();
const appStore = useAppStore();

const showDrawer = shallowRef(false);
const isEditMode = shallowRef(false);
const chatsChatsRef = ref<InstanceType<typeof ChatsChats>>();
const modalRef = ref<InstanceType<typeof BdModal>>();
const deleteModalRef = ref<InstanceType<typeof BdModal>>();
const editTitle = shallowRef("");
const currentEditItem = shallowRef<AiConversation | null>(null);
const modelSelectRef = ref<InstanceType<typeof ModelSelect>>();

const modelIdCookie = useCookie<string>("modelId", { default: "" });
const selectedModelId = shallowRef<string>("");
const selectedModel = shallowRef<AiModel | null>(null);
const selectedMcpIds = useCookie<string[]>("mcpIds", { default: () => [] });
const mcpSelectRef = ref<InstanceType<typeof McpSelect>>();

const {
    handleSlideProgress: handleModelSelectSlideProgress,
    handlePopupOpen: handleModelSelectOpen,
    handlePopupClose: handleModelSelectClose,
    pageTransform,
} = useHalfPopupInteraction();

const { isLoaded: isMcpSelectLoaded } = useAsyncPackage("mcp-select");

const currentConversationId = ref<string | undefined>(undefined);
const currentConversation = shallowRef<AiConversation | null>(null);
const chatConfig = shallowRef<Awaited<ReturnType<typeof apiGetChatConfig>> | null>(null);

const pagingRef = ref<ZPagingRef>();

const queryList = async (pageNo: number, pageSize: number) => {
    const conversationId = currentConversationId.value;
    if (!conversationId) {
        pagingRef.value?.complete([]);
        return;
    }

    try {
        const data = await apiGetAiConversation(conversationId, {
            page: pageNo,
            pageSize,
        });
        const list = data.items.map((item: AiMessage) => ({
            id: item.id || generateUuid(),
            role: item.role,
            metadata: item.metadata,
            content: item.errorMessage || item.content,
            status: item.errorMessage ? ("failed" as const) : ("completed" as const),
            mcpToolCalls: item.mcpToolCalls,
            createdAt: item.createdAt,
        }));
        pagingRef.value?.complete(list);
    } catch (error) {
        console.error("Failed to load messages:", error);
        pagingRef.value?.complete(false);
    }
};

const loadConversationDetail = async (id?: string) => {
    const conversationId = id || currentConversationId.value;
    if (!conversationId) return;
    try {
        currentConversation.value = await apiGetAiConversationDetail(conversationId);
    } catch (error) {
        console.error("Failed to load conversation detail:", error);
    }
};

const loadChatConfig = async () => {
    try {
        chatConfig.value = await apiGetChatConfig();
    } catch (error) {
        console.error("Failed to load chat config:", error);
    }
};

// 使用 useChat hook
const {
    messages,
    input,
    files,
    status,
    error,
    handleSubmit,
    reload,
    stop,
    setMessages,
    streamClientRef,
    handleStreamOpen,
    handleStreamMessage,
    handleStreamError,
    handleStreamFinish,
    handleRetryUpperLimit,
    timeout: streamTimeout,
    heartbeatTimeout: streamHeartbeatTimeout,
    maxRetryCount: streamMaxRetryCount,
} = useChat({
    id: () => currentConversationId.value,
    apiUrl: "/ai-chat/stream",
    body: () => ({
        modelId: selectedModelId.value,
        mcpServers: selectedMcpIds.value.length > 0 ? selectedMcpIds.value : undefined,
    }),
    onResponse(response: { status?: number }) {
        if (response?.status === 401) {
            userStore.logout();
        }
    },
    onError(err: Error) {
        const message = err?.message || t("ai-chat.frontend.sendFailed") || "发送失败";
        console.error("Chat error:", message);
    },
    onUpdate(chunk) {
        // 处理 conversation_id 更新
        if (chunk.type === "conversation_id" && chunk.data) {
            const newConversationId =
                typeof chunk.data === "string" ? chunk.data : (chunk.data as { id?: string })?.id;
            if (newConversationId && !currentConversationId.value) {
                currentConversationId.value = newConversationId;
            }
            return;
        }
    },
    onFinish() {
        userStore.getUser();
        chatsChatsRef.value?.refresh();
        if (currentConversationId.value) {
            loadConversationDetail();
        }
    },
});

const handleSubmitMessage = async (content: string) => {
    if ((!content.trim() && !files.value.length) || status.value === "loading") return;

    if (!userStore.isLogin) {
        return userStore.toLogin();
    }

    const userMessage: AiMessage = {
        id: generateUuid(),
        role: "user",
        content:
            files.value.length > 0
                ? ([
                      ...files.value,
                      ...(content ? [{ type: "text", text: content }] : []),
                  ] as MessageContentPart[])
                : content,
        status: "completed",
        mcpToolCalls: [],
    };
    // pagingRef.value?.addChatRecordData(userMessage);
    messages.value.unshift(userMessage);

    const assistantMessage: AiMessage = {
        id: generateUuid(),
        role: "assistant",
        content: "",
        status: "loading",
        mcpToolCalls: [],
    };
    messages.value.unshift(assistantMessage);
    messages.value = [...messages.value];
    // await pagingRef.value?.addChatRecordData(assistantMessage);

    input.value = "";
    files.value = [];

    await handleSubmit(content);
};

watch(messages, (newMessages) => {
    console.log("messages", newMessages);
});

const isLoading = computed(() => status.value === "loading");

const handleSuggestionClick = async (suggestion: string) => {
    await handleSubmitMessage(suggestion);
};

const openModelSelect = () => {
    modelSelectRef.value?.open();
};

const handleModelChange = (model: AiModel | null) => {
    if (model) {
        selectedModel.value = model;
        selectedModelId.value = model.id;
        modelIdCookie.value = model.id;
    }
};

const handleEdit = (item: AiConversation) => {
    currentEditItem.value = item;
    editTitle.value = item.title;
    modalRef.value?.open();
};

const handleDelete = (item: AiConversation) => {
    currentEditItem.value = item;
    deleteModalRef.value?.open();
};

const handleNewChat = () => {
    showDrawer.value = false;
    currentConversationId.value = undefined;
    messages.value = [];
    setMessages([]);
};

const handleChatSelect = async (item: AiConversation) => {
    showDrawer.value = false;
    const targetId = item.id;
    if (currentConversationId.value === targetId) {
        return;
    }

    currentConversationId.value = targetId;
    messages.value = [];
    setMessages([]);
    await loadConversationDetail(targetId);
    pagingRef.value?.reload();
};

const confirmEdit = async () => {
    if (!currentEditItem.value || !editTitle.value.trim()) {
        useToast().error("标题不能为空");
        return;
    }

    try {
        await apiUpdateAiConversation(currentEditItem.value.id, {
            title: editTitle.value.trim(),
        });
        chatsChatsRef.value?.refresh();
        if (currentConversationId.value === currentEditItem.value.id) {
            loadConversationDetail();
        }
    } catch (error) {
        console.error(error);
        useToast().error("修改失败");
    }
};

const confirmDelete = async () => {
    if (!currentEditItem.value) {
        return;
    }

    try {
        await apiDeleteAiConversation(currentEditItem.value.id);
        chatsChatsRef.value?.refresh();
    } catch (error) {
        console.error(error);
        useToast().error("删除失败");
    }
};

onMounted(async () => {
    await loadChatConfig();

    if (modelIdCookie.value) {
        selectedModelId.value = modelIdCookie.value;
    }

    if (currentConversationId.value) {
        await loadConversationDetail();
    }
});

const containerStyle = computed(() => ({
    ...pageTransform.value,
    backgroundColor: messages.value.length === 0 ? "var(--background-soft)" : "var(--background)",
}));

const navbarTitle = computed(() => {
    if (isLoading.value) {
        return t("common.typing");
    }
    if (currentConversation.value?.title) {
        return currentConversation.value.title;
    }
    return appStore.siteConfig?.webinfo?.name || "BuildingAI";
});
</script>

<template>
    <swipe-drawer ref="drawer" v-model="showDrawer" drawerBgColor="var(--background)" h="full">
        <template #drawer>
            <view class="bg-background flex h-full min-h-0 w-full flex-col">
                <BdNavbar title="" :show-back="true" :show-home="true" filter="blur(4px)">
                    <template #left>
                        <text class="text-md font-medium">历史记录</text>
                    </template>
                    <template #right>
                        <text
                            v-if="!isEditMode"
                            class="text-primary text-md p-1"
                            @click="isEditMode = true"
                        >
                            编辑
                        </text>
                        <text v-else class="text-primary text-md p-1" @click="isEditMode = false">
                            完成
                        </text>
                    </template>
                </BdNavbar>

                <view class="h-full">
                    <ChatsChats
                        :current-conversation-id="currentConversationId"
                        ref="chatsChatsRef"
                        :is-edit-mode="isEditMode"
                        @edit="handleEdit"
                        @delete="handleDelete"
                        @select="handleChatSelect"
                    />
                </view>
            </view>
        </template>

        <template #content>
            <view
                class="chat-content-container flex h-full min-h-0 flex-col"
                :style="containerStyle"
            >
                <BdNavbar
                    :title="navbarTitle"
                    :show-back="true"
                    :show-home="true"
                    filter="blur(4px)"
                >
                    <template #left>
                        <view class="flex items-center gap-1">
                            <view class="p-2" @click="showDrawer = true">
                                <text class="i-tabler-align-left text-lg" />
                            </view>
                            <view class="p-2" v-if="currentConversationId" @click="handleNewChat">
                                <text class="i-tabler-message-circle-plus text-lg" />
                            </view>
                        </view>
                    </template>
                </BdNavbar>

                <z-paging
                    ref="pagingRef"
                    v-model="messages"
                    :auto-clean-list-when-reload="false"
                    :show-chat-loading-when-reload="true"
                    :auto-hide-keyboard-when-chat="false"
                    :auto-adjust-position-when-chat="false"
                    use-chat-record-mode
                    :bottom-bg-color="'var(--background-soft)'"
                    :fixed="false"
                    :show-loading-more-no-more-view="false"
                    class="h-full"
                    @query="queryList"
                >
                    <template #empty>
                        <view
                            v-if="messages.length === 0 && chatConfig?.welcomeInfo"
                            class="flex h-full w-screen flex-col justify-center gap-0 px-6 py-8"
                        >
                            <view class="mb-4 flex flex-col gap-2">
                                <text class="text-foreground text-md font-semibold">
                                    {{ userStore.userInfo?.username || "用户" }}, 你好
                                </text>
                                <text class="text-foreground text-2xl"> 需要我为你做些什么? </text>
                            </view>

                            <template
                                v-if="
                                    chatConfig.suggestionsEnabled && chatConfig.suggestions?.length
                                "
                            >
                                <view
                                    v-for="(suggestion, index) in chatConfig.suggestions"
                                    :key="index"
                                    class="mb-2"
                                >
                                    <view
                                        class="active:bg-muted/70 border-muted bg-background hover:bg-muted/50 inline-block rounded-full px-3 py-2 transition-colors"
                                        @click="handleSuggestionClick(suggestion.text)"
                                    >
                                        <text v-if="suggestion.icon" class="mr-2 text-lg">
                                            {{ suggestion.icon }}
                                        </text>
                                        <text class="text-foreground text-sm">
                                            {{ suggestion.text }}
                                        </text>
                                    </view>
                                </view>
                            </template>
                        </view>
                    </template>

                    <view :class="{ 'pb-10': messages.length > 0 }">
                        <view
                            v-for="(message, index) in messages"
                            :key="`${message.id} + ${index} + ''`"
                            style="transform: scaleY(-1); padding-bottom: 16px"
                        >
                            <ChatsMessages
                                :messages="[message]"
                                :error="error as unknown as Error"
                                :assistant="{
                                    actions: [
                                        {
                                            label: t('ai-chat.frontend.messages.retry') || '重试',
                                            icon: 'i-lucide-rotate-cw-square',
                                            onClick: () => reload(),
                                        },
                                    ],
                                }"
                                :spacing-offset="0"
                            >
                                <template #content="{ message: msg }">
                                    <!-- #ifdef H5 -->
                                    <BdMarkdown class="pt-4" :content="msg.content as string" />
                                    <!-- #endif -->
                                    <!-- #ifndef H5 -->
                                    <UaMarkdown class="pt-4" :content="msg.content as string" />
                                    <!-- #endif -->
                                </template>
                            </ChatsMessages>
                        </view>
                    </view>
                </z-paging>
            </view>
        </template>

        <template #footer>
            <ChatsPrompt
                v-model="input"
                v-model:file-list="files"
                :is-loading="isLoading"
                :need-auth="true"
                :attachment-size-limit="chatConfig?.attachmentSizeLimit"
                :selected-model="selectedModel"
                :class="{
                    'bg-background-soft': messages.length === 0,
                    'bg-background': messages.length > 0,
                }"
                @submit="handleSubmitMessage"
                @stop="stop"
            >
                <template class="flex items-center gap-2" #action-left>
                    <view
                        class="bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-2"
                        @click="openModelSelect"
                    >
                        <text class="i-lucide-brain text-xs" />
                        <text class="text-foreground text-xs">
                            {{ selectedModel?.name || "选择模型" }}
                        </text>
                    </view>

                    <McpSelect
                        v-show="isMcpSelectLoaded"
                        ref="mcpSelectRef"
                        v-model="selectedMcpIds"
                        placement="top"
                        :disabled="isLoading"
                    >
                        <view
                            class="bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-2 text-xs"
                            :class="{
                                'bg-muted': selectedMcpIds.length > 0,
                            }"
                        >
                            <text class="i-lucide-route text-xs" />
                            <text>MCP</text>
                            <text
                                v-if="selectedMcpIds.length > 0"
                                class="bg-primary flex size-4 items-center justify-center rounded-full text-xs text-white"
                            >
                                {{ selectedMcpIds.length }}
                            </text>
                        </view>
                    </McpSelect>
                </template>
            </ChatsPrompt>
        </template>
    </swipe-drawer>

    <BdModal
        :zIndex="99999"
        ref="modalRef"
        title="编辑标题"
        :show-cancel="true"
        :show-confirm="true"
        @confirm="confirmEdit"
    >
        <view w="full" py="3">
            <uni-easyinput
                v-model="editTitle"
                placeholder="请输入标题"
                :trim="true"
                :maxlength="100"
            />
        </view>
    </BdModal>

    <BdModal
        :zIndex="99999"
        ref="deleteModalRef"
        title="删除聊天记录"
        content="删除后，聊天记录不可恢复"
        @confirm="confirmDelete"
    />

    <ModelSelect
        ref="modelSelectRef"
        v-model="selectedModelId"
        :supported-model-types="['llm']"
        :open-local-storage="true"
        @change="handleModelChange"
        @slide-progress="handleModelSelectSlideProgress"
        @open="handleModelSelectOpen"
        @close="handleModelSelectClose"
    />

    <!-- 流式客户端组件 -->
    <stream-client
        ref="streamClientRef"
        :timeout="streamTimeout"
        :heartbeat-timeout="streamHeartbeatTimeout"
        :max-retry-count="streamMaxRetryCount"
        @onOpen="handleStreamOpen"
        @onMessage="handleStreamMessage"
        @onError="handleStreamError"
        @onFinish="handleStreamFinish"
        @onRetryuUpperlimit="handleRetryUpperLimit"
    />
</template>

<style scoped>
.chat-content-container {
    -webkit-backface-visibility: hidden;
    will-change: transform;
    backface-visibility: hidden;
    transform-style: preserve-3d;
}
</style>
