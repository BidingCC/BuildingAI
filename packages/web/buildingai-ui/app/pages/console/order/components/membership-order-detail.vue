<script setup lang="ts">
import {
    OrderStatus,
    OrderStatusReverse,
    RefundStatus,
} from "@buildingai/constants/shared/payconfig.constant";
import type { MembershipOrderDetailData } from "@buildingai/service/consoleapi/order-membership";
import {
    apiMembershipOrderRefund,
    apiSyncMembershipPayResult,
    apiSyncMembershipRefundResult,
} from "@buildingai/service/consoleapi/order-membership";

const props = defineProps<{
    order?: MembershipOrderDetailData | null;
}>();

const emits = defineEmits<{
    (e: "close"): void;
    (e: "get-list"): void;
    (e: "sync-done", detail: MembershipOrderDetailData): void;
}>();

const currentOrder = ref<MembershipOrderDetailData | null>(props.order ?? null);
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

/**
 * 处理退款操作
 */
const handleRefund = async () => {
    await useModal({
        title: t("order.backend.membership.detail.refund"),
        description: t("console-common.confirmRefund"),
        color: "warning",
    });

    await apiMembershipOrderRefund(currentOrder.value?.id || "");
    toast.success(t("console-common.refundSuccess"));
    getOrderList();
    emits("close");
};

/**
 * 刷新订单列表
 */
const getOrderList = () => {
    emits("get-list");
};

const syncing = ref<"pay" | "refund" | null>(null);
const handleSyncPayResult = async () => {
    if (!currentOrder.value?.id) return;
    syncing.value = "pay";
    try {
        const res = await apiSyncMembershipPayResult(currentOrder.value.id);
        currentOrder.value = res;
        emits("sync-done", res);
        toast.success(t("order.backend.membership.detail.syncPaySuccess"));
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
        const res = await apiSyncMembershipRefundResult(currentOrder.value.id);
        currentOrder.value = res;
        emits("sync-done", res);
        toast.success(t("order.backend.membership.detail.syncRefundSuccess"));
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
            <!-- 订单号 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.orderNo") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.orderNo }}
                </div>
            </div>
            <!-- 订单来源 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.orderSource") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.terminalDesc }}
                </div>
            </div>
            <!-- 用户信息 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.userInfo") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.user?.nickname }}
                </div>
            </div>
            <!-- 订单类型 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.orderType") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.orderType }}
                </div>
            </div>
            <!-- 订单状态 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.recharge.detail.orderStatus") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ orderStatusLabel }}
                </div>
            </div>
            <!-- 会员套餐 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.planName") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.plan?.name }}
                </div>
            </div>
            <!-- 会员等级 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.levelName") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.level?.name }}
                </div>
            </div>
            <!-- 会员时长 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.duration") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.duration }}
                </div>
            </div>
            <!-- 订单金额 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.orderAmount") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">¥{{ currentOrder?.orderAmount }}</div>
            </div>
            <!-- 支付状态 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.paymentStatus") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{
                        currentOrder?.payState === 1
                            ? t("order.backend.membership.detail.paid")
                            : t("order.backend.membership.detail.unpaid")
                    }}
                </div>
            </div>
            <!-- 支付方式 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.paymentMethod") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.payTypeDesc }}
                </div>
            </div>
            <!-- 下单时间 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.createdAt") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    <TimeDisplay
                        v-if="currentOrder?.createdAt"
                        :datetime="currentOrder.createdAt"
                        mode="datetime"
                    />
                </div>
            </div>
            <!-- 支付时间 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.paidAt") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    <TimeDisplay v-if="currentOrder?.payTime" :datetime="currentOrder.payTime" mode="datetime" />
                    <span v-else>-</span>
                </div>
            </div>
            <!-- 退款状态 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.refundStatus") }}
                </div>
                <div v-if="currentOrder?.refundStatus" class="mt-1 truncate text-red-500">
                    {{ currentOrder?.refundStatusDesc }}
                </div>
                <div v-else class="text-secondary-foreground mt-1 truncate">-</div>
            </div>
            <!-- 退款流水号 -->
            <div v-if="currentOrder?.refundStatus">
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.serialNumber") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ currentOrder?.refundNo }}
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex flex-wrap items-center justify-end gap-2">
                <UButton
                    v-if="currentOrder?.orderStatus === OrderStatus.CREATED"
                    color="neutral"
                    variant="soft"
                    :loading="syncing === 'pay'"
                    @click="handleSyncPayResult"
                >
                    {{ t("order.backend.membership.detail.syncPayResult") }}
                </UButton>
                <UButton
                    v-if="currentOrder?.refundStatus === RefundStatus.ING"
                    color="neutral"
                    variant="soft"
                    :loading="syncing === 'refund'"
                    @click="handleSyncRefundResult"
                >
                    {{ t("order.backend.membership.detail.syncRefundResult") }}
                </UButton>
                <UButton
                    v-if="
                        currentOrder?.refundStatus === RefundStatus.NONE &&
                        currentOrder?.payState === 1
                    "
                    color="primary"
                    @click="handleRefund"
                >
                    {{ t("order.backend.membership.detail.refund") }}
                </UButton>
                <UButton color="neutral" variant="soft" @click="emits('close')">
                    {{ t("order.backend.membership.detail.close") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
