<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import type { PaginationResult } from "@buildingai/service/models/globals";
import {
    apiDeleteConversation,
    apiGetConversations,
    apiUpdateConversation,
} from "@buildingai/service/webapi/ai-agent-publish";
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";

import { groupConversationsByDate, type GroupedConversations } from "@//utils";
import type { DropdownMenuItem } from "#ui/types";

const props = defineProps<{
    agent?: Agent;
    publishToken: string;
    accessToken: string;
    modelValue: string | null;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string | null];
    "new-conversation": [];
    "switch-conversation": [conversation: AiConversation];
}>();

const UInput = resolveComponent("UInput");
const UFormField = resolveComponent("UFormField");

const { t } = useI18n();
const toast = useMessage();
const currentConversationId = useVModel(props, "modelValue", emit);
const isMobile = useMediaQuery("(max-width: 768px)");

const sidebarExpanded = shallowRef(false);
const open = shallowRef(false);

onMounted(() => {
    nextTick(() => {
        if (!isMobile.value) {
            sidebarExpanded.value = true;
        }
    });
});

watch(
    isMobile,
    (newVal) => {
        if (newVal) {
            sidebarExpanded.value = false;
        } else {
            open.value = false;
            sidebarExpanded.value = true;
        }
    },
    { immediate: false },
);

// 获取对话记录
const { data: conversationsData, pending: loading } = await useAsyncData(
    () => `public-agent-conversations-${props.publishToken}-${props.accessToken}`,
    () => {
        if (!props.accessToken)
            return { items: [] } as unknown as Promise<PaginationResult<AiConversation>>;
        return apiGetConversations(props.publishToken, props.accessToken, {
            page: 1,
            pageSize: 50,
        });
    },
    { watch: [() => props.accessToken] },
);

const conversations = computed<AiConversation[]>(() => {
    const data = conversationsData.value as { items?: AiConversation[] } | null;
    return data?.items || [];
});

const groupedConversations = computed<GroupedConversations<AiConversation>[]>(() => {
    if (!conversations.value?.length) return [];
    return groupConversationsByDate(conversations.value, "updatedAt", t);
});

watch(
    conversations,
    (newConversations) => {
        if (newConversations?.length > 0) {
            const currentConversationExists = props.modelValue
                ? newConversations.some((conv) => conv.id === props.modelValue)
                : false;

            if (!currentConversationExists) {
                // 如果当前对话不存在，清空并选择第一个对话
                currentConversationId.value = null;
                emit("switch-conversation", newConversations[0] as AiConversation);
            } else if (!props.modelValue) {
                // 如果没有当前对话ID，选择第一个对话
                emit("switch-conversation", newConversations[0] as AiConversation);
            }
        }
    },
    { immediate: true },
);

// 事件处理函数
const handleConversationSelect = (conversation: AiConversation) => {
    open.value = false;
    emit("switch-conversation", conversation);
};

const handleNewConversation = () => {
    emit("new-conversation");
};

const handleOpenSidebar = () => {
    if (isMobile.value) {
        open.value = true;
        sidebarExpanded.value = false;
    } else {
        open.value = false;
        sidebarExpanded.value = true;
    }
};

// 编辑对话标题
const openEditModal = async (conversation: AiConversation): Promise<void> => {
    const editName = ref(conversation.title);

    try {
        const EditChatForm = markRaw({
            setup() {
                return () =>
                    h("div", { class: "py-2" }, [
                        h(
                            UFormField,
                            {
                                label: "对话标题",
                                size: "lg",
                                required: true,
                                error: !editName.value.trim() ? "对话标题不能为空" : "",
                            },
                            {
                                default: () =>
                                    h(UInput, {
                                        modelValue: editName.value,
                                        "onUpdate:modelValue": (value: string) => {
                                            editName.value = value;
                                        },
                                        placeholder: "请输入对话标题",
                                        maxlength: 50,
                                        class: "w-full",
                                    }),
                            },
                        ),
                    ]);
            },
        });

        await useModal({
            title: "编辑对话标题",
            content: EditChatForm,
            confirmText: "保存",
            cancelText: "取消",
            color: "primary",
            ui: { content: "!w-sm" },
        });

        if (editName.value.trim() && editName.value !== conversation.title) {
            await updateConversationTitle(conversation.id, editName.value);
        }
    } catch (error) {
        console.log("用户取消编辑操作:", error);
    }
};

// 更新对话标题
const updateConversationTitle = async (conversationId: string, title: string): Promise<void> => {
    try {
        await apiUpdateConversation(props.publishToken, props.accessToken, conversationId, {
            title,
        });
        await refreshNuxtData(
            `public-agent-conversations-${props.publishToken}-${props.accessToken}`,
        );
        toast.success("对话标题更新成功");
    } catch (error) {
        console.error("更新对话标题失败:", error);
    }
};

// 删除对话
const deleteConversation = async (conversation: AiConversation) => {
    if (!props.accessToken) return;

    try {
        await apiDeleteConversation(props.publishToken, props.accessToken, conversation.id);
        await refreshNuxtData(
            `public-agent-conversations-${props.publishToken}-${props.accessToken}`,
        );

        // 如果删除的是当前对话，触发新建对话
        if (props.modelValue === conversation.id) {
            currentConversationId.value = null;
            emit("new-conversation");
        }

        toast.success(t("common.message.deleteSuccess"));
    } catch (error) {
        console.error("删除对话失败:", error);
    }
};

// 处理删除对话确认
const handleDeleteConversation = async (conversation: AiConversation): Promise<void> => {
    try {
        const confirmed = await useModal({
            color: "error",
            title: "确认删除",
            content: "确定要删除这个会话吗？删除后无法恢复。",
            confirmText: "删除",
            cancelText: "取消",
            ui: { content: "!w-sm" },
        });

        if (confirmed) {
            await deleteConversation(conversation);
        }
    } catch (error) {
        console.log("用户取消删除操作:", error);
    }
};

// 构建下拉菜单项
const getDropdownItems = (conversation: AiConversation): DropdownMenuItem[] => [
    {
        label: "编辑",
        color: "primary",
        icon: "i-lucide-pencil",
        onSelect: () => openEditModal(conversation),
    },
    {
        label: "删除",
        color: "error",
        icon: "i-lucide-trash",
        onSelect: () => handleDeleteConversation(conversation),
    },
];

defineOptions({ inheritAttrs: false });
defineShortcuts({
    o: () => (open.value = !open.value),
});
</script>

<template>
    <ClientOnly>
        <div class="relative h-full flex-1">
            <!-- 主面板区域 -->
            <transition name="sidebar">
                <div v-if="sidebarExpanded" class="flex h-full min-h-0 w-[240px] flex-col">
                    <!-- 智能体信息 -->
                    <div class="border-border/50 border-b p-4">
                        <div class="flex items-center gap-3">
                            <UAvatar :src="agent?.avatar" :alt="agent?.name" size="sm" />
                            <div class="min-w-0 flex-1">
                                <h2 class="truncate font-medium">{{ agent?.name }}</h2>
                            </div>
                            <UButton
                                color="neutral"
                                variant="ghost"
                                size="sm"
                                class="p-2"
                                @click="sidebarExpanded = false"
                            >
                                <UIcon name="i-lucide-panel-left" class="size-5" />
                            </UButton>
                        </div>

                        <!-- 新建会话按钮 -->
                        <UButton
                            class="mt-3 w-full"
                            color="primary"
                            variant="soft"
                            @click="handleNewConversation"
                        >
                            <UIcon name="i-lucide-plus" class="mr-2 size-4" />
                            新建会话
                        </UButton>
                    </div>

                    <!-- 会话列表 -->
                    <div class="h-full flex-1 overflow-hidden">
                        <!-- 空状态 -->
                        <div
                            v-if="!groupedConversations.length && !loading"
                            class="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-sm"
                        >
                            <div class="mb-2">
                                <UIcon
                                    name="i-lucide-message-circle"
                                    size="lg"
                                    class="text-muted-foreground"
                                />
                            </div>
                            <p>暂无会话记录</p>
                            <p class="text-xs">开始与智能体对话吧</p>
                        </div>

                        <BdScrollArea v-else class="grid h-full">
                            <!-- 会话列表 -->
                            <div class="flex flex-col gap-4 space-y-1 py-4 pr-4 pl-2">
                                <!-- 按日期分组显示 -->
                                <div
                                    v-for="group in groupedConversations"
                                    :key="group.key"
                                    class="flex flex-col gap-2"
                                >
                                    <!-- 分组标题 -->
                                    <div
                                        class="text-muted-foreground px-2 py-1 text-xs font-medium"
                                    >
                                        {{ group.label }}
                                    </div>

                                    <!-- 分组内的会话项 -->
                                    <div class="flex flex-col gap-1">
                                        <div
                                            v-for="conversation in group.items"
                                            :key="conversation.id"
                                            class="group relative"
                                        >
                                            <UButton
                                                :label="conversation.title"
                                                :ui="{
                                                    base: 'flex justify-between w-full gap-2 cursor-pointer pr-10 relative w-full',
                                                }"
                                                :variant="
                                                    conversation.id === modelValue
                                                        ? 'soft'
                                                        : 'ghost'
                                                "
                                                :color="
                                                    conversation.id === modelValue
                                                        ? 'primary'
                                                        : 'neutral'
                                                "
                                                @click="handleConversationSelect(conversation)"
                                            >
                                                <span class="block flex-1 truncate text-left">
                                                    {{ conversation.title || "新会话" }}
                                                </span>
                                            </UButton>

                                            <!-- 操作菜单 -->
                                            <UDropdownMenu
                                                :items="[getDropdownItems(conversation)]"
                                                :ui="{
                                                    content: 'w-3',
                                                    group: 'flex flex-col gap-1 p-2',
                                                    itemLeadingIcon: 'size-4',
                                                }"
                                                :content="{ side: 'right', align: 'start' }"
                                            >
                                                <UIcon
                                                    name="i-lucide-ellipsis"
                                                    :size="14"
                                                    class="absolute top-1/2 right-3 z-10 h-8 -translate-y-1/2 cursor-pointer px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                    :class="{
                                                        'opacity-100':
                                                            conversation.id === modelValue,
                                                    }"
                                                    @click.stop
                                                />
                                            </UDropdownMenu>
                                        </div>
                                    </div>
                                </div>

                                <!-- 加载状态 -->
                                <div
                                    v-if="!groupedConversations.length && loading"
                                    class="flex flex-col gap-4 py-4"
                                >
                                    <div
                                        v-for="groupIndex in 3"
                                        :key="`group-${groupIndex}`"
                                        class="flex flex-col gap-2"
                                    >
                                        <div class="px-2 py-1">
                                            <USkeleton class="h-4 w-16" />
                                        </div>

                                        <div class="flex flex-col gap-1">
                                            <USkeleton
                                                v-for="itemIndex in groupIndex === 1
                                                    ? 3
                                                    : groupIndex === 2
                                                      ? 2
                                                      : 1"
                                                :key="`item-${groupIndex}-${itemIndex}`"
                                                class="h-10 w-full rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BdScrollArea>
                    </div>

                    <!-- 品牌信息（底部） -->
                    <div class="border-border/50 border-t pt-2">
                        <div
                            class="text-muted-foreground flex items-center justify-center gap-1 text-xs"
                        >
                            <span>Powered by</span>
                            <a
                                href="https://buildingai.cc"
                                target="_blank"
                                class="text-primary font-medium hover:underline"
                            >
                                BuildingAI
                            </a>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- 悬浮展开按钮（收起状态时显示） -->
            <div class="absolute top-4 left-4 z-50 flex items-center gap-2" v-if="!sidebarExpanded">
                <UButton
                    color="neutral"
                    variant="soft"
                    size="lg"
                    class="p-2"
                    @click="handleOpenSidebar"
                >
                    <UIcon name="i-lucide-panel-right" class="size-5" />
                </UButton>
                <div class="text-muted-foreground mx-1">/</div>

                <!-- 当前选中的会话项或新建对话 -->
                <div class="group relative">
                    <UButton
                        v-if="!modelValue"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        class="px-3 py-2"
                    >
                        <span class="block flex-1 truncate text-left text-sm">New Chat</span>
                    </UButton>

                    <!-- 操作菜单（仅在有选中会话时显示） -->
                    <UDropdownMenu
                        v-else
                        :items="[
                            {
                                label: '删除',
                                color: 'error',
                                icon: 'i-lucide-trash',
                                onSelect: () =>
                                    handleDeleteConversation(
                                        conversations.find(
                                            (c) => c.id === modelValue,
                                        ) as AiConversation,
                                    ),
                            },
                            {
                                label: '新建对话',
                                color: 'primary',
                                icon: 'i-lucide-plus',
                                onSelect: () => handleNewConversation(),
                            },
                        ]"
                        :ui="{
                            content: 'w-32',
                            group: 'flex flex-col gap-1 p-2',
                            itemLeadingIcon: 'size-4',
                        }"
                        :content="{ side: 'bottom', align: 'center' }"
                    >
                        <UButton
                            :label="
                                conversations.find((c) => c.id === modelValue)?.title || '当前对话'
                            "
                            variant="ghost"
                            color="neutral"
                            size="sm"
                            class="px-3 py-2"
                        >
                            <span class="block flex-1 truncate text-left text-sm">
                                {{
                                    conversations.find((c) => c.id === modelValue)?.title ||
                                    "当前对话"
                                }}
                            </span>
                            <UIcon name="i-lucide-chevron-down" class="size-5" />
                        </UButton>
                    </UDropdownMenu>
                </div>
            </div>

            <!-- 移动端侧边栏 -->
            <USlideover
                v-model:open="open"
                side="left"
                :ui="{ content: '!w-fit flex-0 max-w-fit' }"
            >
                <template #content>
                    <!-- 空状态 -->
                    <div
                        v-if="!groupedConversations.length && !loading"
                        class="text-muted-foreground flex h-full w-50 flex-col items-center justify-center text-center text-sm"
                    >
                        <div class="mb-2">
                            <UIcon name="i-lucide-message-circle" size="lg" class="text-gray-400" />
                        </div>
                        <p>暂无会话记录</p>
                        <p class="text-xs">开始与智能体对话吧</p>
                    </div>

                    <BdScrollArea v-else class="h-full">
                        <!-- 会话列表 -->
                        <div class="flex flex-col gap-4 space-y-1 py-4 pr-4 pl-2">
                            <!-- 按日期分组显示 -->
                            <div
                                v-for="group in groupedConversations"
                                :key="group.key"
                                class="flex flex-col gap-2"
                            >
                                <!-- 分组标题 -->
                                <div class="text-muted-foreground px-2 py-1 text-xs font-medium">
                                    {{ group.label }}
                                </div>

                                <!-- 分组内的会话项 -->
                                <div class="flex flex-col gap-1">
                                    <div
                                        v-for="conversation in group.items"
                                        :key="conversation.id"
                                        class="group relative"
                                    >
                                        <UButton
                                            :label="conversation.title"
                                            :ui="{
                                                base: 'flex justify-between w-full gap-2 cursor-pointer pr-10 relative w-full',
                                            }"
                                            :variant="
                                                conversation.id === modelValue ? 'soft' : 'ghost'
                                            "
                                            :color="
                                                conversation.id === modelValue
                                                    ? 'primary'
                                                    : 'neutral'
                                            "
                                            @click="handleConversationSelect(conversation)"
                                        >
                                            <span class="block flex-1 truncate text-left">
                                                {{ conversation.title || "新会话" }}
                                            </span>
                                        </UButton>

                                        <!-- 操作菜单 -->
                                        <UDropdownMenu
                                            :items="[getDropdownItems(conversation)]"
                                            :ui="{
                                                content: 'w-3',
                                                group: 'flex flex-col gap-1 p-2',
                                                itemLeadingIcon: 'size-4',
                                            }"
                                            :content="{ side: 'right', align: 'start' }"
                                        >
                                            <UIcon
                                                name="i-lucide-ellipsis"
                                                :size="14"
                                                class="absolute top-1/2 right-3 z-10 h-8 -translate-y-1/2 cursor-pointer px-2.5 py-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                                                :class="{
                                                    'opacity-100': conversation.id === modelValue,
                                                }"
                                                @click.stop
                                            />
                                        </UDropdownMenu>
                                    </div>
                                </div>
                            </div>

                            <!-- 加载状态 -->
                            <div
                                v-if="!groupedConversations.length && loading"
                                class="flex flex-col gap-4 py-4"
                            >
                                <div
                                    v-for="groupIndex in 3"
                                    :key="`group-${groupIndex}`"
                                    class="flex flex-col gap-2"
                                >
                                    <div class="px-2 py-1">
                                        <USkeleton class="h-4 w-16" />
                                    </div>

                                    <div class="flex flex-col gap-1">
                                        <USkeleton
                                            v-for="itemIndex in groupIndex === 1
                                                ? 3
                                                : groupIndex === 2
                                                  ? 2
                                                  : 1"
                                            :key="`item-${groupIndex}-${itemIndex}`"
                                            class="h-10 w-full rounded-md"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BdScrollArea>
                </template>
            </USlideover>
        </div>
    </ClientOnly>
</template>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
    transition:
        opacity 0.3s ease,
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform;
}

.sidebar-enter-from,
.sidebar-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}
</style>
