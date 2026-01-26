<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import { type Row } from "@tanstack/table-core";
import { h, onMounted, reactive, resolveComponent } from "vue";
import { useRouter } from "vue-router";

import type { Article, QueryArticleParams } from "../../../services/console/article";
import {
    apiBatchDeleteArticles,
    apiDeleteArticle,
    apiGetArticleList,
    apiPublishArticle,
    apiUnpublishArticle,
    ArticleStatus,
} from "../../../services/console/article";
import type { Category } from "../../../services/console/category";
import { apiGetCategoryList } from "../../../services/console/category";

const UAvatar = resolveComponent("UAvatar");
const UCheckbox = resolveComponent("UCheckbox");
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UIcon = resolveComponent("UIcon");
const UKbd = resolveComponent("UKbd");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const USelectMenu = resolveComponent("USelectMenu");
const TimeDisplay = resolveComponent("TimeDisplay");

const router = useRouter();
const toast = useMessage();
const { t } = useI18n();

const table = useTemplateRef("table");

const searchForm = reactive<QueryArticleParams>({
    title: "",
    status: undefined,
    categoryId: undefined,
});

const statusOptions = ref([
    { label: t("article.list.search.statusAll"), value: undefined },
    { label: t("article.list.search.statusDraft"), value: ArticleStatus.DRAFT },
    { label: t("article.list.search.statusPublished"), value: ArticleStatus.PUBLISHED },
]);

const categoryOptions = ref<Array<{ label: string; value: string | undefined }>>([
    { label: t("article.list.search.categoryAll"), value: undefined },
]);

const { paging, getLists, resetPage } = usePaging<Article>({
    fetchFun: apiGetArticleList,
    params: searchForm,
});

const getCategoryOptions = async () => {
    try {
        const categories = await apiGetCategoryList();
        categoryOptions.value = [
            { label: t("article.list.search.categoryAll"), value: undefined },
            ...categories.map((cat: Category) => ({
                label: cat.name,
                value: cat.id,
            })),
        ];
    } catch (error) {
        console.error("加载分类列表失败:", error);
    }
};

const columnLabels = computed<Record<string, string>>(() => ({
    select: t("article.list.table.columns.select"),
    title: t("article.list.table.columns.title"),
    author: t("article.list.table.columns.author"),
    status: t("article.list.table.columns.status"),
    views: t("article.list.table.columns.views"),
    publishedAt: t("article.list.table.columns.publishedAt"),
    createdAt: t("article.list.table.columns.createdAt"),
    actions: t("article.list.table.columns.actions"),
}));

const columns: TableColumn<Article>[] = [
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
        accessorKey: "title",
        header: () => h("p", { class: "" }, `${columnLabels.value.title}`),
        cell: ({ row }) => {
            return h("div", { class: "flex items-center gap-3" }, [
                row.original.cover
                    ? h("img", {
                          src: row.original.cover,
                          alt: row.original.title,
                          class: "h-12 w-12 rounded-lg object-cover flex-shrink-0",
                      })
                    : h(
                          "div",
                          {
                              class: "flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0",
                          },
                          [
                              h(UIcon, {
                                  name: "i-heroicons-document-text",
                                  class: "h-6 w-6 text-gray-400",
                              }),
                          ],
                      ),
                h("div", { class: "min-w-0 flex-1" }, [
                    h(
                        "p",
                        {
                            class: "truncate font-medium text-secondary-foreground",
                            title: row.original.title,
                        },
                        row.original.title,
                    ),
                    row.original.summary
                        ? h(
                              "p",
                              {
                                  class: "truncate text-sm max-w-xs text-muted-foreground dark:text-gray-400",
                                  title: row.original.summary,
                              },
                              row.original.summary,
                          )
                        : null,
                ]),
            ]);
        },
    },
    {
        accessorKey: "author",
        header: () => h("p", { class: "" }, `${columnLabels.value.author}`),
        cell: ({ row }) => {
            const author = row.original.author;
            return h("div", { class: "flex items-center gap-2" }, [
                author ? h(UAvatar, { alt: author.nickname || author.username, size: "xs" }) : null,
                h(
                    "span",
                    { class: "text-sm" },
                    author?.nickname || author?.username || t("article.list.table.unknownAuthor"),
                ),
            ]);
        },
    },
    {
        accessorKey: "status",
        header: () => h("p", { class: "" }, `${columnLabels.value.status}`),
        cell: ({ row }) => {
            const status = row.getValue("status") as ArticleStatus;
            const color = status === ArticleStatus.PUBLISHED ? "success" : "warning";
            const text =
                status === ArticleStatus.PUBLISHED
                    ? t("article.list.table.status.published")
                    : t("article.list.table.status.draft");
            return h(UBadge, { color, variant: "subtle" }, () => text);
        },
    },
    {
        accessorKey: "viewCount",
        header: () => h("p", { class: "" }, `${columnLabels.value.views}`),
        cell: ({ row }) => {
            const views = row.getValue("viewCount") || 0;
            return h("div", { class: "flex items-center gap-1" }, [
                h(UIcon, { name: "i-heroicons-eye", class: "h-4 w-4 text-gray-400" }),
                h("span", { class: "text-sm" }, views.toLocaleString()),
            ]);
        },
    },
    {
        accessorKey: "publishedAt",
        header: () => h("p", { class: "" }, `${columnLabels.value.publishedAt}`),
        cell: ({ row }) => {
            const publishedAtValue = row.getValue("publishedAt") as Date | string | undefined;
            if (!publishedAtValue) {
                return h(
                    "span",
                    { class: "text-sm text-muted-foreground dark:text-gray-400" },
                    "-",
                );
            }
            const dateStr =
                publishedAtValue instanceof Date
                    ? publishedAtValue.toISOString()
                    : typeof publishedAtValue === "string"
                      ? publishedAtValue
                      : "";
            return h(
                "span",
                { class: "text-sm text-muted-foreground dark:text-gray-400" },
                dateStr ? h(TimeDisplay, { datetime: dateStr, mode: "date" }) : "-",
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
            const createdAtValue = row.getValue("createdAt") as Date | string | undefined;
            if (!createdAtValue) {
                return h(
                    "span",
                    { class: "text-sm text-muted-foreground dark:text-gray-400" },
                    "-",
                );
            }
            const dateStr =
                createdAtValue instanceof Date
                    ? createdAtValue.toISOString()
                    : typeof createdAtValue === "string"
                      ? createdAtValue
                      : "";
            return h(
                "span",
                { class: "text-sm text-muted-foreground dark:text-gray-400" },
                dateStr ? h(TimeDisplay, { datetime: dateStr, mode: "date" }) : "-",
            );
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${columnLabels.value.actions}`),
        size: 80,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            return h(UDropdownMenu, { items: getActionItems(row) }, () => {
                return h(UButton, {
                    icon: "i-lucide-ellipsis-vertical",
                    color: "neutral",
                    variant: "ghost",
                    class: "ml-auto",
                });
            });
        },
    },
];

async function handleDelete(id: string | string[]) {
    try {
        const isArray = Array.isArray(id);
        const title = t("article.list.messages.warmTip");
        const description = isArray
            ? t("article.list.messages.batchDeleteConfirm")
            : t("article.list.messages.deleteConfirm");

        await useModal({
            color: "error",
            title,
            content: description,
            confirmText: t("article.list.table.actions.delete"),
            ui: {
                content: "!w-sm",
            },
        });

        if (isArray) {
            await apiBatchDeleteArticles(id as string[]);
            toast.success(t("article.list.messages.deleteSuccess"));
        } else {
            await apiDeleteArticle(id as string);
            toast.success(t("article.list.messages.deleteSuccess"));
        }

        getLists();
    } catch (error) {
        console.error("删除失败:", error);
        toast.error(t("article.list.messages.deleteFailed"));
    }
}

async function handleStatusChange(id: string, status: ArticleStatus) {
    try {
        if (status === ArticleStatus.PUBLISHED) {
            await apiPublishArticle(id);
        } else {
            await apiUnpublishArticle(id);
        }
        toast.success(t("article.list.messages.statusUpdateSuccess"));
        getLists();
    } catch {
        toast.error(t("article.list.messages.statusUpdateFailed"));
    }
}

function handleSearch() {
    resetPage();
    getLists();
}

function getActionItems(row: Row<Article>) {
    return [
        {
            label: t("article.list.table.actions.editLabel"),
            icon: "i-lucide-pen-line",
            onClick: () => {
                router.push({
                    path: `/console/article/edit`,
                    query: { id: row.original.id },
                });
            },
        },
        {
            label:
                row.original.status === ArticleStatus.PUBLISHED
                    ? t("article.list.table.actions.setDraft")
                    : t("article.list.table.actions.publish"),
            icon:
                row.original.status === ArticleStatus.PUBLISHED
                    ? "i-heroicons-eye-slash"
                    : "i-heroicons-eye",
            onSelect() {
                const newStatus =
                    row.original.status === ArticleStatus.PUBLISHED
                        ? ArticleStatus.DRAFT
                        : ArticleStatus.PUBLISHED;
                handleStatusChange(row.original.id, newStatus);
            },
        },
        {
            label: t("article.list.table.actions.delete"),
            icon: "i-lucide-trash",
            color: "error",
            onSelect() {
                if (row.original.id) {
                    handleDelete(row.original.id);
                }
            },
        },
    ].filter(Boolean);
}

onMounted(() => {
    Promise.all([getCategoryOptions(), getLists()]);
});
</script>

<template>
    <div class="space-y-6">
        <!-- 搜索区域 -->
        <div class="mb-4 flex flex-wrap gap-4">
            <UInput
                v-model="searchForm.title"
                :placeholder="t('article.list.search.searchPlaceholder')"
                icon="i-heroicons-magnifying-glass"
                @keyup.enter="handleSearch"
            />

            <USelectMenu
                v-model="searchForm.status"
                :items="statusOptions"
                :placeholder="t('article.list.search.statusPlaceholder')"
                value-key="value"
                @change="handleSearch"
            />

            <USelectMenu
                v-model="searchForm.categoryId"
                :items="categoryOptions"
                :placeholder="t('article.list.search.categoryPlaceholder')"
                value-key="value"
                @change="handleSearch"
            />

            <div class="flex items-end gap-2 md:ml-auto">
                <UButton
                    color="error"
                    variant="subtle"
                    :label="t('article.list.table.actions.batchDelete')"
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
                                label:
                                    columnLabels[column.id] || (column.columnDef.header as string),
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
                        :label="t('article.list.table.actions.showColumns')"
                        color="neutral"
                        variant="outline"
                        trailing-icon="i-lucide-chevron-down"
                    />
                </UDropdownMenu>

                <UButton
                    icon="i-heroicons-plus"
                    color="primary"
                    @click="router.push('/console/article/add')"
                >
                    {{ t("article.list.table.actions.createLabel") }}
                </UButton>
            </div>
        </div>

        <!-- 数据表格 -->
        <UTable
            :loading="paging.loading"
            :data="paging.items"
            :columns="columns"
            class="mb-0 shrink-0"
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

        <!-- 分页 -->
        <div class="border-default mt-auto flex items-center justify-between gap-3 border-t pt-4">
            <div class="text-muted text-sm">
                {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} /
                {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
                {{ t("article.list.table.actions.selected") }}.
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
