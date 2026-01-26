<script lang="ts" setup>
import type {
    AgentAnnotation,
    AnnotationReviewStatus,
    QueryAgentAnnotationParams,
} from "@buildingai/service/consoleapi/ai-agent";
import {
    apiDeleteAgentAnnotation,
    apiGetAgentAnnotationList,
    apiReviewAgentAnnotation,
} from "@buildingai/service/consoleapi/ai-agent";

import type { TableColumn } from "#ui/types";

const AgentAnnotationModal = defineAsyncComponent(() => import("./annotation-modal.vue"));

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UIcon = resolveComponent("UIcon");
const UInput = resolveComponent("UInput");
const TimeDisplay = resolveComponent("TimeDisplay");

const props = defineProps<{
    agentId: string;
}>();

const toast = useMessage();
const { hasAccessByCodes } = useAccessControl();
const { t } = useI18n();
const overlay = useOverlay();
const table = useTemplateRef("table");

const searchForm = shallowReactive<QueryAgentAnnotationParams>({
    agentId: props.agentId,
    keyword: "",
    enabled: undefined,
    reviewStatus: undefined,
});

const reviewStatusOptions = [
    {
        value: undefined as AnnotationReviewStatus | undefined,
        label: t("ai-agent.backend.logs.allStatus"),
    },
    { value: "pending" as AnnotationReviewStatus, label: t("ai-agent.backend.logs.pending") },
    { value: "approved" as AnnotationReviewStatus, label: t("ai-agent.backend.logs.approved") },
    { value: "rejected" as AnnotationReviewStatus, label: t("ai-agent.backend.logs.rejected") },
];

const getReviewStatusDisplay = (status: AnnotationReviewStatus) => {
    switch (status) {
        case "pending":
            return { label: t("ai-agent.backend.logs.pending"), color: "warning" };
        case "approved":
            return { label: t("ai-agent.backend.logs.approved"), color: "success" };
        case "rejected":
            return { label: t("ai-agent.backend.logs.rejected"), color: "red" };
        default:
            return { label: t("ai-agent.backend.logs.unknown"), color: "neutral" };
    }
};

const columnLabels = computed(() => ({
    question: t("ai-agent.backend.logs.question"),
    answer: t("ai-agent.backend.logs.answer"),
    hitCount: t("ai-agent.backend.logs.hitCount"),
    enabled: t("ai-agent.backend.logs.enabled"),
    reviewStatus: t("ai-agent.backend.logs.reviewStatus"),
    reviewer: t("ai-agent.backend.logs.reviewer"),
    createdAt: t("ai-agent.backend.logs.createdAt"),
    actions: t("ai-agent.backend.logs.actions"),
}));

const { paging, getLists } = usePaging<AgentAnnotation>({
    fetchFun: apiGetAgentAnnotationList,
    params: searchForm,
});

const columns: TableColumn<AgentAnnotation>[] = [
    {
        accessorKey: "question",
        header: () => h("p", { class: "" }, `${columnLabels.value.question}`),
        cell: ({ row }) => {
            return h("div", { class: "flex items-start gap-3" }, [
                h(UIcon, {
                    name: "i-lucide-help-circle",
                    class: "text-primary size-5 mt-0.5 flex-none",
                }),
                h(
                    "p",
                    {
                        class: "font-medium text-highlighted line-clamp-2 max-w-sm",
                        title: row.original.question,
                    },
                    row.original.question,
                ),
            ]);
        },
    },
    {
        accessorKey: "answer",
        header: () => h("p", { class: "" }, `${columnLabels.value.answer}`),
        cell: ({ row }) => {
            return h("div", { class: "flex-1 grid" }, [
                h(
                    "p",
                    {
                        class: "text-sm text-muted-foreground truncate",
                        title: row.original.answer,
                    },
                    row.original.answer,
                ),
            ]);
        },
    },
    {
        accessorKey: "hitCount",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.hitCount}`),
        cell: ({ row }) => {
            const hitCount = row.original.hitCount || 0;
            const badgeColor = hitCount > 10 ? "success" : hitCount > 5 ? "warning" : "neutral";
            return h(
                "div",
                { class: "flex items-center justify-center flex-none" },
                h(UBadge, { color: badgeColor, variant: "subtle" }, () => hitCount.toString()),
            );
        },
    },
    {
        accessorKey: "enabled",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.enabled}`),
        cell: ({ row }) => {
            return h(
                "div",
                { class: "flex items-center justify-center flex-none" },
                h(
                    UBadge,
                    {
                        color: row.original.enabled ? "success" : "neutral",
                        variant: "subtle",
                    },
                    () =>
                        row.original.enabled
                            ? t("console-common.enabled")
                            : t("console-common.disabled"),
                ),
            );
        },
    },
    {
        accessorKey: "reviewStatus",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.reviewStatus}`),
        cell: ({ row }) => {
            const display = getReviewStatusDisplay(row.original.reviewStatus);
            return h(
                "div",
                { class: "flex items-center justify-center flex-none" },
                h(
                    UBadge,
                    {
                        color: display.color,
                        variant: "subtle",
                    },
                    () => display.label,
                ),
            );
        },
    },
    {
        accessorKey: "reviewer",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.reviewer}`),
        cell: ({ row }) => {
            const reviewer = row.original.reviewer;
            if (!reviewer) {
                return h(
                    "div",
                    { class: "flex items-center flex-none" },
                    h(
                        "span",
                        { class: "text-muted-foreground text-sm" },
                        t("ai-agent.backend.logs.unreviewed"),
                    ),
                );
            }
            return h(
                "div",
                { class: "flex items-center justify-center flex-none" },
                h("div", { class: "flex items-center gap-2" }, [
                    reviewer.avatar
                        ? h("img", {
                              src: reviewer.avatar,
                              class: "w-6 h-6 rounded-full",
                              alt: reviewer.nickname || reviewer.username,
                          })
                        : h(UIcon, {
                              name: "i-lucide-user",
                              class: "w-6 h-6 text-muted-foreground",
                          }),
                    h(
                        "span",
                        { class: "text-sm font-medium" },
                        reviewer.nickname || reviewer.username,
                    ),
                ]),
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: columnLabels.value.createdAt,
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
    {
        accessorKey: "actions",
        header: () => h("p", { class: "text-center" }, `${columnLabels.value.actions}`),
        cell: ({ row }) => {
            const actions = [];

            if (hasAccessByCodes(["ai-agent-annotations:update"])) {
                actions.push(
                    h(UButton, {
                        color: "neutral",
                        variant: "ghost",
                        size: "xs",
                        icon: "i-lucide-edit",
                        onClick: () => handleEdit(row.original.id),
                    }),
                );
            }

            if (
                row.original.reviewStatus === "pending" &&
                hasAccessByCodes(["ai-agent-annotations:review"])
            ) {
                actions.push(
                    h(UButton, {
                        color: "green",
                        variant: "ghost",
                        size: "xs",
                        icon: "i-lucide-check",
                        onClick: () => reviewAnnotation(row.original.id, "approved"),
                    }),
                    h(UButton, {
                        color: "red",
                        variant: "ghost",
                        size: "xs",
                        icon: "i-lucide-x",
                        onClick: () => reviewAnnotation(row.original.id, "rejected"),
                    }),
                );
            }

            if (hasAccessByCodes(["ai-agent-annotations:delete"])) {
                actions.push(
                    h(UButton, {
                        color: "red",
                        variant: "ghost",
                        size: "xs",
                        icon: "i-lucide-trash-2",
                        onClick: () => handleDelete(row.original.id),
                    }),
                );
            }

            return h("div", { class: "flex items-center justify-center gap-1" }, actions);
        },
    },
];

const { lockFn: reviewAnnotation } = useLockFn(
    async (id: string, reviewStatus: AnnotationReviewStatus) => {
        try {
            await apiReviewAgentAnnotation(id, { reviewStatus });
            toast.success(
                `${t("ai-agent.backend.logs.annotation")}${reviewStatus === "approved" ? t("ai-agent.backend.logs.approved") : t("ai-agent.backend.logs.rejected")}${t("ai-agent.backend.logs.success")}`,
            );
            getLists();
        } catch (error) {
            console.error("审核标注失败:", error);
        }
    },
);

const { lockFn: deleteAnnotation } = useLockFn(async (id: string) => {
    try {
        await apiDeleteAgentAnnotation(id);
        toast.success(t("common.message.deleteSuccess"));
        getLists();
    } catch (error) {
        console.error("删除标注失败:", error);
    }
});

const mountAnnotationModal = async (annotationId: string | null = null) => {
    const modal = overlay.create(AgentAnnotationModal);

    const instance = modal.open({
        agentId: props.agentId,
        annotationId: annotationId,
        hiddenStatus: true,
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleCreate = () => {
    mountAnnotationModal();
};

const handleEdit = (id: string) => {
    mountAnnotationModal(id);
};

const handleDelete = (id: string) => {
    deleteAnnotation(id);
};

watch(
    () => [searchForm.keyword, searchForm.enabled, searchForm.reviewStatus],
    () => {
        useDebounceFn(() => {
            paging.page = 1;
            getLists();
        }, 300)();
    },
    { deep: true },
);

// 监听 agentId 变化，重新获取数据
watch(
    () => props.agentId,
    (newAgentId) => {
        searchForm.agentId = newAgentId;
        paging.page = 1;
        getLists();
    },
);

// 初始化
onMounted(() => getLists());
</script>

<template>
    <div class="flex h-full w-full flex-col">
        <!-- 搜索区域 -->
        <div class="flex h-full flex-1 flex-col">
            <div class="flex w-full justify-between gap-4 py-4 backdrop-blur-sm">
                <div class="flex items-center gap-2">
                    <UInput
                        v-model="searchForm.keyword"
                        :placeholder="t('ai-agent.backend.logs.searchPlaceholder')"
                        class="w-80"
                        icon="i-lucide-search"
                    />
                    <UDropdownMenu
                        :items="[
                            {
                                label: t('ai-agent.backend.logs.allStatus'),
                                type: 'radio' as const,
                                checked: searchForm.enabled === undefined,
                                onSelect: () => (searchForm.enabled = undefined),
                            },
                            {
                                label: t('console-common.enabled'),
                                type: 'radio' as const,
                                checked: searchForm.enabled === true,
                                onSelect: () => (searchForm.enabled = true),
                            },
                            {
                                label: t('console-common.disabled'),
                                type: 'radio' as const,
                                checked: searchForm.enabled === false,
                                onSelect: () => (searchForm.enabled = false),
                            },
                        ]"
                        :content="{ align: 'start' }"
                    >
                        <UButton
                            :label="
                                searchForm.enabled === undefined
                                    ? t('ai-agent.backend.logs.allStatus')
                                    : searchForm.enabled
                                      ? t('console-common.enabled')
                                      : t('console-common.disabled')
                            "
                            color="neutral"
                            variant="outline"
                            trailing-icon="i-lucide-chevron-down"
                        />
                    </UDropdownMenu>

                    <!-- 审核状态过滤器 -->
                    <UDropdownMenu
                        :items="
                            reviewStatusOptions.map((option) => ({
                                label: option.label,
                                type: 'radio' as const,
                                checked: searchForm.reviewStatus === option.value,
                                onSelect: () => (searchForm.reviewStatus = option.value),
                            }))
                        "
                        :content="{ align: 'start' }"
                    >
                        <UButton
                            :label="
                                reviewStatusOptions.find(
                                    (opt) => opt.value === searchForm.reviewStatus,
                                )?.label || t('ai-agent.backend.logs.allStatus')
                            "
                            color="neutral"
                            variant="outline"
                            trailing-icon="i-lucide-chevron-down"
                        />
                    </UDropdownMenu>
                </div>

                <div class="flex items-center gap-2 md:ml-auto">
                    <AccessControl :codes="['ai-agent-annotations:create']">
                        <UButton
                            :label="t('ai-agent.backend.logs.addAnnotation')"
                            color="primary"
                            variant="solid"
                            leading-icon="i-lucide-plus"
                            @click="handleCreate"
                        />
                    </AccessControl>

                    <UDropdownMenu
                        :items="
                            table?.tableApi
                                ?.getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => ({
                                    label:
                                        columnLabels[column.id as keyof typeof columnLabels] ||
                                        column.columnDef.header,
                                    type: 'checkbox' as const,
                                    checked: column.getIsVisible(),
                                    onUpdateChecked(checked: boolean) {
                                        table?.tableApi
                                            ?.getColumn(column.id)
                                            ?.toggleVisibility(!!checked);
                                    },
                                    onSelect(e?: Event) {
                                        e?.preventDefault();
                                    },
                                }))
                        "
                        :content="{ align: 'end' }"
                    >
                        <UButton
                            :label="t('console-common.showColumns')"
                            color="neutral"
                            variant="outline"
                            trailing-icon="i-lucide-chevron-down"
                        />
                    </UDropdownMenu>

                    <UButton
                        :label="t('console-common.refresh')"
                        color="neutral"
                        variant="outline"
                        leading-icon="i-lucide-refresh-cw"
                        @click="getLists"
                    />
                </div>
            </div>

            <!-- 表格区域 -->
            <div class="flex h-full flex-1 flex-col">
                <div class="table h-full">
                    <UTable
                        :loading="paging.loading"
                        :data="paging.items"
                        :columns="columns"
                        class="h-full"
                        ref="table"
                        sticky
                        selectable
                        :ui="{
                            base: 'table-fixed border-separate border-spacing-0',
                            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                            td: 'border-b border-default',
                            tr: 'hover:bg-elevated/50',
                        }"
                    />
                </div>
            </div>

            <!-- 分页 -->
            <div class="flex items-center justify-end gap-3 py-4">
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
    </div>
</template>
