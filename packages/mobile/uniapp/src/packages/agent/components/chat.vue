<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import type { FormFieldConfig } from "@buildingai/service/consoleapi/ai-agent";
import type { AiMessage } from "@buildingai/service/models/message";
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";
import type { MessageContentPart } from "@buildingai/types";
import { useQuery } from "@uni-helper/uni-use";

// #ifdef H5
import BdMarkdown from "@/async-components/bd-markdown/index.vue?async";
// #endif
// #ifndef H5
import UaMarkdown from "@/async-components/ua-markdown/ua-markdown.vue?async";
// #endif
import ChatsMessages from "@/components/ask-assistant-chat/chats-messages.vue";
import ChatsPrompt from "@/components/ask-assistant-chat/chats-prompt/chats-prompt.vue";
import BdModal from "@/components/bd-modal.vue";
import BdNavbar from "@/components/bd-navbar.vue";
import { generateUuid, useChat } from "@/hooks/use-chat";
import {
    apiDeleteConversation,
    apiGenerateAccessToken,
    apiGetAgentInfo,
    apiGetMessages,
    apiUpdateConversation,
} from "@/service/agent";
import { apiGetChatConfig } from "@/service/ai-conversation";

import AgentChats from "./chats-chats.vue";
import AgentFormFields from "./form-fields.vue";

const props = defineProps<{
    // 扣费模式：creator、user、all
    billingMode: string;
}>();

const { value: publishToken } = useQuery("id");

const { t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();

const conversationIdCookie = useCookie<string>(`public_agent_conversation_${publishToken.value}`, {
    default: "",
});
const accessTokenCookie = useCookie<string>(`public_agent_token_${publishToken.value}`, {
    default: "",
});

const conversationId = shallowRef<string | null>(conversationIdCookie.value || null);
const accessToken = shallowRef<string>(accessTokenCookie.value || "");
const agent = shallowRef<Agent | null>(null);
const agentLoading = shallowRef(true);
const agentError = shallowRef<string>("");
const chatConfig = shallowRef<Awaited<ReturnType<typeof apiGetChatConfig>> | null>(null);
const showOpeningStatement = ref(true);

const pagingRef = ref<ZPagingRef>();
const formFieldsInputs = ref<Record<string, unknown>>({});
const agentFormFieldsRef = ref<InstanceType<typeof AgentFormFields>>();

const showDrawer = shallowRef(false);
const isEditMode = shallowRef(false);
const agentChatsRef = ref<InstanceType<typeof AgentChats>>();
const modalRef = ref<InstanceType<typeof BdModal>>();
const deleteModalRef = ref<InstanceType<typeof BdModal>>();
const editTitle = shallowRef("");
const currentEditItem = shallowRef<AiConversation | null>(null);

watch(conversationId, (newVal) => {
    conversationIdCookie.value = newVal || "";
});

watch(accessToken, (newVal) => {
    accessTokenCookie.value = newVal;
});

const loadAccessToken = async () => {
    if (accessToken.value) {
        return;
    }

    try {
        const tokenInfo = await apiGenerateAccessToken(publishToken.value);
        accessToken.value = tokenInfo.accessToken;
    } catch (error) {
        console.error("生成访问令牌失败:", error);
        agentError.value = "无法生成访问令牌";
    }
};

const loadAgentInfo = async () => {
    if (!publishToken.value) {
        agentError.value = "缺少发布令牌";
        agentLoading.value = false;
        return;
    }

    try {
        agentLoading.value = true;
        await loadAccessToken();
        if (!accessToken.value) {
            agentError.value = "无法获取访问令牌";
            agentLoading.value = false;
            return;
        }

        agent.value = await apiGetAgentInfo(publishToken.value, accessToken.value);
        agentLoading.value = false;

        if (agent.value?.formFields) {
            formFieldsInputs.value = {};
        }
    } catch (error) {
        console.error("获取智能体信息失败:", error);
        agentError.value = "智能体不存在或未发布";
        agentLoading.value = false;
    }
};

const loadChatConfig = async () => {
    try {
        chatConfig.value = await apiGetChatConfig();
    } catch (error) {
        console.error("获取聊天配置失败:", error);
    }
};

const queryList = async (pageNo: number, pageSize: number) => {
    if (!conversationId.value || !accessToken.value || !publishToken.value) {
        pagingRef.value?.complete([]);
        return;
    }

    try {
        const data = await apiGetMessages(
            publishToken.value,
            accessToken.value,
            conversationId.value,
            {
                page: pageNo,
                pageSize,
            },
        );

        const list = data.items.map((item: AiMessage) => ({
            id: item.id || generateUuid(),
            role: item.role,
            metadata: item.metadata,
            content: item.errorMessage || item.content,
            status: item.errorMessage ? ("failed" as const) : ("completed" as const),
            mcpToolCalls: item.mcpToolCalls,
            createdAt: item.createdAt,
        }));
        pagingRef.value?.complete(list.reverse());
    } catch (error) {
        console.error("加载消息失败:", error);
        pagingRef.value?.complete(false);
    }
};

const handleGoBack = () => {
    uni.navigateBack();
};

const createNewConversation = () => {
    conversationId.value = null;
    messages.value = [];
    formFieldsInputs.value = {};
    showOpeningStatement.value = true;
    pagingRef.value?.reload();
};

const refreshConversationsList = () => {
    agentChatsRef.value?.refresh();
};

const handleEdit = (item: AiConversation) => {
    currentEditItem.value = item;
    editTitle.value = item.title || "";
    modalRef.value?.open();
};

const handleDelete = (item: AiConversation) => {
    currentEditItem.value = item;
    deleteModalRef.value?.open();
};

const handleChatSelect = async (item: AiConversation) => {
    showDrawer.value = false;
    const targetId = item.id;
    if (conversationId.value === targetId) {
        return;
    }

    conversationId.value = targetId;
    messages.value = [];
    pagingRef.value?.reload();
};

const confirmEdit = async () => {
    if (
        !currentEditItem.value ||
        !editTitle.value.trim() ||
        !accessToken.value ||
        !publishToken.value
    ) {
        useToast().error("标题不能为空");
        return;
    }

    try {
        await apiUpdateConversation(
            publishToken.value,
            accessToken.value,
            currentEditItem.value.id,
            {
                title: editTitle.value.trim(),
            },
        );
        refreshConversationsList();
    } catch (error) {
        console.error(error);
        useToast().error("修改失败");
    }
};

const confirmDelete = async () => {
    if (!currentEditItem.value || !accessToken.value || !publishToken.value) {
        return;
    }

    try {
        await apiDeleteConversation(
            publishToken.value,
            accessToken.value,
            currentEditItem.value.id,
        );
        refreshConversationsList();
        if (conversationId.value === currentEditItem.value.id) {
            createNewConversation();
        }
    } catch (error) {
        console.error(error);
        useToast().error("删除失败");
    }
};

const {
    messages,
    input,
    files,
    status,
    error,
    stop,
    reload,
    handleSubmit,
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
    id: () => conversationId.value || undefined,
    apiUrl: "",
    body: () => ({
        saveConversation: true,
        conversationId: conversationId.value || null,
        billingMode: props.billingMode,
        formFields: agent.value?.formFields || [],
        formFieldsInputs: formFieldsInputs.value,
    }),
    buildStreamUrl: () => {
        const baseUrl = getBaseUrl();
        const CONSOLE_PREFIX = import.meta.env.VITE_APP_CONSOLE_API_PREFIX || "/consoleapi";
        return `${baseUrl}${CONSOLE_PREFIX}/v1/${publishToken.value}/chat`;
    },
    buildHeaders: () => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (userStore.token && props.billingMode === "user") {
            headers.Authorization = `Bearer ${userStore.token}`;
        } else {
            if (!publishToken.value) {
                throw new Error("Publish token is required");
            }
            headers.Authorization = `Bearer ${publishToken.value}`;
        }

        return headers;
    },
    onResponse(response: { status?: number }) {
        if (response?.status === 401) {
            loadAccessToken();
        }
    },
    onError(err: Error) {
        const message = err?.message || t("ai-chat.frontend.sendFailed") || "发送失败";
        console.error("Chat error:", message);
    },
    onUpdate(chunk) {
        if (chunk.type === "conversation_id" && chunk.data) {
            const newConversationId =
                typeof chunk.data === "string" ? chunk.data : (chunk.data as { id?: string })?.id;
            if (newConversationId && !conversationId.value) {
                conversationId.value = newConversationId;
            }
            return;
        }
    },
    onFinish() {
        if (conversationId.value) {
            pagingRef.value?.reload();
            refreshConversationsList();
        }
    },
});

const isLoading = computed(() => status.value === "loading");

const handleSubmitMessage = async (content: string) => {
    if ((!content.trim() && !files.value.length) || isLoading.value) return;

    // billingMode === "user" 时需要登录才能发送消息
    if (props.billingMode === "user" && !userStore.isLogin) {
        return userStore.toLogin();
    }

    if (!agent.value) {
        useToast().error("智能体信息未加载");
        return;
    }

    if (!accessToken.value) {
        useToast().error("请先生成访问令牌");
        return;
    }

    if (agent.value.formFields && agent.value.formFields.length > 0) {
        try {
            await agentFormFieldsRef.value?.validate();
        } catch {
            return;
        }
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

    showOpeningStatement.value = false;

    input.value = "";
    files.value = [];

    await handleSubmit(content);
};

const handleStartConversation = async () => {
    try {
        await agentFormFieldsRef.value?.validate();
        showOpeningStatement.value = false;
    } catch (error) {
        console.error("表单验证失败:", error);
        useToast().error("请填写所有必填项");
    }
};

const handleSuggestionClick = async (text: string) => {
    await handleSubmitMessage(text);
};

const navbarTitle = computed(() => {
    if (isLoading.value) {
        return t("common.typing");
    }
    if (agent.value?.name) {
        return agent.value.name;
    }
    return appStore.siteConfig?.webinfo?.name || "BuildingAI";
});

const containerStyle = computed(() => ({
    backgroundColor: messages.value.length === 0 ? "var(--background-soft)" : "var(--background)",
}));

onMounted(async () => {
    await loadChatConfig();
    await loadAgentInfo();

    if (conversationId.value) {
        pagingRef.value?.reload();
        showOpeningStatement.value = false;
    } else {
        showOpeningStatement.value = true;
    }
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
                        <view class="p-2" @click="isEditMode = !isEditMode">
                            <text class="text-primary text-sm">{{
                                isEditMode ? "完成" : "编辑"
                            }}</text>
                        </view>
                    </template>
                </BdNavbar>
                <view class="h-full">
                    <AgentChats
                        v-if="publishToken && accessToken"
                        ref="agentChatsRef"
                        :publish-token="publishToken"
                        :access-token="accessToken"
                        :is-edit-mode="isEditMode"
                        :current-conversation-id="conversationId"
                        @edit="handleEdit"
                        @delete="handleDelete"
                        @select="handleChatSelect"
                    />
                </view>
            </view>
        </template>

        <template #content>
            <view class="flex h-full min-h-0 flex-col" :style="containerStyle">
                <BdNavbar
                    :title="navbarTitle"
                    :show-back="true"
                    :show-home="true"
                    :bg-color="
                        messages.length === 0 ? 'var(--background-soft)' : 'var(--background)'
                    "
                    filter="blur(4px)"
                >
                    <template #left>
                        <view class="flex items-center gap-1">
                            <view v-if="billingMode === 'user'" class="p-2" @click="handleGoBack">
                                <text class="i-tabler-arrow-left text-lg" />
                            </view>
                            <view class="p-2" @click="showDrawer = true">
                                <text class="i-tabler-align-left text-lg" />
                            </view>
                            <view class="p-2" v-if="conversationId" @click="createNewConversation">
                                <text class="i-tabler-message-circle-plus text-lg" />
                            </view>
                        </view>
                    </template>
                    <template #right>
                        <view
                            v-if="
                                agent?.formFields &&
                                agent.formFields.length > 0 &&
                                (messages.length || !showOpeningStatement)
                            "
                            @click="showOpeningStatement = !showOpeningStatement"
                        >
                            <text class="text-primary text-sm">
                                {{ !showOpeningStatement ? "编辑" : "关闭" }}
                            </text>
                        </view>
                    </template>
                </BdNavbar>

                <!-- 加载状态 -->
                <view v-if="agentLoading" class="flex h-full w-full items-center justify-center">
                    <view class="flex items-center gap-3">
                        <text class="i-lucide-loader-2 text-primary animate-spin text-lg" />
                        <text class="text-lg">加载智能体中...</text>
                    </view>
                </view>

                <!-- 错误状态 -->
                <view v-else-if="agentError" class="flex h-full w-full items-center justify-center">
                    <view class="text-center">
                        <text class="i-lucide-alert-circle text-error mb-4 text-4xl" />
                        <text class="mb-2 text-xl font-semibold">加载失败</text>
                        <text class="text-muted-foreground">{{ agentError }}</text>
                    </view>
                </view>

                <!-- 聊天界面 -->
                <view v-else-if="agent" class="flex h-full min-h-0 flex-col">
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
                            <!-- 表单变量输入 -->
                            <view
                                v-if="
                                    messages.length === 0 &&
                                    agent.formFields &&
                                    agent.formFields.length > 0 &&
                                    showOpeningStatement
                                "
                                class="flex h-full w-screen flex-col justify-center gap-0 px-6 py-8"
                            >
                                <view class="bg-background my-6 w-full rounded-lg">
                                    <view
                                        class="text-foreground border-muted/10 text-md flex items-center justify-between border-b p-4 font-medium"
                                    >
                                        <text class="flex items-center gap-2">
                                            <text
                                                class="i-lucide-bot-message-square text-primary text-2xl"
                                            />
                                            新对话设置
                                        </text>
                                    </view>
                                    <view class="p-4">
                                        <AgentFormFields
                                            ref="agentFormFieldsRef"
                                            :form-fields="agent.formFields as FormFieldConfig[]"
                                            v-model="formFieldsInputs"
                                        />
                                    </view>
                                    <view class="mt-2 p-4">
                                        <view
                                            class="bg-primary flex w-full items-center justify-center rounded-lg py-2 text-xs text-white"
                                            @click="handleStartConversation"
                                        >
                                            <text>开始对话</text>
                                        </view>
                                    </view>
                                </view>
                            </view>

                            <!-- 开场白与提问建议 -->
                            <view
                                v-if="
                                    messages.length === 0 &&
                                    (!showOpeningStatement || !agent.formFields?.length) &&
                                    agent.openingStatement?.length &&
                                    agent.openingQuestions?.length
                                "
                                class="flex h-full w-full flex-col justify-center gap-0 px-4"
                            >
                                <view class="mb-4 flex flex-col gap-2">
                                    <!-- #ifdef H5 -->
                                    <BdMarkdown
                                        class="text-foreground"
                                        :custom-style="{ '--md-bg': 'var(--background-soft)' }"
                                        :content="agent.openingStatement || ''"
                                    />
                                    <!-- #endif -->
                                    <!-- #ifndef H5 -->
                                    <UaMarkdown
                                        :custom-style="{ '--md-bg': 'var(--background-soft)' }"
                                        class="text-foreground"
                                        :content="agent.openingStatement || ''"
                                    />
                                    <!-- #endif -->
                                </view>

                                <view
                                    v-for="(question, index) in agent.openingQuestions"
                                    :key="index"
                                    class="mb-2"
                                >
                                    <view
                                        class="active:bg-muted/70 border-muted bg-background hover:bg-muted/50 inline-block rounded-full px-3 py-2 transition-colors"
                                        @click="handleSuggestionClick(question)"
                                    >
                                        <text class="text-foreground text-sm">{{ question }}</text>
                                    </view>
                                </view>
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
                                                label:
                                                    t('ai-chat.frontend.messages.retry') || '重试',
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
            </view>
        </template>
        <template #footer>
            <ChatsPrompt
                v-model="input"
                v-model:file-list="files"
                :is-loading="isLoading"
                :need-auth="false"
                safe-area-inset-bottom
                :attachment-size-limit="chatConfig?.attachmentSizeLimit"
                :class="{
                    'bg-background-soft': messages.length === 0,
                    'bg-background': messages.length > 0,
                }"
                @submit="handleSubmitMessage"
                @stop="stop"
            />
        </template>
    </swipe-drawer>

    <BdModal
        :zIndex="99999"
        ref="modalRef"
        title="编辑对话"
        :show-close="true"
        @confirm="confirmEdit"
    >
        <view class="p-4">
            <uni-easyinput v-model="editTitle" placeholder="请输入对话标题" :maxlength="50" />
        </view>
    </BdModal>

    <BdModal
        :zIndex="99999"
        ref="deleteModalRef"
        title="删除对话"
        :show-close="true"
        @confirm="confirmDelete"
    >
        <view class="p-4">
            <text>确定要删除这个对话吗？删除后无法恢复。</text>
        </view>
    </BdModal>

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
