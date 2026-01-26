<script setup lang="ts">
import type { AccountBalanceListItem } from "@buildingai/service/consoleapi/account-balance";
import { getAccountBalanceList } from "@buildingai/service/consoleapi/account-balance";
import type { Column, Row } from "@tanstack/table-core";

const TimeDisplay = resolveComponent("TimeDisplay");
const UButton = resolveComponent("UButton");
const { t } = useI18n();

/**
 * 账户类型选项配置
 * 定义所有可选的账户变动类型
 */
const ACCOUNT_TYPE_OPTIONS = [
    { label: "financial.accountBalance.allTypes", value: null },
    { label: "financial.accountBalance.userRecharge", value: "100" },
    { label: "financial.accountBalance.userRechargeGift", value: "101" },
    { label: "financial.accountBalance.userRechargeRefund", value: "102" },
    { label: "financial.accountBalance.systemIncreasePower", value: "200" },
    { label: "financial.accountBalance.systemDecreasePower", value: "201" },
    { label: "financial.accountBalance.basicConversation", value: "300" },
    { label: "financial.accountBalance.agentConversation", value: "400" },
    { label: "financial.accountBalance.sharedAgentConversation", value: "401" },
    { label: "financial.accountBalance.pluginConsumption", value: "500" },
    { label: "financial.accountBalance.membershipGift", value: "600" },
    { label: "financial.accountBalance.membershipGiftExpire", value: "602" },
] as const;

const searchForm = shallowReactive({
    keyword: "",
    accountType: null as (typeof ACCOUNT_TYPE_OPTIONS)[number]["value"],
});

const { paging, getLists, resetPage } = usePaging<AccountBalanceListItem>({
    fetchFun: getAccountBalanceList,
    params: searchForm,
});

/**
 * 表格列配置
 * 定义账户余额列表的显示列和排序功能
 */
const columns = computed(() => [
    {
        accessorKey: "accountNo",
        header: t("financial.accountBalance.table.userNo"),
    },
    {
        accessorKey: "nickname",
        header: t("financial.accountBalance.table.nickname"),
    },
    {
        accessorKey: "changeAmount",
        header: t("financial.accountBalance.table.changeAmount"),
    },
    {
        accessorKey: "leftAmount",
        header: t("financial.accountBalance.table.leftAmount"),
    },
    {
        accessorKey: "accountTypeDesc",
        header: t("financial.accountBalance.table.accountTypeDesc"),
    },
    {
        accessorKey: "consumeSourceDesc",
        header: t("financial.accountBalance.table.consumeSourceDesc"),
    },
    {
        accessorKey: "associationUser",
        header: t("financial.accountBalance.table.associationUser"),
    },
    {
        accessorKey: "createdAt",
        header: ({ column }: { column: Column<AccountBalanceListItem> }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: t("financial.accountBalance.table.createdAt"),
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }: { row: Row<AccountBalanceListItem> }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
]);

onMounted(() => {
    getLists();
});
</script>

<template>
    <div class="flex h-full flex-col space-y-4">
        <!-- 搜索区域 -->
        <div class="flex items-center gap-4 pb-2">
            <UInput
                class="w-56"
                v-model="searchForm.keyword"
                :placeholder="t('financial.accountBalance.searchPlaceholder')"
                @update:model-value="resetPage"
            />
            <USelect
                class="w-56"
                v-model="searchForm.accountType"
                :items="
                    ACCOUNT_TYPE_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))
                "
                placeholder="变动类型"
                @update:model-value="getLists"
            />
        </div>

        <div class="flex-1 overflow-hidden">
            <div class="h-full">
                <UTable
                    sticky
                    :columns="columns"
                    :data="paging.items"
                    :loading="paging.loading"
                    :ui="{
                        base: 'table-fixed border-separate border-spacing-0',
                        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                        tbody: '[&>tr]:last:[&>td]:border-b-0',
                        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                        td: 'border-b border-default',
                    }"
                    class="h-[calc(100vh-13rem)] shrink-0"
                >
                    <template #userNo-cell="{ row }">
                        {{ row.original.accountNo }}
                    </template>
                    <template #nickname-cell="{ row }">
                        <UAvatar v-if="row.original.user?.avatar" :src="row.original.user.avatar" />
                        <UAvatar
                            v-else
                            icon="i-heroicons-user"
                            :name="row.original.user?.nickname"
                        />
                        {{ row.original.user?.nickname }}
                    </template>
                    <template #changeAmount-cell="{ row }">
                        <span v-if="row.original.action === 1" class="text-green-500">
                            +{{ row.original.changeAmount }}
                        </span>
                        <span v-else class="text-red-500"> -{{ row.original.changeAmount }} </span>
                    </template>
                </UTable>
            </div>
        </div>

        <div class="flex justify-end py-4">
            <BdPagination
                v-model:page="paging.page"
                v-model:size="paging.pageSize"
                :total="paging.total"
                @change="getLists"
            />
        </div>
    </div>
</template>
