<script setup lang="ts">
import { apiGetUserSubscriptionRecords } from "@buildingai/service/consoleapi/user";
import type { TableColumn } from "@nuxt/ui";
import { h, onMounted, reactive, ref } from "vue";

const { t } = useI18n();

interface Props {
    userId: string;
}

const props = defineProps<Props>();

const toast = useMessage();

const isOpen = ref(true);

const close = () => {
    isOpen.value = false;
};

const open = () => {
    isOpen.value = true;
};

defineExpose({ open, close });

interface UserSubscriptionItem {
    id: string;
    level: {
        id: string;
        name: string;
        icon: string;
        level: number;
    } | null;
    startTime: string;
    endTime: string;
    source: number;
    sourceDesc: string;
    duration: string | null;
    refundStatus: number;
    isExpired: boolean;
    isActive: boolean;
    createdAt: string;
}

const loading = ref(false);
const subscriptions = ref<UserSubscriptionItem[]>([]);

const pagination = reactive({
    page: 1,
    pageSize: 10,
    total: 0,
});

const TimeDisplay = resolveComponent("TimeDisplay");
const UBadge = resolveComponent("UBadge");

const columns = computed<TableColumn<UserSubscriptionItem>[]>(() => [
    {
        accessorKey: "level",
        header: t("user.backend.subscriptionRecords.level"),
        cell: ({ row }) => {
            const level = row.original.level;
            if (!level) {
                return h("span", "-");
            }
            return h("span", level.name);
        },
    },
    {
        accessorKey: "duration",
        header: t("user.backend.subscriptionRecords.duration"),
        cell: ({ row }) => {
            const duration = row.original.duration;
            return h("span", duration || "-");
        },
    },
    {
        accessorKey: "endTime",
        header: t("user.backend.subscriptionRecords.validity"),
        cell: ({ row }) => {
            const endTime = row.original.endTime;
            if (!endTime) {
                return h("span", "-");
            }
            return h(TimeDisplay, { datetime: endTime, mode: "datetime" });
        },
    },
    {
        accessorKey: "sourceDesc",
        header: t("user.backend.subscriptionRecords.source"),
        cell: ({ row }) => {
            return h("span", row.original.sourceDesc);
        },
    },
    {
        accessorKey: "createdAt",
        header: t("user.backend.subscriptionRecords.recordTime"),
        cell: ({ row }) => {
            return h(TimeDisplay, { datetime: row.original.createdAt, mode: "datetime" });
        },
    },
    {
        accessorKey: "refundStatus",
        header: t("user.backend.subscriptionRecords.refundStatus"),
        cell: ({ row }) => {
            const refundStatus = row.original.refundStatus;
            const statusText =
                refundStatus === 1
                    ? t("user.backend.subscriptionRecords.refunded")
                    : t("user.backend.subscriptionRecords.notRefunded");
            return h(
                UBadge,
                {
                    color: refundStatus === 1 ? "warning" : "neutral",
                    variant: "soft",
                },
                () => statusText,
            );
        },
    },
]);

const loadSubscriptions = async () => {
    loading.value = true;
    try {
        const data = await apiGetUserSubscriptionRecords(props.userId, {
            page: pagination.page,
            pageSize: pagination.pageSize,
        });
        subscriptions.value = data.items;
        pagination.total = data.total;
    } catch (error) {
        console.error(t("user.backend.subscriptionRecords.loadFailed"), error);
        toast.error(t("user.backend.subscriptionRecords.loadFailed"));
    } finally {
        loading.value = false;
    }
};

const handlePaginationChange = () => {
    loadSubscriptions();
};

onMounted(() => {
    loadSubscriptions();
});
</script>

<template>
    <BdModal
        v-model:open="isOpen"
        :title="t('user.backend.subscriptionRecords.title')"
        :ui="{ content: 'max-w-4xl' }"
        :show-footer="false"
    >
        <div
            v-if="loading && subscriptions.length === 0"
            class="flex h-48 items-center justify-center"
        >
            <div class="text-muted-foreground flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
                {{ t("user.backend.subscriptionRecords.loading") }}
            </div>
        </div>

        <div
            v-else-if="!loading && subscriptions.length === 0"
            class="flex h-48 items-center justify-center"
        >
            <div class="text-muted-foreground text-center">
                <UIcon name="i-lucide-inbox" class="mx-auto mb-2 size-12" />
                <p>{{ t("user.backend.subscriptionRecords.empty") }}</p>
            </div>
        </div>

        <UTable
            v-else
            :data="subscriptions"
            :columns="columns"
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 whitespace-nowrap first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: '[&:has(>td[colspan])]:hidden',
            }"
        />

        <div
            v-if="pagination.total > 0"
            class="border-default bg-background sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t py-4"
        >
            <div class="text-muted text-sm">
                {{ t("console-common.total") }} {{ pagination.total }}
                {{ t("console-common.items") }}
            </div>

            <div class="flex items-center gap-1.5">
                <BdPagination
                    v-model:page="pagination.page"
                    v-model:size="pagination.pageSize"
                    :total="pagination.total"
                    @change="handlePaginationChange"
                />
            </div>
        </div>
    </BdModal>
</template>
