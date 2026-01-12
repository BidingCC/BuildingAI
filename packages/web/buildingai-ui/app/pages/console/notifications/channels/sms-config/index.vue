<script setup lang="ts">
import { type SmsConfig } from "@buildingai/constants/shared/sms.constant";
import { apiGetSmsConfigList } from "@buildingai/service/consoleapi/sms-config";
import type { TableColumn } from "@nuxt/ui";
import { h } from "vue";

import SmsConfigModal from "./components/sms-config-modal.vue";

const { t } = useI18n();

const smsConfigList = shallowRef<SmsConfig[]>([]);

const loadSmsConfigs = async () => {
    smsConfigList.value = await apiGetSmsConfigList();
};

onMounted(loadSmsConfigs);

const columns: TableColumn<SmsConfig>[] = [
    {
        accessorKey: "provider",
        header: t("notification.sms.table.provider"),
        cell: ({ row }) => {
            return t(`notification.sms.provider.${row.original.provider}`);
        },
    },
    {
        accessorKey: "isActive",
        header: t("notification.sms.table.status"),
    },
    {
        accessorKey: "action",
        header: t("notification.sms.table.action"),
        cell: ({ row }) => {
            return h(SmsConfigModal, {
                data: row.original,
                onUpdate: loadSmsConfigs,
            });
        },
    },
];
</script>

<template>
    <div>
        <UAlert
            color="primary"
            variant="subtle"
            class="mb-4"
            :title="t('notification.sms.title')"
            :description="t('notification.sms.description')"
        />

        <UTable
            :columns="columns"
            :data="smsConfigList"
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
                    :variant="row.original.enable ? 'solid' : 'outline'"
                    :color="row.original.enable ? 'primary' : 'neutral'"
                >
                    {{
                        row.original.enable
                            ? t("notification.sms.status.enabled")
                            : t("notification.sms.status.disabled")
                    }}
                </UBadge>
            </template>
        </UTable>
    </div>
</template>
