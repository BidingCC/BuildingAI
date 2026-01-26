<script setup lang="ts">
import type {
    OrderDetailData,
    OrderListItem,
    Statistics,
} from "@buildingai/service/consoleapi/order-recharge";
import {
    apiGetOrderDetail,
    apiGetOrderList,
    apiRefund,
} from "@buildingai/service/consoleapi/order-recharge";
import { type Row } from "@tanstack/table-core";

import type { TableColumn } from "#ui/types";

const OrderDetail = defineAsyncComponent(() => import("./components/order-detail.vue"));

const TimeDisplay = resolveComponent("TimeDisplay");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();
const toast = useMessage();
const overlay = useOverlay();

const statistics = shallowRef<Statistics>({
    totalAmount: 0,
    totalIncome: 0,
    totalOrder: 0,
    totalRefundAmount: 0,
    totalRefundOrder: 0,
});

const statisticsItems = [
    {
        key: "totalOrder",
        unit: "console-common.unit",
        label: "order.backend.recharge.rechargeCount",
    },
    {
        key: "totalAmount",
        unit: "console-common.yuan",
        label: "order.backend.recharge.totalRechargeAmount",
    },
    {
        key: "totalRefundOrder",
        unit: "console-common.unit",
        label: "order.backend.recharge.refundCount",
    },
    {
        key: "totalRefundAmount",
        unit: "console-common.yuan",
        label: "order.backend.recharge.totalRefundAmount",
    },
    {
        key: "totalIncome",
        unit: "console-common.yuan",
        label: "order.backend.recharge.netIncome",
    },
] as const;

const searchForm = shallowReactive({
    keyword: "",
    orderNo: "",
    payType: undefined as string | undefined,
    payStatus: undefined as string | undefined,
    refundStatus: undefined as string | undefined,
});

const { paging, getLists, resetPage } = usePaging<OrderListItem>({
    fetchFun: apiGetOrderList,
    params: searchForm,
});

// 列定义
const columns: TableColumn<OrderListItem>[] = [
    {
        accessorKey: "orderNo",
        header: t("order.backend.recharge.list.orderNo"),
    },
    {
        accessorKey: "user",
        header: t("order.backend.recharge.list.user"),
    },
    {
        accessorKey: "power",
        header: t("order.backend.recharge.list.rechargeQuantity"),
    },
    {
        accessorKey: "givePower",
        header: t("order.backend.recharge.list.freeQuantity"),
    },
    {
        accessorKey: "totalPower",
        header: t("order.backend.recharge.list.quantityReceived"),
    },
    {
        accessorKey: "orderAmount",
        header: t("order.backend.recharge.list.paidInAmount"),
        cell: ({ row }) => {
            const paidInAmount = Number.parseFloat(row.getValue("orderAmount"));
            const formattedPaidInAmount = new Intl.NumberFormat("zh-CN", {
                style: "currency",
                currency: "CNY",
            }).format(paidInAmount);
            return formattedPaidInAmount;
        },
    },
    {
        accessorKey: "payTypeDesc",
        header: t("order.backend.recharge.list.paymentMethod"),
    },
    {
        accessorKey: "paymentStatus",
        header: t("order.backend.recharge.list.paymentStatus"),
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: t("order.backend.recharge.list.createdAt"),
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
        header: () => t("order.backend.recharge.list.actions"),
        size: 40, // 固定宽度
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
        title: t("order.backend.recharge.list.refund"),
        description: t("console-common.confirmRefund"),
        color: "warning",
    });
    await apiRefund(id || "");
    getLists(); // 使用 usePaging 的 getLists 方法
    toast.success(t("console-common.refundSuccess"));
};

// 操作栏
function getRowItems(row: Row<OrderListItem>) {
    return [
        hasAccessByCodes(["recharge-order:detail"])
            ? {
                  label: t("order.backend.recharge.list.viewDetails"),
                  icon: "i-lucide-eye",
                  color: "info",
                  onClick: () => {
                      getOrderDetail(row.original.id);
                  },
              }
            : null,
        row.original.payStatus === 1 &&
        hasAccessByCodes(["recharge-order:refund"]) &&
        row.original.refundStatus === 0
            ? {
                  label: t("order.backend.recharge.list.refund"),
                  icon: "tabler:arrow-back",
                  color: "error",
                  onSelect() {
                      // 调用退款接口
                      refund(row.original.id);
                  },
              }
            : null,
    ].filter(Boolean);
}

// 设置操作列固定在右侧
const columnPinning = ref({
    left: [],
    right: ["actions"],
});

// Computed property for payment type options
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

watch(
    () => paging.extend as { statistics: Statistics },
    (extend: { statistics: Statistics }) => {
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
        const res = await apiGetOrderDetail(id);
        mountOrderDetailModal(res);
    } catch (error) {
        console.error(error);
    }
};

/**
 * 挂载订单详情模态框
 * @param order 订单详情数据
 */
const mountOrderDetailModal = (order: OrderDetailData): void => {
    const modal = overlay.create(OrderDetail);

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
 * 处理 "all" 值并重置分页
 */
const handleSelectChange = (): void => {
    if (searchForm.payType === "all") {
        searchForm.payType = undefined;
    }
    if (searchForm.payStatus === "all") {
        searchForm.payStatus = undefined;
    }
    if (searchForm.refundStatus === "all") {
        searchForm.refundStatus = undefined;
    }
    resetPage();
};

onMounted(() => getLists());
</script>

<template>
    <div class="flex h-full flex-col space-y-4 pb-6">
        <!-- 信息卡片 -->
        <div class="grid grid-cols-2 gap-4 pt-px md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <UCard v-for="(item, index) in statisticsItems" :key="index">
                <div class="flex items-center justify-center">
                    <div class="flex flex-col items-center">
                        <div>
                            <span class="text-2xl font-bold">
                                {{ statistics[item.key as keyof Statistics] }}
                            </span>
                            <span class="text-muted-foreground ml-1 text-xs">
                                {{ t(item.unit) }}
                            </span>
                        </div>
                        <div class="text-muted-foreground text-xs">
                            {{ t(item.label) }}
                        </div>
                    </div>
                </div>
            </UCard>
        </div>
        <!-- 订单列表 -->
        <div class="flex flex-1 flex-col overflow-hidden">
            <div class="h-fit py-5">
                <div class="flex items-center space-x-2">
                    <UInput
                        :placeholder="t('order.backend.recharge.list.searchOrderNo')"
                        icon="i-heroicons-magnifying-glass"
                        v-model="searchForm.orderNo"
                        @update:modelValue="getLists"
                    />
                    <UInput
                        :placeholder="t('order.backend.recharge.list.searchUser')"
                        icon="i-heroicons-magnifying-glass"
                        v-model="searchForm.keyword"
                        @update:modelValue="getLists"
                    />
                    <USelect
                        class="ml-auto"
                        :placeholder="t('order.backend.recharge.list.paymentMethod')"
                        :items="payTypeOptions"
                        v-model="searchForm.payType"
                        @update:modelValue="handleSelectChange"
                    />
                    <USelect
                        :placeholder="t('order.backend.recharge.list.paymentStatus')"
                        :items="[
                            {
                                label: t('console-common.all'),
                                value: 'all',
                            },
                            {
                                label: t('order.backend.recharge.list.paid'),
                                value: '1',
                            },
                            {
                                label: t('order.backend.recharge.list.unpaid'),
                                value: '0',
                            },
                        ]"
                        v-model="searchForm.payStatus"
                        @update:modelValue="handleSelectChange"
                    />
                    <USelect
                        :placeholder="t('order.backend.recharge.list.refundStatus')"
                        :items="[
                            {
                                label: t('console-common.all'),
                                value: 'all',
                            },
                            {
                                label: t('order.backend.recharge.list.refunded'),
                                value: '1',
                            },
                            {
                                label: t('order.backend.recharge.list.notRefunded'),
                                value: '0',
                            },
                        ]"
                        v-model="searchForm.refundStatus"
                        @update:modelValue="handleSelectChange"
                    />
                </div>
            </div>

            <UTable
                ref="table"
                sticky
                :data="paging.items"
                :loading="paging.loading"
                :columns="columns"
                v-model:column-pinning="columnPinning"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                    td: 'border-b border-default',
                    tr: '[&:has(>td[colspan])]:hidden',
                }"
                class=""
            >
                <template #user-cell="{ row }">
                    <UAvatar v-if="row.original.user?.avatar" :src="row.original.user?.avatar" />
                    <UAvatar v-else icon="i-heroicons-user" :name="row.original.user?.username" />
                    {{ row.original.user?.nickname }}
                </template>
                <template #paymentStatus-cell="{ row }">
                    <div class="flex flex-col items-start">
                        <div class="flex flex-col items-center">
                            <div
                                v-if="row.original.refundStatus === 1"
                                class="text-muted-foreground mb-1 flex justify-center text-xs font-medium"
                            >
                                {{ t("order.backend.recharge.list.paid") }}
                            </div>
                            <UBadge
                                :color="
                                    row.original.refundStatus === 1
                                        ? 'warning'
                                        : row.original.payStatus === 1
                                          ? 'success'
                                          : 'error'
                                "
                            >
                                {{
                                    row.original.refundStatus === 1
                                        ? t("order.backend.recharge.list.refunded")
                                        : row.original.payStatus === 1
                                          ? t("order.backend.recharge.list.paid")
                                          : t("order.backend.recharge.list.unpaid")
                                }}
                            </UBadge>
                        </div>
                    </div>
                </template>
                <template #actions-cell="{ row }">
                    <UDropdownMenu :items="getRowItems(row)">
                        <UButton
                            icon="i-lucide-ellipsis-vertical"
                            color="neutral"
                            variant="ghost"
                            aria-label="Actions"
                        />
                    </UDropdownMenu>
                </template>
            </UTable>

            <!-- 分页 -->
            <div
                class="border-default mt-auto flex items-center justify-between gap-3 border-t pt-4"
            >
                <div class="text-muted flex items-center gap-2 text-sm">
                    <span
                        >{{ t("console-common.total") }} {{ paging.total }}
                        {{ t("console-common.items") }}</span
                    >
                    <USelect
                        v-model="paging.pageSize"
                        size="lg"
                        :items="[
                            {
                                label:
                                    '10 ' +
                                    t('console-common.items') +
                                    '/' +
                                    t('console-common.page'),
                                value: 10,
                            },
                            {
                                label:
                                    '20 ' +
                                    t('console-common.items') +
                                    '/' +
                                    t('console-common.page'),
                                value: 20,
                            },
                            {
                                label:
                                    '50 ' +
                                    t('console-common.items') +
                                    '/' +
                                    t('console-common.page'),
                                value: 50,
                            },
                            {
                                label:
                                    '100 ' +
                                    t('console-common.items') +
                                    '/' +
                                    t('console-common.page'),
                                value: 100,
                            },
                        ]"
                        class="w-28"
                        @change="getLists"
                    />
                </div>
                <div class="flex items-center gap-1.5">
                    <BdPagination
                        v-model:page="paging.page"
                        v-model:size="paging.pageSize"
                        show-edges
                        :total="paging.total"
                        @change="getLists"
                    />
                    <div class="text-muted flex items-center gap-2 text-sm">
                        <span>{{ t("console-common.goTo") }}</span>
                        <UInput
                            v-model="paging.page"
                            size="lg"
                            type="number"
                            class="w-18"
                            @change="getLists"
                        />
                        <span>{{ t("console-common.page") }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
