<script setup lang="ts">
import {
    apiBatchDeleteConversations,
    apiDeleteConversation,
    apiGetConversationList,
} from "@buildingai/service/consoleapi/ai-conversation";
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";
import { type Row } from "@tanstack/table-core";

import type { DropdownMenuItem, TableColumn } from "#ui/types";

const ConversationCard = defineAsyncComponent(() => import("./components/chats-card.vue"));
const ConversationDetail = defineAsyncComponent(() => import("./detail.vue"));
const UCheckbox = resolveComponent("UCheckbox");
const TimeDisplay = resolveComponent("TimeDisplay");

const { hasAccessByCodes } = useAccessControl();

const toast = useMessage();
const { t } = useI18n();
const table = useTemplateRef("table");
const overlay = useOverlay();

const searchForm = reactive({
    keyword: "",
    modelId: "",
    startDate: "",
    endDate: "",
});

const tab = shallowRef(1);
const tabs = [
    { value: 1, icon: "i-lucide-list" },
    { value: 2, icon: "i-tabler-layout-grid" },
];

const selectedChat = ref<Set<string>>(new Set());

const { paging, getLists } = usePaging({
    fetchFun: apiGetConversationList,
    params: searchForm,
});

const handleConversationSelect = (
    conversation: AiConversation,
    selected: boolean | "indeterminate",
) => {
    if (typeof selected === "boolean") {
        const conversationId = conversation.id;
        if (selected) {
            selectedChat.value.add(conversationId);
        } else {
            selectedChat.value.delete(conversationId);
        }
    }
};

const columns: TableColumn<AiConversation>[] = [
    {
        id: "select",
        header: ({ table }) =>
            h(UCheckbox, {
                modelValue: table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : table.getIsAllPageRowsSelected(),
                "onUpdate:modelValue": (value: boolean | "indeterminate") => {
                    table.toggleAllPageRowsSelected(!!value);
                    handleSelectAll(value);
                },
                "aria-label": "Select all",
            }),
        cell: ({ row }) =>
            h(UCheckbox, {
                modelValue: row.getIsSelected(),
                "onUpdate:modelValue": (value: boolean | "indeterminate") => {
                    row.toggleSelected(!!value);
                    handleConversationSelect(row.original, value);
                },
                "aria-label": "Select row",
            }),
    },
    {
        accessorKey: "title",
        header: t("ai-chat.backend.list.title"),
    },
    {
        accessorKey: "userName",
        header: t("ai-chat.backend.list.userName"),
    },
    {
        accessorKey: "messageCount",
        header: t("ai-chat.backend.list.messageCount"),
    },
    {
        accessorKey: "totalTokens",
        header: t("ai-chat.backend.list.totalTokens"),
    },
    {
        accessorKey: "totalPower",
        header: t("ai-chat.backend.list.totalPower"),
    },
    {
        accessorKey: "updatedAt",
        header: t("console-common.updateAt"),
        cell: ({ row }) => {
            const updatedAt = row.getValue("updatedAt") as string;
            return h(TimeDisplay, {
                datetime: updatedAt,
                mode: "datetime",
            });
        },
    },
    {
        accessorKey: "action",
        header: t("console-common.operation"),
        size: 40, // 固定宽度
        enableSorting: false,
        enableHiding: false,
    },
];

// 操作栏
function getRowItems(row: Row<AiConversation>) {
    return [
        {
            label: t("order.backend.recharge.list.viewDetails"),
            icon: "i-lucide-eye",
            color: "info",
            onClick: () => {
                handleViewDetail(row.original.id);
            },
        },
        hasAccessByCodes(["ai-conversations:ai_conversation_delete"])
            ? {
                  label: t("console-common.delete"),
                  icon: "i-lucide-trash-2",
                  color: "error",
                  onSelect() {
                      handleDeleteConversation(row.original);
                  },
              }
            : null,
    ].filter(Boolean) as DropdownMenuItem[];
}

const handleSelectAll = (value: boolean | "indeterminate") => {
    const isSelected = value === true;
    table.value?.tableApi.toggleAllPageRowsSelected(!!value);
    if (isSelected) {
        paging.items.forEach((conversation: AiConversation) => {
            selectedChat.value.add(conversation.id);
        });
    } else {
        selectedChat.value.clear();
    }
};

const handleDelete = async (id: string | string[]) => {
    try {
        await useModal({
            title: t("ai-chat.backend.delete.title"),
            description: t("ai-chat.backend.delete.description"),
            color: "error",
            cancelText: t("console-common.cancel"),
            confirmText: t("console-common.confirm"),
        });

        if (Array.isArray(id)) {
            await apiBatchDeleteConversations(id);
            toast.success(t("common.message.deleteBatchSuccess"));
        } else {
            await apiDeleteConversation(id);
            toast.success(t("common.message.deleteSuccess"));
        }

        selectedChat.value.clear();

        getLists();
    } catch (error) {
        console.error("Delete failed:", error);
    }
};

const handleDeleteConversation = (conversation: AiConversation) => {
    handleDelete(conversation.id);
};

const handleBatchDelete = () => {
    const selectedIds = Array.from(selectedChat.value) as string[];
    if (selectedIds.length === 0) return;
    handleDelete(selectedIds);
};

const mountConversationDetail = (conversationId: string) => {
    const modal = overlay.create(ConversationDetail);
    modal.open({ conversationId });
};

const handleViewDetail = (conversationId: string) => {
    mountConversationDetail(conversationId);
};

const isAllSelected = computed(() => {
    return (
        paging.items.length > 0 &&
        paging.items.every((conversation: AiConversation) =>
            selectedChat.value.has(conversation.id),
        )
    );
});

const isIndeterminate = computed(() => {
    const selectedCount = paging.items.filter((conversation: AiConversation) =>
        selectedChat.value.has(conversation.id),
    ).length;
    return selectedCount > 0 && selectedCount < paging.items.length;
});

const handleSelect = (row: Row<AiConversation>) => {
    handleViewDetail(row.original.id);
};

onMounted(() => getLists());
</script>

<template>
    <div class="conversation-list-container pb-5">
        <div class="bg-background sticky top-0 z-10 flex flex-wrap gap-4 pb-2">
            <UInput
                v-model="searchForm.keyword"
                :placeholder="$t('ai-chat.backend.search.placeholder')"
                @change="getLists"
            />

            <BdDateRangePicker
                v-model:start="searchForm.startDate"
                v-model:end="searchForm.endDate"
                :ui="{ root: 'w-auto sm:w-xs' }"
                @change="getLists"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <div class="flex items-center gap-2">
                    <UCheckbox
                        :model-value="
                            isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                        "
                        @update:model-value="handleSelectAll"
                    >
                        <template #label>
                            <span class="text-muted-foreground text-sm">
                                {{ selectedChat.size }} / {{ paging.items.length }}
                                {{ t("console-common.selected") }}
                            </span>
                        </template>
                    </UCheckbox>
                </div>

                <AccessControl :codes="['ai_conversation_delete']">
                    <UButton
                        color="error"
                        variant="subtle"
                        :label="$t('console-common.batchDelete')"
                        icon="i-heroicons-trash"
                        :disabled="selectedChat.size === 0"
                        @click="handleBatchDelete"
                    >
                        <template #trailing>
                            <UKbd>{{ selectedChat.size }}</UKbd>
                        </template>
                    </UButton>
                </AccessControl>

                <UTabs
                    v-model="tab"
                    :items="tabs"
                    size="xs"
                    :ui="{
                        root: 'gap-0',
                        indicator: 'bg-background dark:bg-primary',
                        leadingIcon: 'bg-black dark:bg-white',
                    }"
                ></UTabs>
            </div>
        </div>

        <template v-if="!paging.loading && paging.items.length > 0 && tab === 1">
            <BdScrollArea class="h-[calc(100vh-13rem)] pt-2" :shadow="false">
                <UTable
                    ref="table"
                    :data="paging.items"
                    :columns="columns"
                    :ui="{
                        base: 'table-fixed border-separate border-spacing-0',
                        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                        tbody: '[&>tr]:last:[&>td]:border-b-0',
                        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                        td: 'border-b border-default cursor-pointer',
                        tr: '[&:has(>td[colspan])]:hidden',
                    }"
                    @select="handleSelect"
                >
                    <template #title-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-message-circle" class="text-primary size-5" />
                            {{ row.original.title || "new Chat" }}
                        </div>
                    </template>
                    <template #userName-cell="{ row }">
                        <div class="flex items-center gap-2">
                            <UAvatar
                                v-if="row.original.user?.avatar"
                                :src="row.original.user?.avatar"
                            />
                            <UAvatar
                                v-else
                                icon="i-heroicons-user"
                                :name="row.original.user?.username"
                            />
                            <span>{{ row.original.user?.nickname }}</span>
                        </div>
                    </template>
                    <template #messageCount-cell="{ row }">
                        <UBadge color="primary" variant="subtle">
                            {{ row.original.messageCount }}
                        </UBadge>
                    </template>
                    <template #totalTokens-cell="{ row }">
                        <span class="text-primary">{{ row.original.totalTokens }}</span>
                    </template>
                    <template #totalPower-cell="{ row }">
                        <span class="text-success">{{ row.original.totalPower }}</span>
                    </template>
                    <template #action-cell="{ row }">
                        <UDropdownMenu :items="getRowItems(row)">
                            <UButton
                                icon="i-lucide-ellipsis-vertical"
                                color="neutral"
                                variant="ghost"
                                aria-label="Actions"
                            />
                        </UDropdownMenu>
                    </template>
                </UTable>
            </BdScrollArea>
        </template>

        <template v-else-if="!paging.loading && paging.items.length > 0 && tab === 2">
            <BdScrollArea class="h-[calc(100vh-13rem)]" :shadow="false">
                <div
                    class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    <ConversationCard
                        v-for="conversation in paging.items"
                        :key="conversation.id"
                        :conversation="conversation"
                        :selected="selectedChat.has(conversation.id)"
                        @select="handleConversationSelect"
                        @delete="handleDeleteConversation"
                        @view-detail="handleViewDetail"
                    />
                </div>
            </BdScrollArea>
        </template>

        <div
            v-else-if="paging.loading"
            class="flex h-[calc(100vh-13rem)] items-center justify-center"
        >
            <div class="flex items-center gap-3">
                <UIcon name="i-lucide-loader-2" class="text-primary-500 h-6 w-6 animate-spin" />
                <span class="text-accent-foreground">{{ $t("common.loading") }}</span>
            </div>
        </div>

        <div v-else class="flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <UIcon name="i-lucide-message-circle" class="text-muted mb-4 h-16 w-16" />
            <h3 class="text-secondary-foreground mb-2 text-lg font-medium">
                {{ $t("ai-chat.backend.empty.title") }}
            </h3>
            <p class="text-accent-foreground">
                {{ $t("ai-chat.backend.empty.description") }}
            </p>
        </div>

        <div
            v-if="paging.total > 0"
            class="bg-background sticky bottom-0 z-10 flex items-center justify-between gap-3 py-4"
        >
            <div class="text-muted text-sm">
                {{ selectedChat.size }} {{ $t("console-common.selected") }}
            </div>

            <div class="flex items-center gap-1.5">
                <BdPagination
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    :total="paging.total"
                    @change="getLists"
                />
            </div>
        </div>
    </div>
</template>
