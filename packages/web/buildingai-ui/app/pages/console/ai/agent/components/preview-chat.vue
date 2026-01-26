<script setup lang="ts">
import type {
    FileUploadConfig,
    FormFieldConfig,
    UpdateAgentConfigParams,
} from "@buildingai/service/consoleapi/ai-agent";
import {
    apiAgentChat,
    apiCreateAgentAnnotation,
    apiGetAgentFileUploadConfig,
} from "@buildingai/service/consoleapi/ai-agent";
import type { AiMessage } from "@buildingai/service/models/message";

const AgentAnnotationModal = defineAsyncComponent(() => import("./logs/annotation-modal.vue"));
const ChatsContextModal = defineAsyncComponent(
    () => import("~/components/ask-assistant-chat/chats-context-modal.vue"),
);
const VariableInput = defineAsyncComponent(() => import("./configuration/variable-input.vue"));

const emits = defineEmits<{
    (e: "update:agent", value: UpdateAgentConfigParams): void;
}>();

const props = defineProps<{
    agent: UpdateAgentConfigParams;
    showVariableInput: boolean;
}>();

const { params: URLQueryParams } = useRoute();
const userStore = useUserStore();
const { t } = useI18n();
const toast = useMessage();
const scrollAreaRef = useTemplateRef("scrollAreaRef");
const { height: scrollAreaHeight } = useElementSize(scrollAreaRef);
const overlay = useOverlay();
const agents = useVModel(props, "agent", emits);

const agentId = computed(() => (URLQueryParams as Record<string, string>).id);

const conversationId = shallowRef<string | null>(null);

const initialMessages: AiMessage[] = [];

// 文件上传配置（用于 Dify 等第三方平台）
const fileUploadConfig = shallowRef<FileUploadConfig | null>(null);

// 获取文件上传配置
const fetchFileUploadConfig = async () => {
    if (agents.value.createMode === "dify" && agentId.value) {
        try {
            fileUploadConfig.value = await apiGetAgentFileUploadConfig(agentId.value);
        } catch {
            fileUploadConfig.value = null;
        }
    } else {
        fileUploadConfig.value = null;
    }
};

// 监听 createMode 变化，重新获取文件上传配置
watch(
    () => agents.value.createMode,
    () => fetchFileUploadConfig(),
    { immediate: true },
);

const currentContext = shallowRef<AiMessage[]>([]);

const { messages, input, files, handleSubmit, reload, stop, status, error } = useChat({
    api: apiAgentChat,
    initialMessages: initialMessages,
    chatConfig: {
        get avatar() {
            return agents.value.chatAvatar;
        },
    },
    body: {
        agentId: agentId.value,
        saveConversation: false,
        get conversationId() {
            return conversationId.value;
        },
        get modelConfig() {
            return agents.value.modelConfig;
        },
        get mcpServerIds() {
            return agents.value.mcpServerIds;
        },
        get datasetIds() {
            return agents.value.datasetIds;
        },
        get rolePrompt() {
            return agents.value.rolePrompt;
        },
        get showContext() {
            return agents.value.showContext;
        },
        get showReference() {
            return agents.value.showReference;
        },
        get enableFeedback() {
            return agents.value.enableFeedback;
        },
        get autoQuestions() {
            return agents.value.autoQuestions;
        },
        get formFields() {
            return agents.value.formFields;
        },
        get formFieldsInputs() {
            return agents.value.formFieldsInputs;
        },
        get quickCommands() {
            return agents.value.quickCommands;
        },
        get thirdPartyIntegration() {
            return agents.value.thirdPartyIntegration;
        },
    },
    onToolCall() {},
    onResponse(response: Response) {
        if (response.status === 401) {
            const userStore = useUserStore();
            userStore.logout(true);
        }
    },
    onUpdate(chunk) {
        if (chunk.type === "conversation_id") {
            conversationId.value = chunk.data as string;
        }
    },
    onError(err: Error) {
        const message = err?.message || "发送失败";
        console.error("聊天错误:", message);
    },
    onFinish() {},
});

const isLoading = computed(() => status.value === "loading");

const isAtBottom = shallowRef(true);

/** monitor scroll event, update isAtBottom */
function handleScroll(event: Event) {
    const target = event.target as HTMLElement;
    const threshold = 40; // threshold, unit: px
    isAtBottom.value = target.scrollHeight - (target.scrollTop + target.clientHeight) <= threshold;
}

async function scrollToBottom(animate = true) {
    await nextTick();
    scrollAreaRef.value?.scrollToBottom(animate);
}

async function handleSubmitMessage(content: string) {
    if (!content.trim() || isLoading.value) return;
    if (!agents.value.modelConfig?.id && agents.value.createMode === "direct")
        return toast.warning(t("ai-agent.backend.configuration.modelNotConfigured"));

    const formFields = agents.value.formFields || [];
    const formFieldsInputs = agents.value.formFieldsInputs || {};

    if (formFields.length > 0) {
        const validationErrors: string[] = [];

        formFields.forEach((field: FormFieldConfig) => {
            if (field.required) {
                const value = formFieldsInputs[field.name];
                if (!value || (typeof value === "string" && value.trim() === "")) {
                    validationErrors.push(
                        `${field.label}${t("ai-agent.backend.configuration.notEmpty")}`,
                    );
                }
            }
        });

        if (validationErrors.length > 0) {
            toast.error(
                `${t("ai-agent.backend.configuration.formVariableTitle")}: ${validationErrors.join(", ")}`,
            );
            return;
        }
    }

    await handleSubmit(content);
    scrollToBottom();
}

const openContextModal = (context: AiMessage[]): void => {
    currentContext.value = context;

    const modal = overlay.create(ChatsContextModal);
    modal.open({ context: context });
};

const openAnnotationModal = (annotationId: string, messageId: string | null = null): void => {
    const modal = overlay.create(AgentAnnotationModal);

    modal.open({
        agentId: agentId.value as string,
        annotationId: annotationId,
        messageId: messageId,
        hiddenStatus: true,
    });
};

async function createAnnotationDirectly(message: AiMessage, index: number) {
    const prevMessage = messages.value[index - 1];
    if (!prevMessage || prevMessage.role !== "user") {
        toast.error(t("ai-agent.backend.configuration.noUserQuestion"));
        return;
    }

    try {
        const data = await apiCreateAgentAnnotation(agentId.value as string, {
            agentId: agentId.value,
            question: prevMessage.content.toString(),
            answer: message.content.toString(),
            enabled: true,
            messageId: message.id,
        });

        if (!messages.value[index]?.metadata) {
            if (messages.value[index]) {
                messages.value[index].metadata = {};
            }
        }

        if (messages.value[index]?.metadata) {
            messages.value[index].metadata.annotations = {
                annotationId: data.id,
                createdBy: userStore.userInfo?.nickname,
                question: data.question,
                similarity: 1,
            };
        }
    } catch (error) {
        console.error("创建标注失败:", error);
    }
}

watch(
    () => messages.value.at(-1)?.content,
    () =>
        nextTick(() => {
            if (isAtBottom.value) {
                scrollToBottom(false);
            }
        }),
    { flush: "post" },
);

let mutationObserver: MutationObserver | null = null;

onMounted(async () => {
    // scroll to bottom after page first render
    scrollToBottom(false);

    const viewportComp = scrollAreaRef.value?.getViewportElement();
    const viewportEl = (viewportComp &&
        (viewportComp as { viewportElement?: HTMLElement }).viewportElement) as
        | HTMLElement
        | undefined;

    viewportEl?.addEventListener("scroll", handleScroll, { passive: true });
    // initial check if is at bottom
    if (viewportEl) {
        handleScroll({ target: viewportEl } as unknown as Event);

        // monitor content change (code highlight, mermaid render, etc.)
        mutationObserver = new MutationObserver(() => {
            // only scroll to bottom when is at bottom
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
});

onUnmounted(() => {
    const viewportComp = scrollAreaRef.value?.getViewportElement();
    const viewportEl = (viewportComp &&
        (viewportComp as { viewportElement?: HTMLElement }).viewportElement) as
        | HTMLElement
        | undefined;
    viewportEl?.removeEventListener("scroll", handleScroll);
    mutationObserver?.disconnect();
});

defineExpose({
    clearRecord() {
        messages.value = [];
        conversationId.value = null;
    },
});
</script>

<template>
    <div class="flex h-full min-h-0 w-full flex-col">
        <!-- 表单变量输入 -->
        <VariableInput
            v-if="showVariableInput && agents.formFields && agents.formFields.length > 0"
            v-model:inputs="agents.formFieldsInputs as Record<string, any>"
            :formFields="agents.formFields as FormFieldConfig[]"
            class="mx-4 mt-2"
            formClass="bg-muted hover:bg-muted"
        />
        <BdScrollArea
            class="min-h-0 w-full flex-1"
            type="auto"
            ref="scrollAreaRef"
            @in-view="scrollToBottom(false)"
        >
            <BdChatScroll
                :loading="false"
                :has-more="false"
                :threshold="500"
                content-class="w-full space-y-3 p-4 "
            >
                <!-- 开场白与提问建议 -->
                <ChatsMessages
                    v-if="messages.length === 0"
                    :messages="
                        [
                            {
                                role: 'assistant',
                                avatar: agent.chatAvatar,
                                content: agent.openingStatement,
                            },
                        ] as AiMessage[]
                    "
                    :scroll-area-height="200"
                    :assistant="{
                        actions: [],
                    }"
                >
                    <template #content="{ message }">
                        <BdMarkdown :content="message.content.toString()" class="mb-2" />

                        <div v-if="agent.openingQuestions.length > 0" class="flex flex-col gap-2">
                            <div class="text-muted-foreground text-sm">
                                {{ t("ai-agent.backend.configuration.youCanAskMe") }}
                            </div>

                            <div v-for="question in agent.openingQuestions" :key="question">
                                <UButton
                                    :label="question"
                                    color="primary"
                                    variant="soft"
                                    @click="handleSubmitMessage(question)"
                                />
                            </div>
                        </div>
                    </template>
                </ChatsMessages>
                <!-- 聊天消息 -->
                <ChatsMessages
                    v-else
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
                            {
                                label: t('ai-agent.backend.configuration.chatContext'),
                                icon: 'i-lucide-file-type',
                                show: !agent.showContext,
                                onClick: (message) => {
                                    if (message?.metadata?.context) {
                                        openContextModal(message.metadata.context);
                                    } else {
                                        toast.error(
                                            t('ai-agent.backend.configuration.noChatContext'),
                                        );
                                    }
                                },
                            },
                            {
                                label: t('ai-agent.backend.configuration.feedback'),
                                icon: 'i-lucide-wrap-text',
                                show: !agent.enableFeedback,
                                onClick: (message, index) => {
                                    const annotationId =
                                        message.metadata?.annotations?.annotationId;
                                    if (annotationId) {
                                        // 有标注ID，打开编辑弹窗
                                        openAnnotationModal(annotationId, message.id);
                                    } else {
                                        // 没有标注ID，直接创建标注
                                        createAnnotationDirectly(message, index);
                                    }
                                },
                            },
                        ],
                    }"
                    :spacing-offset="160"
                >
                    <template #content="{ message }">
                        <BdMarkdown
                            v-if="
                                message.content.length ||
                                (message.metadata?.references && message.metadata.references.length)
                            "
                            :content="message.content.toString()"
                        >
                            <template #before>
                                <div
                                    v-if="message.status === 'loading'"
                                    class="flex items-center gap-2"
                                >
                                    <UIcon name="i-lucide-loader-2" class="animate-spin" />
                                    <span>{{ t("ai-chat.frontend.messages.thinking") }}</span>
                                </div>
                            </template>
                            <template #after>
                                <template
                                    v-if="
                                        message.metadata?.references &&
                                        message.metadata.references.length > 0 &&
                                        message.role === 'assistant' &&
                                        !isLoading &&
                                        agent.showReference
                                    "
                                >
                                    <!-- 知识库引用来源 -->
                                    <div class="my-2 flex items-center gap-1">
                                        <span class="text-muted-foreground flex-none text-xs">
                                            {{ t("ai-agent.backend.configuration.referenceTitle") }}
                                        </span>
                                        <USeparator
                                            size="xs"
                                            type="dashed"
                                            v-if="
                                                message.metadata?.references &&
                                                message.metadata.references.length > 0 &&
                                                message.role === 'assistant'
                                            "
                                        />
                                    </div>
                                    <ReferenceKnowledgeFiles
                                        :references="message.metadata.references"
                                    />
                                </template>

                                <!-- 标注命中 -->
                                <div
                                    class="mt-2 flex items-center gap-1"
                                    v-if="
                                        message.metadata?.annotations &&
                                        message.role === 'assistant' &&
                                        !isLoading
                                    "
                                >
                                    <span class="text-muted-foreground flex-none text-xs">
                                        {{ message.metadata?.annotations?.createdBy }}
                                        {{ t("ai-agent.backend.configuration.editedAnswer") }}
                                    </span>
                                    <USeparator size="xs" type="dashed" />
                                </div>
                            </template>
                        </BdMarkdown>
                    </template>
                    <template #after-tools="{ message: slotMessage, index: slotIndex }">
                        <div
                            v-if="
                                slotMessage.metadata?.suggestions &&
                                messages.length - 1 === slotIndex
                            "
                            class="m-2 space-y-2"
                        >
                            <div
                                v-for="suggestion in slotMessage.metadata.suggestions"
                                :key="suggestion"
                            >
                                <UButton
                                    :label="suggestion"
                                    color="primary"
                                    variant="soft"
                                    @click="handleSubmitMessage(suggestion)"
                                />
                            </div>
                        </div>
                    </template>
                </ChatsMessages>
            </BdChatScroll>
        </BdScrollArea>

        <div class="px-4 pb-4">
            <div class="flex gap-2 pb-4">
                <div v-for="item in agent.quickCommands" :key="item.name">
                    <UButton color="neutral" variant="soft" @click="handleSubmitMessage(item.name)">
                        <NuxtImg v-if="item.avatar" :src="item.avatar" class="h-4 w-4" />
                        <span>{{ item.name }}</span>
                    </UButton>
                </div>
            </div>
            <ChatsPrompt
                v-model="input"
                v-model:file-list="files"
                :is-loading="isLoading"
                :model-config="agent.modelConfig"
                :agent-create-mode="agent.createMode"
                :file-upload-config="fileUploadConfig ?? undefined"
                class="sticky bottom-0 z-10 [view-transition-name:chat-prompt]"
                @stop="stop"
                @submit="handleSubmitMessage"
            >
            </ChatsPrompt>
        </div>
    </div>
</template>
