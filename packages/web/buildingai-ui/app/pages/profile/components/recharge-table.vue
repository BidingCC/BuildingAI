<script lang="ts" setup>
import type { PurchaseRecordItem } from "@buildingai/service/webapi/purchase-record";
import { apiPurchaseRecord } from "@buildingai/service/webapi/purchase-record";

import type { TableColumn } from "#ui/types";

const { t } = useI18n();
const TimeDisplay = resolveComponent("TimeDisplay");
const { paging, getLists } = usePaging({ fetchFun: apiPurchaseRecord });

/** 组件挂载时获取数据 */
onMounted(() => {
    getLists();
});

/**
 * 充值记录表格列配置
 */
const columns: TableColumn<PurchaseRecordItem>[] = [
    {
        accessorKey: "orderNo",
        header: t("order.frontend.recharge.list.orderNo"),
        cell: ({ row }) => row.original.orderNo,
    },
    {
        accessorKey: "power",
        header: t("order.frontend.recharge.list.rechargeQuantity"),
        cell: ({ row }) => row.original.power,
    },
    {
        accessorKey: "givePower",
        header: t("order.frontend.recharge.list.freeQuantity"),
        cell: ({ row }) => row.original.givePower,
    },
    {
        accessorKey: "totalPower",
        header: t("order.frontend.recharge.list.quantityReceived"),
        cell: ({ row }) => row.original.totalPower,
    },
    {
        accessorKey: "orderAmount",
        header: t("order.frontend.recharge.list.paidInAmount"),
        cell: ({ row }) => {
            const amount = Number.parseFloat(row.getValue("orderAmount"));
            const formattedAmount = new Intl.NumberFormat("zh-CN", {
                style: "currency",
                currency: "CNY",
            }).format(amount);
            return formattedAmount;
        },
    },
    {
        accessorKey: "payTypeDesc",
        header: t("order.frontend.recharge.list.paymentMethod"),
    },
    {
        accessorKey: "createdAt",
        header: t("order.frontend.recharge.list.createdAt"),
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
];
</script>

<template>
    <div class="flex h-full flex-col">
        <UTable
            ref="table"
            sticky
            :data="paging.items"
            :columns="columns"
            class="max-h-full flex-1"
            :ui="{
                th: 'whitespace-nowrap',
            }"
        >
            <template #payTypeDesc-cell="{ row }">
                <div class="flex flex-col items-center">
                    <div v-if="row.original.payType === 1">
                        {{ t("order.frontend.recharge.list.wechat") }}
                    </div>
                    <div v-else-if="row.original.payType === 2">
                        {{ t("order.frontend.recharge.list.alipay") }}
                    </div>
                    <UBadge v-if="row.original.refundStatus === 1" color="warning">
                        {{ t("order.frontend.recharge.list.refunded") }}
                    </UBadge>
                </div>
            </template>
        </UTable>
        <div class="border-default mt-auto flex items-center justify-between gap-3 border-t pt-4">
            <div class="text-muted flex items-center gap-2 text-sm">
                <span>共 {{ paging.total }} 条</span>
                <USelect
                    v-model="paging.pageSize"
                    size="lg"
                    :items="[
                        { label: '10 条/页', value: 10 },
                        { label: '20 条/页', value: 20 },
                        { label: '50 条/页', value: 50 },
                        { label: '100 条/页', value: 100 },
                    ]"
                    class="w-28"
                    @change="getLists()"
                />
            </div>
            <div class="flex items-center gap-1.5">
                <BdPagination
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    show-edges
                    :total="paging.total"
                    @change="getLists()"
                />
                <div class="text-muted flex items-center gap-2 text-sm">
                    <span>前往</span>
                    <UInput
                        v-model="paging.page"
                        size="lg"
                        type="number"
                        class="w-18"
                        @change="getLists()"
                    />
                    <span>页</span>
                </div>
            </div>
        </div>
    </div>
</template>
