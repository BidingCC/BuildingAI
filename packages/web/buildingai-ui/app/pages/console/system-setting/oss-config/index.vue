<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

const { t } = useI18n();

interface OssConfig {
    id: string;
    storeWay: string;
    storeLocation: string;
    enabled: boolean;
}

const columns: TableColumn<OssConfig>[] = [
    {
        accessorKey: "storeWay",
        header: t("oss-config.table.storeWay"),
    },
    {
        accessorKey: "storeLocation",
        header: t("oss-config.table.storeLocation"),
    },
    {
        accessorKey: "enabled",
        header: t("oss-config.table.status"),
    },
    {
        accessorKey: "action",
        header: t("oss-config.table.action"),
    },
];
const ossConfigList: OssConfig[] = [
    {
        id: "1",
        storeWay: "ABC",
        storeLocation: "stored in a location on OSS",
        enabled: true,
    },
    {
        id: "2",
        storeWay: "DEF",
        storeLocation: "stored in a location on OSS",
        enabled: false,
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
            <template #enabled-cell="{ row }">
                <UBadge
                    :variant="row.original.enabled ? 'solid' : 'outline'"
                    :color="row.original.enabled ? 'primary' : 'neutral'"
                    >{{
                        row.original.enabled
                            ? $t("oss-config.table.enabled")
                            : $t("oss-config.table.disabled")
                    }}</UBadge
                >
            </template>
            <template #action-cell>
                <UButton class="cursor-pointer" variant="ghost">{{
                    $t("oss-config.table.setting")
                }}</UButton>
            </template>
        </UTable>
    </div>
</template>
