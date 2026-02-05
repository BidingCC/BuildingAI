<script setup lang="ts">
import {
    OrderStatus,
    OrderStatusReverse,
    RefundStatus,
} from "@buildingai/constants/shared/payconfig.constant";
import type {
    MembershipOrderDetailData,
    MembershipOrderListItem,
    MembershipOrderStatistics,
} from "@buildingai/service/consoleapi/order-membership";
import {
    apiCloseMembershipOrder,
    apiGetMembershipOrderDetail,
    apiGetMembershipOrderList,
    apiMembershipOrderRefund,
} from "@buildingai/service/consoleapi/order-membership";
import { type Row } from "@tanstack/table-core";

import type { TableColumn } from "#ui/types";

const MembershipOrderDetail = defineAsyncComponent(
    () => import("./components/membership-order-detail.vue"),
);

const TimeDisplay = resolveComponent("TimeDisplay");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UAvatar = resolveComponent("UAvatar");

const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();
const toast = useMessage();
const overlay = useOverlay();

/** 统计数据 */
const statistics = shallowRef<MembershipOrderStatistics>({
    totalAmount: 0,
    totalIncome: 0,
    totalOrder: 0,
    totalRefundAmount: 0,
    totalRefundOrder: 0,
});

/** 统计卡片配置 */
const statisticsItems = [
    {
        key: "totalOrder",
        unit: "console-common.unit",
        label: "order.backend.membership.orderCount",
    },
    {
        key: "totalAmount",
        unit: "console-common.yuan",
        label: "order.backend.membership.totalAmount",
    },
    {
        key: "totalRefundOrder",
        unit: "console-common.unit",
        label: "order.backend.membership.refundCount",
    },
    {
        key: "totalRefundAmount",
        unit: "console-common.yuan",
        label: "order.backend.membership.totalRefundAmount",
    },
    {
        key: "totalIncome",
        unit: "console-common.yuan",
        label: "order.backend.membership.netIncome",
    },
] as const;

/** 搜索表单 */
const searchForm = shallowReactive({
    userKeyword: "",
    orderNo: "",
    payType: undefined as number | undefined,
    payState: undefined as number | undefined,
    refundState: undefined as number | undefined,
    startTime: undefined as string | undefined,
    endTime: undefined as string | undefined,
});

const { paging, getLists, resetPage } = usePaging<MembershipOrderListItem>({
    fetchFun: apiGetMembershipOrderList,
    params: searchForm,
});

/** 表格列定义 */
const columns: TableColumn<MembershipOrderListItem>[] = [
    {
        accessorKey: "orderNo",
        header: t("order.backend.membership.list.orderNo"),
    },
    {
        accessorKey: "user",
        header: t("order.backend.membership.list.user"),
        cell: ({ row }) =>
            h("div", { class: "flex items-center gap-2" }, [
                h(UAvatar, { src: row.original.user.avatar }),
                row.original.user.nickname,
            ]),
    },
    {
        accessorKey: "plan",
        header: t("order.backend.membership.list.planName"),
        cell: ({ row }) => row.original.plan?.name || "-",
    },
    {
        accessorKey: "level",
        header: t("order.backend.membership.list.levelName"),
        cell: ({ row }) => row.original.level?.name || "-",
    },
    {
        accessorKey: "duration",
        header: t("order.backend.membership.list.duration"),
    },
    {
        accessorKey: "orderAmount",
        header: t("order.backend.membership.list.orderAmount"),
        cell: ({ row }) => {
            const amount = Number.parseFloat(row.getValue("orderAmount"));
            return new Intl.NumberFormat("zh-CN", {
                style: "currency",
                currency: "CNY",
            }).format(amount);
        },
    },
    {
        accessorKey: "orderStatus",
        header: "订单状态",
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: t("order.backend.membership.list.createdAt"),
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
    {
        accessorKey: "actions",
        header: () => t("order.backend.membership.list.actions"),
        size: 40,
        enableSorting: false,
        enableHiding: true,
    },
];

/**
 * 处理退款操作
 * @param id 订单ID
 */
const refund = async (id?: string): Promise<void> => {
    await useModal({
        title: t("order.backend.membership.list.refund"),
        description: t("console-common.confirmRefund"),
        color: "warning",
    });
    await apiMembershipOrderRefund(id || "");
    getLists();
    toast.success(t("console-common.refundSuccess"));
};

/**
 * 关闭订单（仅未支付订单）
 */
const closeOrder = async (id?: string): Promise<void> => {
    await useModal({
        title: t("order.backend.recharge.list.closeOrder"),
        description: t("order.backend.recharge.list.closeOrderConfirm"),
        color: "warning",
    });
    await apiCloseMembershipOrder(id || "");
    getLists();
    toast.success(t("order.backend.recharge.list.closeOrderSuccess"));
};

/** 订单状态展示（OrderStatusReverse 枚举取值） */
function getOrderStatusInfo(row: Row<MembershipOrderListItem>) {
    const status = (row.original.orderStatus ??
        OrderStatus.CREATED) as keyof typeof OrderStatusReverse;
    const label = OrderStatusReverse[status];
    const color =
        status === OrderStatus.SUCCESS
            ? ("success" as const)
            : status === OrderStatus.CLOSED
              ? ("neutral" as const)
              : ("error" as const);
    return { label, color };
}

/**
 * 操作栏配置
 */
function getRowItems(row: Row<MembershipOrderListItem>) {
    return [
        hasAccessByCodes(["membership-order:detail"])
            ? {
                  label: t("order.backend.membership.list.viewDetails"),
                  icon: "i-lucide-eye",
                  color: "info",
                  onClick: () => {
                      getOrderDetail(row.original.id);
                  },
              }
            : null,
        row.original.orderStatus === OrderStatus.SUCCESS &&
        hasAccessByCodes(["membership-order:refund"]) &&
        row.original.refundStatus === RefundStatus.NONE
            ? {
                  label: t("order.backend.membership.list.refund"),
                  icon: "tabler:arrow-back",
                  color: "error",
                  onSelect() {
                      refund(row.original.id);
                  },
              }
            : null,
        row.original.orderStatus === OrderStatus.CREATED &&
        hasAccessByCodes(["membership-order:close"])
            ? {
                  label: t("order.backend.recharge.list.closeOrder"),
                  icon: "i-lucide-x-circle",
                  color: "error",
                  onSelect() {
                      closeOrder(row.original.id);
                  },
              }
            : null,
    ].filter(Boolean);
}

/** 固定操作列在右侧 */
const columnPinning = ref({
    left: [],
    right: ["actions"],
});

/** 支付方式选项 */
const payTypeOptions = computed(() => {
    const payTypeLists =
        (paging.extend as { payTypeLists: { name: string; payType: string }[] })?.payTypeLists ||
        [];
    return [
        {
            label: t("console-common.all"),
            value: "all",
        },
        ...payTypeLists.map((item: { name: string; payType: string }) => ({
            label: item.name,
            value: item.payType,
        })),
    ];
});

/** 监听扩展数据变化，更新统计信息 */
watch(
    () => paging.extend as { statistics: MembershipOrderStatistics },
    (extend: { statistics: MembershipOrderStatistics }) => {
        if (extend?.statistics) {
            statistics.value = extend.statistics;
        }
    },
    { deep: true },
);

/**
 * 获取订单详情
 * @param id 订单ID
 */
const getOrderDetail = async (id: string | undefined): Promise<void> => {
    if (!id) return;
    try {
        const res = await apiGetMembershipOrderDetail(id);
        mountOrderDetailModal(res);
    } catch (error) {
        console.error(error);
    }
};

/**
 * 挂载订单详情模态框
 * @param order 订单详情数据
 */
const mountOrderDetailModal = (order: MembershipOrderDetailData): void => {
    const modal = overlay.create(MembershipOrderDetail);

    modal.open({
        order,
        "onGet-list": () => {
            getLists();
        },
        onClose: () => {},
    });
};

/**
 * 处理选择器变更
 */
const handleSelectChange = (): void => {
    if (searchForm.payType === ("all" as unknown as number)) {
        searchForm.payType = undefined;
    }
    if (searchForm.payState === ("all" as unknown as number)) {
        searchForm.payState = undefined;
    }
    if (searchForm.refundState === ("all" as unknown as number)) {
        searchForm.refundState = undefined;
    }
    resetPage();
};

onMounted(() => getLists());
</script>

<template>
    <div class="flex h-full flex-col space-y-4 pb-6">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 gap-4 pt-px md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <UCard v-for="(item, index) in statisticsItems" :key="index">
                <div class="flex items-center justify-center">
                    <div class="flex flex-col items-center">
                        <div>
                            <span class="text-2xl font-bold">
                                {{ statistics[item.key as keyof MembershipOrderStatistics] }}
                            </span>
                            <span class="text-muted-foreground ml-1 text-sm">
                                {{ t(item.unit) }}
                            </span>
                        </div>
                        <span class="text-muted-foreground text-sm">{{ t(item.label) }}</span>
                    </div>
                </div>
            </UCard>
        </div>

        <!-- 搜索区域 -->
        <div class="flex flex-wrap items-center gap-4">
            <UInput
                v-model="searchForm.userKeyword"
                :placeholder="t('order.backend.membership.search.userKeyword')"
                class="w-48"
                @keyup.enter="resetPage"
            />
            <UInput
                v-model="searchForm.orderNo"
                :placeholder="t('order.backend.membership.search.orderNo')"
                class="w-48"
                @keyup.enter="resetPage"
            />
            <BdDateRangePicker
                class="ml-auto"
                v-model:start="searchForm.startTime"
                v-model:end="searchForm.endTime"
                :show-time="true"
                :ui="{ root: 'w-auto sm:w-xs' }"
                @change="getLists"
            />
            <USelect
                v-model="searchForm.payType as unknown as string"
                :items="payTypeOptions"
                :placeholder="t('order.backend.membership.search.payType')"
                class="w-36"
                @update:model-value="handleSelectChange"
            />
            <USelect
                v-model="searchForm.payState"
                :items="[
                    { label: t('console-common.all'), value: 'all' },
                    { label: t('order.backend.membership.detail.paid'), value: 1 },
                    { label: t('order.backend.membership.detail.unpaid'), value: 0 },
                ]"
                :placeholder="t('order.backend.membership.search.payState')"
                class="w-36"
                @update:model-value="handleSelectChange"
            />
            <USelect
                v-model="searchForm.refundState"
                :items="[
                    { label: t('console-common.all'), value: 'all' },
                    { label: t('order.backend.membership.search.refunded'), value: 1 },
                    { label: t('order.backend.membership.search.notRefunded'), value: 0 },
                ]"
                :placeholder="t('order.backend.membership.search.refundState')"
                class="w-36"
                @update:model-value="handleSelectChange"
            />
        </div>

        <!-- 订单列表 -->
        <UTable
            :data="paging.items"
            :columns="columns"
            :loading="paging.loading"
            :column-pinning="columnPinning"
            sticky
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: '[&:has(>td[colspan])]:hidden',
            }"
            class="flex-1"
        >
            <template #orderStatus-cell="{ row }">
                <div class="flex flex-col items-center justify-center gap-1">
                    <div
                        v-if="row.original.refundStatus === RefundStatus.ING"
                        class="text-xs text-amber-500"
                    >
                        退款中
                    </div>
                    <div
                        v-else-if="row.original.refundStatus === RefundStatus.SUCCESS"
                        class="text-xs text-red-500"
                    >
                        已退款
                    </div>
                    <UBadge :color="getOrderStatusInfo(row).color">
                        {{ getOrderStatusInfo(row).label }}
                    </UBadge>
                </div>
            </template>
            <template #actions-cell="{ row }">
                <UDropdownMenu :items="[getRowItems(row)]">
                    <UButton
                        icon="i-lucide-ellipsis"
                        color="neutral"
                        variant="ghost"
                        aria-label="Actions"
                    />
                </UDropdownMenu>
            </template>
        </UTable>

        <!-- 分页 -->
        <div class="flex items-center justify-end gap-4">
            <span class="text-muted-foreground text-sm">
                {{ t("console-common.total") }} {{ paging.total }} {{ t("console-common.items") }}
            </span>
            <UPagination
                v-model="paging.page"
                :items-per-page="paging.pageSize"
                :total="paging.total"
                @update:model-value="getLists"
            />
        </div>
    </div>
</template>
