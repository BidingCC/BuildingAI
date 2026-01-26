<script setup lang="ts">
import type { MembershipOrderDetailData } from "@buildingai/service/consoleapi/order-membership";
import { apiMembershipOrderRefund } from "@buildingai/service/consoleapi/order-membership";

const props = defineProps<{
    order?: MembershipOrderDetailData | null;
}>();

const emits = defineEmits<{
    (e: "close"): void;
    (e: "get-list"): void;
}>();

const { t } = useI18n();
const toast = useMessage();

/**
 * 处理退款操作
 */
const handleRefund = async () => {
    await useModal({
        title: t("order.backend.membership.detail.refund"),
        description: t("console-common.confirmRefund"),
        color: "warning",
    });

    await apiMembershipOrderRefund(props.order?.id || "");
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
                    {{ order?.orderNo }}
                </div>
            </div>
            <!-- 订单来源 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.orderSource") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.terminalDesc }}
                </div>
            </div>
            <!-- 用户信息 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.userInfo") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.user?.nickname }}
                </div>
            </div>
            <!-- 订单类型 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.orderType") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.orderType }}
                </div>
            </div>
            <!-- 会员套餐 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.planName") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.plan?.name }}
                </div>
            </div>
            <!-- 会员等级 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.levelName") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.level?.name }}
                </div>
            </div>
            <!-- 会员时长 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.duration") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.duration }}
                </div>
            </div>
            <!-- 订单金额 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.list.orderAmount") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">¥{{ order?.orderAmount }}</div>
            </div>
            <!-- 支付状态 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.paymentStatus") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{
                        order?.payState === 1
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
                    {{ order?.payTypeDesc }}
                </div>
            </div>
            <!-- 下单时间 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.createdAt") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    <TimeDisplay
                        v-if="order?.createdAt"
                        :datetime="order.createdAt"
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
                    <TimeDisplay v-if="order?.payTime" :datetime="order.payTime" mode="datetime" />
                    <span v-else>-</span>
                </div>
            </div>
            <!-- 退款状态 -->
            <div>
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.refundStatus") }}
                </div>
                <div v-if="order?.refundStatus" class="mt-1 truncate text-red-500">
                    {{ order?.refundStatusDesc }}
                </div>
                <div v-else class="text-secondary-foreground mt-1 truncate">-</div>
            </div>
            <!-- 退款流水号 -->
            <div v-if="order?.refundStatus">
                <div class="text-muted-foreground text-sm">
                    {{ t("order.backend.membership.detail.serialNumber") }}
                </div>
                <div class="text-secondary-foreground mt-1 truncate">
                    {{ order?.refundNo }}
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-2">
                <UButton
                    v-if="order?.refundStatus === 0 && order?.payState === 1"
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
