<script setup lang="ts">
import {
    OrderStatus,
    OrderStatusReverse,
    RefundStatus,
} from "@buildingai/constants/shared/payconfig.constant";
import type { OrderDetailData } from "@buildingai/service/consoleapi/order-recharge";
import {
    apiRefund,
    apiSyncPayResult,
    apiSyncRefundResult,
} from "@buildingai/service/consoleapi/order-recharge";

import type { TableColumn } from "#ui/types";

interface Order {
    rechargeQuantity?: number;
    freeQuantity?: number;
    quantityReceived?: number;
    paidInAmount?: string;
}

const props = defineProps<{
    order?: OrderDetailData | null;
}>();

const emits = defineEmits<{
    (e: "close"): void;
    (e: "get-list"): void;
    (e: "sync-done", detail: OrderDetailData): void;
}>();

const currentOrder = ref<OrderDetailData | null>(props.order ?? null);
watch(
    () => props.order,
    (v) => {
        currentOrder.value = v ?? null;
    },
    { immediate: true },
);

const { t } = useI18n();
const toast = useMessage();

/** 订单状态展示（OrderStatusReverse 枚举取值） */
const orderStatusLabel = computed(() => {
    const key = (currentOrder.value?.orderStatus ??
        OrderStatus.CREATED) as keyof typeof OrderStatusReverse;
    return OrderStatusReverse[key];
});

const tableData = computed<Order[]>(() => [
    {
        rechargeQuantity: currentOrder.value?.power,
        freeQuantity: currentOrder.value?.givePower,
        quantityReceived: currentOrder.value?.totalPower,
        paidInAmount: currentOrder.value?.orderAmount,
    },
]);

const columns: TableColumn<Order>[] = [
    {
        id: "rechargeQuantity",
        header: t("order.backend.recharge.list.rechargeQuantity"),
        cell: ({ row }) => row.original.rechargeQuantity,
    },

    {
        id: "freeQuantity",
        header: t("order.backend.recharge.list.freeQuantity"),
        cell: ({ row }) => row.original.freeQuantity,
    },
    {
        id: "quantityReceived",
        header: t("order.backend.recharge.list.quantityReceived"),
        cell: ({ row }) => row.original.quantityReceived,
    },
    {
        id: "paidInAmount",
        accessorKey: "paidInAmount",
        header: t("order.backend.recharge.list.paidInAmount"),
        cell: ({ row }) => {
            const paidInAmount = Number.parseFloat(row.getValue("paidInAmount"));
            const formattedPaidInAmount = new Intl.NumberFormat("zh-CN", {
                style: "currency",
                currency: "CNY",
            }).format(paidInAmount);
            return formattedPaidInAmount;
        },
    },
];
const handleRefund = async () => {
    await useModal({
        title: "退款",
        description: "是否确定退款？",
        color: "warning",
    });

    await apiRefund(currentOrder.value?.id || "");
    toast.success("退款已提交，请等待退款成功");
    getOrderList();
    emits("close");
};

const getOrderList = () => {
    emits("get-list");
};

const syncing = ref<"pay" | "refund" | null>(null);
const handleSyncPayResult = async () => {
    if (!currentOrder.value?.id) return;
    syncing.value = "pay";
    try {
        const res = await apiSyncPayResult(currentOrder.value.id);
        currentOrder.value = res;
        emits("sync-done", res);
        toast.success(t("order.backend.recharge.detail.syncPaySuccess"));
    } catch (e) {
        toast.error((e as Error)?.message ?? "同步失败");
    } finally {
        syncing.value = null;
    }
};
const handleSyncRefundResult = async () => {
    if (!currentOrder.value?.id) return;
    syncing.value = "refund";
    try {
        const res = await apiSyncRefundResult(currentOrder.value.id);
        currentOrder.value = res;
        emits("sync-done", res);
        toast.success(t("order.backend.recharge.detail.syncRefundSuccess"));
    } catch (e) {
        toast.error((e as Error)?.message ?? "同步失败");
    } finally {
        syncing.value = null;
    }
};
</script>

<template>
    <BdModal @close="emits('close')">
        <div class="grid grid-cols-1 gap-x-6 gap-y-5 py-4 pb-4 md:grid-cols-2">
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.list.orderNo") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.orderNo }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.orderSource") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.terminalDesc }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.userInfo") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.user?.username }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.orderType") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.orderType }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.orderStatus") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ orderStatusLabel }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.paymentStatus") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{
                        currentOrder?.payStatus === 1
                            ? t("order.backend.recharge.detail.paid")
                            : t("order.backend.recharge.detail.unpaid")
                    }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.paymentMethod") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.payTypeDesc }}
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.createdAt") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    <TimeDisplay
                        v-if="currentOrder?.createdAt"
                        :datetime="currentOrder.createdAt"
                        mode="datetime"
                    />
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.paidAt") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    <TimeDisplay
                        v-if="currentOrder?.payTime"
                        :datetime="currentOrder.payTime"
                        mode="datetime"
                    />
                    <span v-else>-</span>
                </div>
            </div>
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.refundStatus") }}
                </div>
                <div v-if="currentOrder?.refundStatus" class="mt-1 truncate text-red-500">
                    {{ currentOrder?.refundStatusDesc }}
                </div>
                <div v-else class="text-secondary-foreground mt-1 truncate">-</div>
            </div>
            <div v-if="currentOrder?.refundStatus">
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.serialNumber") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.refundNo }}
                </div>
            </div>
        </div>
        <UTable ref="table" :data="tableData" :columns="columns" class="flex-1"></UTable>

        <template #footer>
            <div class="flex flex-wrap items-center justify-end gap-2">
                <UButton
                    v-if="currentOrder?.orderStatus === OrderStatus.CREATED"
                    color="neutral"
                    variant="soft"
                    :loading="syncing === 'pay'"
                    @click="handleSyncPayResult"
                >
                    {{ t("order.backend.recharge.detail.syncPayResult") }}
                </UButton>
                <UButton
                    v-if="currentOrder?.refundStatus === RefundStatus.ING"
                    color="neutral"
                    variant="soft"
                    :loading="syncing === 'refund'"
                    @click="handleSyncRefundResult"
                >
                    {{ t("order.backend.recharge.detail.syncRefundResult") }}
                </UButton>
                <UButton
                    v-if="currentOrder?.refundStatus === 0 && currentOrder?.payStatus === 1"
                    color="primary"
                    @click="handleRefund"
                    >{{ t("order.backend.recharge.detail.refund") }}</UButton
                >
                <UButton color="neutral" variant="soft" @click="emits('close')">
                    {{ t("order.backend.recharge.detail.close") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
