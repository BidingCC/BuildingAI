<script setup lang="ts">
import type { SecretConfigRequest } from "@buildingai/service/consoleapi/secret-list";
import {
    createSecret,
    deleteSecret,
    deleteSecrets,
    getSecretList,
    updateSecret,
    updateSecretStatus,
} from "@buildingai/service/consoleapi/secret-list";
import type { SecretTemplateRequest } from "@buildingai/service/consoleapi/secret-template";
import { getAllSecretTemplates } from "@buildingai/service/consoleapi/secret-template";
import type { Row, Table } from "@tanstack/table-core";

import type { DropdownMenuItem, TableColumn } from "#ui/types";

const ListEdit = defineAsyncComponent(() => import("./components/list-edit.vue"));

const { t } = useI18n();
const toast = useMessage();
const table = useTemplateRef("table");
const overlay = useOverlay();

const UCheckbox = resolveComponent("UCheckbox");
const TimeDisplay = resolveComponent("TimeDisplay");

const searchForm = shallowReactive({
    name: "",
    templateId: "all",
});
const selectedIds = shallowRef<string[]>([]);
const templateList = shallowRef<SecretTemplateRequest[]>([]);

const { paging, getLists } = usePaging({
    fetchFun: getSecretList,
    params: searchForm,
});

const columns = computed((): TableColumn<SecretConfigRequest>[] => [
    {
        id: "select",
        accessorKey: "select" as keyof SecretConfigRequest,
        header: ({ table }: { table: Table<SecretConfigRequest> }) =>
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
        cell: ({ row }: { row: Row<SecretConfigRequest> }) =>
            h(UCheckbox, {
                modelValue: row.getIsSelected(),
                "onUpdate:modelValue": (value: boolean | "indeterminate") => {
                    row.toggleSelected(!!value);
                    handleSelect(row, value);
                },
                "aria-label": "Select row",
            }),
    },
    { accessorKey: "name", header: t("ai-secret.backend.list.form.name") },
    {
        accessorKey: "template",
        header: t("ai-secret.backend.list.form.keyType"),
        cell: ({ row }: { row: Row<SecretConfigRequest> }) => row.original.template.name,
    },
    { accessorKey: "remark", header: t("ai-secret.backend.list.form.remark") },
    { accessorKey: "status", header: t("console-common.status") },
    {
        accessorKey: "createdAt",
        header: t("console-common.createAt"),
        cell: ({ row }: { row: Row<SecretConfigRequest> }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
    {
        id: "action",
        accessorKey: "action" as keyof SecretConfigRequest,
        header: t("console-common.operation"),
    },
]);

const getRowItems = (row: Row<SecretConfigRequest>): DropdownMenuItem[] => {
    return [
        {
            label: t("console-common.edit"),
            icon: "i-lucide-edit",
            onClick: () => {
                mountListEditModal(row.original.id);
            },
        },
        {
            label: t("console-common.delete"),
            icon: "i-lucide-trash",
            color: "error",
            onSelect() {
                handleDelete(row.original.id);
            },
        },
    ];
};

const mountListEditModal = (keyId?: string): void => {
    const modal = overlay.create(ListEdit);

    modal.open({
        id: keyId,
        onSubmit: (data: SecretConfigRequest, id?: string) => {
            handleSubmit(data, id);
        },
    });
};

const handleAdd = () => {
    mountListEditModal();
};

const handleDelete = async (id: string) => {
    await deleteSecret(id);
    toast.success(t("console-common.deleteSuccess"));
    getLists();
};

const handleSwitchChange = async (row: Row<SecretConfigRequest>) => {
    if (!row.original.id) {
        console.error("行数据缺少 ID");
        return;
    }
    try {
        await updateSecretStatus(row.original.id, { status: row.original.status });
        toast.success(
            !row.original.status
                ? t("console-common.disableSuccess")
                : t("console-common.enableSuccess"),
        );
        getLists();
    } catch (error) {
        console.error("更新状态失败:", error);
    }
};

const handleSelect = (row: Row<SecretConfigRequest>, selected: boolean | "indeterminate") => {
    if (typeof selected === "boolean") {
        const id = row.original.id;
        if (selected) {
            selectedIds.value.push(id);
        } else {
            selectedIds.value = selectedIds.value.filter((item) => item !== id);
        }
        console.log(selectedIds.value);
    }
};

const handleSelectAll = (selected: boolean | "indeterminate") => {
    if (typeof selected === "boolean") {
        if (selected) {
            selectedIds.value = paging.items.map((item) => item.id);
        } else {
            selectedIds.value = [];
        }
    }
};

const handleBatchDelete = async () => {
    try {
        await deleteSecrets(selectedIds.value);
        selectedIds.value = [];
        table.value?.tableApi.toggleAllPageRowsSelected(false);
        toast.success(t("console-common.batchDeleteSuccess"));
        getLists();
    } catch (error) {
        console.error("批量删除失败:", error);
    }
};

const handleSubmit = async (data: SecretConfigRequest, id?: string) => {
    if (id) {
        await updateSecret(id, data);
    } else {
        await createSecret(data);
    }
    toast.success(t("ai-secret.backend.list.edit.submitSuccess"));
    getLists();
};

const getTemplateList = async () => {
    try {
        const templates = await getAllSecretTemplates();
        templateList.value = templates;
    } catch (error) {
        console.error("加载模板列表失败:", error);
    }
};

/**
 * 处理模板筛选变化
 */
const handleTemplateChange = () => {
    getLists();
};

onMounted(() => {
    getTemplateList();
    getLists();
});
</script>
<template>
    <div class="flex h-full flex-col gap-4">
        <!-- 顶部控制区域 -->
        <div class="flex items-center justify-between gap-4">
            <div class="flex flex-1 items-center gap-2">
                <UInput
                    v-model="searchForm.name"
                    :placeholder="t('ai-secret.backend.list.placeholder')"
                    @keyup.enter="getLists"
                />
                <USelect
                    v-model="searchForm.templateId"
                    :items="[
                        { label: t('console-common.all'), value: 'all' },
                        ...templateList.map((t) => ({ label: t.name, value: t.id })),
                    ]"
                    label-key="label"
                    value-key="value"
                    :placeholder="t('ai-secret.backend.list.form.keyType')"
                    class="w-48"
                    @update:model-value="handleTemplateChange"
                />
            </div>

            <div class="flex items-center gap-2">
                <UButton
                    icon="i-tabler-trash"
                    color="error"
                    variant="outline"
                    @click="handleBatchDelete"
                    >{{ t("console-common.batchDelete") }}</UButton
                >
                <UButton color="primary" icon="i-lucide-plus" @click="handleAdd">{{
                    t("ai-secret.backend.list.add")
                }}</UButton>
            </div>
        </div>
        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto">
            <UTable
                ref="table"
                class="h-full"
                sticky
                :columns="columns"
                :data="paging.items"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                    td: 'border-b border-default',
                    tr: '[&:has(>td[colspan])]:hidden',
                }"
            >
                <template #status-cell="{ row }">
                    <USwitch
                        :model-value="Boolean(row.original.status)"
                        @update:model-value="(value) => (row.original.status = value ? 1 : 0)"
                        @change="handleSwitchChange(row)"
                    />
                </template>
                <template #action-cell="{ row }">
                    <UDropdownMenu :items="getRowItems(row)">
                        <UButton
                            icon="i-lucide-ellipsis-vertical"
                            color="neutral"
                            variant="ghost"
                        />
                    </UDropdownMenu>
                </template>
            </UTable>
        </div>

        <!-- 分页 -->
        <div class="bg-background flex items-center justify-end gap-3 py-4">
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
