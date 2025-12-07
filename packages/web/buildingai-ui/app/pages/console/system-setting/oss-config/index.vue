<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";

import AliCloudConfig from "./components/ali-cloud-config.vue";
import LocalConfig from "./components/local-config.vue";

const { t } = useI18n();

interface OssConfig {
    id: string;
    storageType: string;
    storageLocation: string;
    isActive: boolean;
}

const columns: TableColumn<OssConfig>[] = [
    {
        accessorKey: "storageType",
        header: t("oss-config.table.storageType"),
    },
    {
        accessorKey: "storageLocation",
        header: t("oss-config.table.storageLocation"),
    },
    {
        accessorKey: "isActive",
        header: t("oss-config.table.status"),
    },
    {
        accessorKey: "action",
        header: t("oss-config.table.action"),
        cell: ({ row }) => {
            switch (row.original.storageType) {
                case "local":
                    return h(LocalConfig);
                case "ali-cloud":
                    return h(AliCloudConfig);
            }

            return null;
        },
    },
];
const ossConfigList: OssConfig[] = [
    {
        id: "1",
        storageType: "local",
        storageLocation: "stored in a location on OSS",
        isActive: true,
    },
    {
        id: "2",
        storageType: "ali-cloud",
        storageLocation: "stored in a location on OSS",
        isActive: false,
    },
];
</script>
<template>
    <div>
        <UAlert
            color="primary"
            variant="subtle"
            class="mb-4 whitespace-pre-line"
            :title="$t('oss-config.alter.title')"
            :description="$t('oss-config.alter.content')"
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
                            ? $t("oss-config.table.enabled")
                            : $t("oss-config.table.disabled")
                    }}
                </UBadge>
            </template>
        </UTable>
    </div>
</template>
