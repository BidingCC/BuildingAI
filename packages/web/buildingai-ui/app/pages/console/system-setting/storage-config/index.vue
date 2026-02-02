<script setup lang="ts">
import {
    apiGetStorageConfigList,
    type StorageConfig,
    type StorageConfigTableData,
    StorageType,
} from "@buildingai/service/consoleapi/storage-config";
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";

import AliCloudConfig from "./components/ali-cloud-config.vue";
import LocalConfig from "./components/local-config.vue";

const { t } = useI18n();

const ossConfigList = shallowRef<StorageConfigTableData[]>([]);
const requestStorageConfigs = async () => {
    ossConfigList.value = await apiGetStorageConfigList();
};
onMounted(requestStorageConfigs);

const columns: TableColumn<StorageConfigTableData>[] = [
    {
        accessorKey: "storageType",
        header: t("storage-config.table.storageType"),
        cell: ({ row }) => {
            return t(`storage-config.storage.${row.original.storageType}`);
        },
    },
    {
        accessorKey: "storageLocation",
        header: t("storage-config.table.storageLocation"),
        cell: ({ row }) => {
            return t(`storage-config.location.${row.original.storageType}`);
        },
    },
    {
        accessorKey: "isActive",
        header: t("storage-config.table.status"),
    },
    {
        accessorKey: "action",
        header: t("storage-config.table.action"),
        cell: ({ row }) => {
            switch (row.original.storageType) {
                case StorageType.LOCAL: {
                    const data = row.original as StorageConfig<typeof StorageType.LOCAL>;
                    return h(LocalConfig, {
                        data,
                        onUpdate: requestStorageConfigs,
                    });
                }
                case StorageType.OSS: {
                    const data = row.original as StorageConfig<typeof StorageType.OSS>;
                    return h(AliCloudConfig, {
                        data,
                        onUpdate: requestStorageConfigs,
                    });
                }
                default:
                    return t("storage-config.noSupport");
            }
        },
    },
];
</script>
<template>
    <div>
        <UAlert
            color="primary"
            variant="subtle"
            class="mb-4 whitespace-pre-line"
            :title="$t('storage-config.alter.title')"
            :description="$t('storage-config.alter.content')"
        ></UAlert>
        <UTable
            :columns="columns"
            :data="ossConfigList"
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: '[&:has(>td[colspan])]:hidden',
            }"
        >
            <template #isActive-cell="{ row }">
                <UBadge
                    :variant="row.original.isActive ? 'solid' : 'outline'"
                    :color="row.original.isActive ? 'primary' : 'neutral'"
                >
                    {{
                        row.original.isActive
                            ? $t("storage-config.table.enabled")
                            : $t("storage-config.table.disabled")
                    }}
                </UBadge>
            </template>
        </UTable>
    </div>
</template>
