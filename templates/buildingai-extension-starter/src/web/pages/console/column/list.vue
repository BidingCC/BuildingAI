<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { h, onMounted, reactive, resolveComponent } from "vue";

import type { Category, QueryCategoryParams } from "../../../services/console/category";
import {
    apiBatchDeleteCategories,
    apiDeleteCategory,
    apiGetCategoryList,
} from "../../../services/console/category";

const ColumnEdit = defineAsyncComponent(() => import("./edit.vue"));

const UCheckbox = resolveComponent("UCheckbox");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const TimeDisplay = resolveComponent("TimeDisplay");

const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();
const table = useTemplateRef("table");

const searchForm = reactive<QueryCategoryParams>({
    name: "",
});

const items = ref<Category[]>([]);

const columnLabels = computed<Record<string, string>>(() => ({
    select: t("column.list.table.columns.select"),
    name: t("column.list.table.columns.name"),
    sort: t("column.list.table.columns.sort"),
    articleCount: t("column.list.table.columns.articleCount"),
    createdAt: t("column.list.table.columns.createdAt"),
    actions: t("column.list.table.columns.actions"),
}));

const columns: TableColumn<Category>[] = [
    {
        id: "select",
        header: ({ table }) =>
            h(UCheckbox, {
                modelValue: table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : table.getIsAllPageRowsSelected(),
                "onUpdate:modelValue": (value: boolean | "indeterminate") =>
                    table.toggleAllPageRowsSelected(!!value),
                ariaLabel: "Select all",
            }),
        cell: ({ row }) =>
            h(UCheckbox, {
                modelValue: row.getIsSelected(),
                "onUpdate:modelValue": (value: boolean | "indeterminate") =>
                    row.toggleSelected(!!value),
                ariaLabel: "Select row",
            }),
    },
    {
        accessorKey: "name",
        header: () => h("p", { class: "" }, `${columnLabels.value.name}`),
        cell: ({ row }) => {
            const category = row.original;
            return h("div", { class: "flex items-center gap-3" }, [
                h("div", undefined, [
                    h("p", { class: "font-medium" }, category.name),
                    category.description
                        ? h(
                              "p",
                              {
                                  class: "truncate text-sm text-muted-foreground dark:text-gray-400",
                              },
                              category.description,
                          )
                        : null,
                ]),
            ]);
        },
    },
    {
        accessorKey: "sort",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: columnLabels.value.sort,
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
            const sort = row.getValue("sort") as number;
            return h("span", { class: "text-accent-foreground" }, sort || 0);
        },
    },
    {
        accessorKey: "articleCount",
        header: () => h("p", { class: "" }, `${columnLabels.value.articleCount}`),
        cell: ({ row }) => {
            const count = row.getValue("articleCount") as number;
            return h("span", { class: "text-accent-foreground" }, count || 0);
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
            const createdAtValue = row.getValue("createdAt") as Date | string | undefined;
            if (!createdAtValue) {
                return h("span", { class: "text-accent-foreground text-sm" }, "-");
            }
            const dateStr =
                createdAtValue instanceof Date
                    ? createdAtValue.toISOString()
                    : typeof createdAtValue === "string"
                      ? createdAtValue
                      : "";
            return h(
                "span",
                { class: "text-accent-foreground text-sm" },
                dateStr ? h(TimeDisplay, { datetime: dateStr, mode: "date" }) : "-",
            );
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${columnLabels.value.actions}`),
        size: 40, // 固定宽度
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            return h("div", { class: "flex items-center gap-1" }, [
                h(UButton, {
                    icon: "i-lucide-pen-line",
                    color: "primary",
                    variant: "ghost",
                    size: "xs",
                    label: t("column.list.table.actions.edit"),
                    onClick: () => {
                        handlePopupOpen(row.original.id);
                    },
                }),
                h(UButton, {
                    icon: "i-lucide-trash",
                    color: "error",
                    variant: "ghost",
                    size: "xs",
                    label: t("column.list.table.actions.delete"),
                    onClick: () => {
                        handleDelete(row.original.id as string);
                    },
                }),
            ]);
        },
    },
];

const { lockFn: getLists, isLock: loading } = useLockFn(async () => {
    try {
        const data = await apiGetCategoryList(searchForm);
        items.value = data || [];
    } catch (error) {
        console.error("获取栏目列表失败:", error);
        toast.error(t("column.list.messages.fetchFailed"));
    }
});

const handlePopupOpen = async (id: string | null = null) => {
    const modal = overlay.create(ColumnEdit);
    const instance = modal.open({ id: id as string });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleDelete = async (id: string | string[]) => {
    try {
        const isArray = Array.isArray(id);
        const title = t("column.list.messages.warmTip");
        const description = isArray
            ? t("column.list.messages.batchDeleteConfirm")
            : t("column.list.messages.deleteConfirm");

        await useModal({
            color: "error",
            title,
            content: description,
            confirmText: t("column.list.table.actions.delete"),
            ui: {
                content: "!w-sm",
            },
        });

        if (isArray) {
            await apiBatchDeleteCategories(id as string[]);
        } else {
            await apiDeleteCategory(id as string);
        }
        // 刷新列表
        getLists();
        toast.success(t("column.list.messages.deleteSuccess"));
    } catch (error) {
        console.error("删除失败:", error);
        toast.error(t("column.list.messages.deleteFailed"));
    }
};

const handleSearch = () => {
    getLists();
};

onMounted(() => getLists());
</script>

<template>
    <div class="column-list-container pb-5">
        <!-- 搜索区域 -->
        <div class="mb-4 flex flex-wrap gap-4">
            <UInput
                v-model="searchForm.name"
                :placeholder="t('column.list.search.placeholder')"
                icon="i-heroicons-magnifying-glass"
                @keyup.enter="handleSearch"
            />

            <div class="flex items-end gap-2 md:ml-auto">
                <UButton
                    color="error"
                    variant="subtle"
                    :label="t('column.list.table.actions.batchDelete')"
                    icon="i-heroicons-trash"
                    :disabled="!table?.tableApi?.getFilteredSelectedRowModel().rows.length"
                    @click="
                        handleDelete(
                            table?.tableApi
                                ?.getFilteredSelectedRowModel()
                                .rows.map((row: any) => row.original.id) as string[],
                        )
                    "
                >
                    <template #trailing>
                        <UKbd>
                            {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
                        </UKbd>
                    </template>
                </UButton>

                <UDropdownMenu
                    :items="
                        table?.tableApi
                            ?.getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => ({
                                label: columnLabels[column?.id] || column.columnDef.header,
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
                        :label="t('column.list.table.actions.showColumns')"
                        color="neutral"
                        variant="outline"
                        trailing-icon="i-lucide-chevron-down"
                    />
                </UDropdownMenu>

                <UButton icon="i-heroicons-plus" color="primary" @click="handlePopupOpen()">
                    {{ t("column.list.table.actions.create") }}
                </UButton>
            </div>
        </div>

        <!-- 表格区域 -->
        <UTable
            :loading="loading"
            :data="items"
            :columns="columns"
            class="shrink-0"
            ref="table"
            selectable
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
            }"
        />

        <!-- 底部信息 -->
        <div class="border-default mt-auto flex items-center justify-between gap-3 border-t pt-4">
            <div class="text-muted text-sm">
                {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} /
                {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
                {{ t("column.list.table.actions.selected") }}.
            </div>
        </div>
    </div>
</template>
