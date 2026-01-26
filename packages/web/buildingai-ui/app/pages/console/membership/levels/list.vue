<script lang="ts" setup>
import {
    apiDeleteLevel,
    apiGetLevelList,
    apiUpdateLevelStatus,
    type LevelFormData,
    type LevelQueryRequest,
} from "@buildingai/service/consoleapi/membership-level";

import type { TableColumn } from "#ui/types";

const UButton = resolveComponent("UButton");
const USwitch = resolveComponent("USwitch");
const UAvatar = resolveComponent("UAvatar");
const UPopover = resolveComponent("UPopover");
const UIcon = resolveComponent("UIcon");

const { t } = useI18n();
const toast = useMessage();
const router = useRouter();
const { hasAccessByCodes } = useAccessControl();

// 表格实例 Refs
const table = useTemplateRef("table");
const searchForm = reactive<LevelQueryRequest>({
    name: "",
    status: undefined,
});

const { paging, getLists } = usePaging({
    fetchFun: apiGetLevelList,
    params: searchForm,
});

// 列ID到中文名称的映射
const columnLabels = computed<Record<string, string>>(() => ({
    level: t("membership.console-membership.level.table.level"),
    icon: t("membership.console-membership.level.table.icon"),
    name: t("membership.console-membership.level.table.name"),
    description: t("membership.console-membership.level.table.description"),
    givePower: t("membership.console-membership.level.table.givePower"),
    accountCount: t("membership.console-membership.level.table.accountCount"),
    status: t("membership.console-membership.level.table.status"),
    actions: t("membership.console-membership.level.table.actions"),
}));

// 定义表格列
const columns: TableColumn<LevelFormData>[] = [
    {
        accessorKey: "level",
        header: () =>
            h("div", { class: "flex items-center gap-1" }, [
                h("span", `${columnLabels.value.level}`),
                h(
                    UPopover,
                    { mode: "hover" },
                    {
                        default: () =>
                            h(UIcon, {
                                name: "i-lucide-circle-help",
                                class: "size-4 cursor-pointer text-muted-foreground",
                            }),
                        content: () =>
                            h(
                                "p",
                                { class: "text-sm py-2 px-4 w-64" },
                                t("membership.console-membership.level.table.levelTip"),
                            ),
                    },
                ),
            ]),
        cell: ({ row }) => {
            return h("p", { class: "" }, row.original.level + "级");
        },
    },
    {
        accessorKey: "icon",
        header: () => h("p", { class: "" }, `${columnLabels.value.icon}`),
        cell: ({ row }) => {
            return h(UAvatar, {
                src: row.original.icon,
                alt: row.original.name,
                ui: {
                    root: "rounded-sm",
                },
            });
        },
    },
    {
        accessorKey: "name",
        header: () => h("p", { class: "" }, `${columnLabels.value.name}`),
        cell: ({ row }) => {
            return h("p", { class: "" }, row.original.name);
        },
    },
    {
        accessorKey: "description",
        header: () => h("p", { class: "" }, `${columnLabels.value.description}`),
        cell: ({ row }) => {
            return h("p", { class: "" }, row.original.description);
        },
    },
    {
        accessorKey: "givePower",
        header: () => h("p", { class: "" }, `${columnLabels.value.givePower}`),
        cell: ({ row }) => {
            return h("p", { class: "" }, row.original.givePower);
        },
    },
    {
        accessorKey: "accountCount",
        header: () => h("p", { class: "" }, `${columnLabels.value.accountCount}`),
    },
    {
        accessorKey: "status",
        header: () => h("p", { class: "" }, `${columnLabels.value.status}`),
        cell: ({ row }) => {
            return h(USwitch, {
                modelValue: row.original.status,
                size: "sm",
                "onUpdate:modelValue": (value: boolean) => {
                    handleUpdateStatus(row.original.id as string, value);
                },
            });
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${columnLabels.value.actions}`),
        size: 40, // 固定宽度
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            return h(
                "div",
                { class: "flex items-center gap-1" },
                [
                    hasAccessByCodes(["level:update"])
                        ? h(UButton, {
                              icon: "i-lucide-pen-line",
                              color: "primary",
                              variant: "ghost",
                              size: "xs",
                              label: t("console-common.edit"),
                              onClick: () => {
                                  router.push({
                                      path: useRoutePath("levels:update"),
                                      query: { id: row.original.id },
                                  });
                              },
                          })
                        : null,
                    hasAccessByCodes(["level:delete"])
                        ? h(UButton, {
                              icon: "i-lucide-trash",
                              color: "error",
                              variant: "ghost",
                              size: "xs",
                              label: t("console-common.delete"),
                              onClick: () => {
                                  handleDelete(row.original.id as string);
                              },
                          })
                        : null,
                ].filter(Boolean),
            );
        },
    },
];

const handleDelete = async (id: string) => {
    try {
        await useModal({
            title: t("membership.console-membership.level.deleteTitle"),
            description: t("membership.console-membership.level.deleteMsg"),
            color: "error",
        });

        await apiDeleteLevel(id);
        // 刷新列表
        getLists();
    } catch (error) {
        console.error("删除失败:", error);
    }
};

const handleUpdateStatus = async (id: string, status: boolean) => {
    try {
        await apiUpdateLevelStatus(id, { status });
        // 刷新列表
        getLists();
        toast.success(t("membership.console-membership.level.updateStatusSuccess"));
    } catch (error) {
        console.error("更新状态失败:", error);
    }
};

onMounted(() => getLists());
</script>

<template>
    <div class="role-list-container pb-5">
        <!-- 搜索区域 -->
        <div class="bg-background sticky top-0 z-10 flex flex-wrap gap-4 pb-4">
            <UInput
                v-model="searchForm.name"
                :placeholder="t('membership.console-membership.level.nameInput')"
                class="w-48"
                @change="getLists"
            />

            <USelect
                v-model="searchForm.status"
                :placeholder="t('membership.console-membership.level.status')"
                :items="[
                    {
                        label: t('membership.console-membership.level.select.all'),
                        value: undefined,
                    },
                    {
                        label: t('membership.console-membership.level.select.active'),
                        value: true,
                    },
                    {
                        label: t('membership.console-membership.level.select.inactive'),
                        value: false,
                    },
                ]"
                class="w-48"
                @change="getLists"
            />

            <div class="flex items-end gap-2 md:ml-auto">
                <AccessControl :codes="['level:create']">
                    <UButton
                        icon="i-heroicons-plus"
                        color="primary"
                        @click="
                            () => {
                                router.push({ path: useRoutePath('levels:create') });
                            }
                        "
                    >
                        {{ t("membership.console-membership.level.add") }}
                    </UButton>
                </AccessControl>
            </div>
        </div>

        <!-- 表格区域 -->
        <UTable
            :loading="paging.loading"
            :data="paging.items"
            :columns="columns"
            class="h-[calc(100vh-13rem)] shrink-0"
            ref="table"
            selectable
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
            }"
        >
        </UTable>

        <!-- 分页 -->
        <div class="mt-auto flex items-center justify-between gap-3 pt-4">
            <div class="text-muted text-sm">
                {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} /
                {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
                {{ t("console-common.selected") }}.
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
