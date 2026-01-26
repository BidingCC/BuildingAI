<script lang="ts" setup>
import type { PowerDetailItem } from "@buildingai/service/webapi/power-detail";
import { apiGetPowerDetailList } from "@buildingai/service/webapi/power-detail";

import type { TableColumn } from "#ui/types";

const TimeDisplay = resolveComponent("TimeDisplay");
const { t } = useI18n();
const userStore = useUserStore();

const tab = shallowRef("all");
const items = [
    {
        value: "all",
        label: t("marketing.frontend.recharge.detail.tab.all"),
    },
    {
        value: "0",
        label: t("marketing.frontend.recharge.detail.tab.consume"),
    },
    {
        value: "1",
        label: t("marketing.frontend.recharge.detail.tab.get"),
    },
];

const columns: TableColumn<PowerDetailItem>[] = [
    {
        accessorKey: "accountTypeDesc",
        header: t("marketing.frontend.recharge.detail.changeDetail"),
    },
    {
        accessorKey: "consumeSourceDesc",
        header: t("marketing.frontend.recharge.detail.consumeSourceDesc"),
    },
    {
        accessorKey: "changeAmount",
        header: t("marketing.frontend.recharge.detail.changeAmount"),
    },
    {
        accessorKey: "createdAt",
        header: t("marketing.frontend.recharge.detail.changeTime"),
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
];

const searchParams = reactive({
    action: "",
});

const { paging, getLists } = usePaging({
    fetchFun: apiGetPowerDetailList,
    params: searchParams,
});

const getPowerDetailList = () => {
    searchParams.action = tab.value === "all" ? "" : tab.value;
    getLists();
    userStore.getUser();
};

onMounted(() => getPowerDetailList());

definePageMeta({
    title: "menu.powerDetail",
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="flex h-full flex-col space-y-4 p-2 pb-5">
        <div class="h-fit">
            <UCard>
                <div class="grid grid-cols-4 items-center gap-4 text-center">
                    <div class="flex flex-col justify-between gap-2">
                        <div class="text-muted-foreground text-sm">
                            {{ t("marketing.frontend.recharge.detail.remainingPower") }}
                        </div>
                        <div class="text-lg font-medium">{{ userStore.userInfo?.power }}</div>
                    </div>
                    <div class="flex flex-col justify-between gap-2">
                        <div class="text-muted-foreground text-sm">订阅积分</div>
                        <div class="text-lg font-medium">
                            {{ paging.extend?.membershipGiftPower }}
                        </div>
                    </div>
                    <div class="flex flex-col justify-between gap-2">
                        <div class="text-muted-foreground text-sm">充值积分</div>
                        <div class="text-lg font-medium">
                            {{ paging.extend?.rechargePower }}
                        </div>
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <div
                            class="text-muted-foreground flex flex-row items-center justify-center gap-1 text-sm"
                        >
                            {{ t("marketing.frontend.recharge.detail.dailyGiftPower.title") }}
                            <UPopover mode="hover">
                                <UIcon name="tabler:help" size="14" />
                                <template #content>
                                    <div
                                        class="bg-background max-h-60 w-90 overflow-hidden rounded-lg shadow-lg"
                                    >
                                        <UCard>
                                            <div class="text-md space-y-2">
                                                <h4>
                                                    {{
                                                        t(
                                                            "marketing.frontend.recharge.detail.dailyGiftPower.title",
                                                        )
                                                    }}
                                                </h4>

                                                <div
                                                    class="space-y-2 rounded-lg border p-4 text-center"
                                                >
                                                    <div class="flex items-center justify-between">
                                                        <div>
                                                            {{
                                                                t(
                                                                    "marketing.frontend.recharge.detail.dailyGiftPower.giftPower",
                                                                )
                                                            }}
                                                        </div>
                                                        <div>0</div>
                                                    </div>
                                                    <div class="flex items-center justify-between">
                                                        <div>
                                                            {{
                                                                t(
                                                                    "marketing.frontend.recharge.detail.dailyGiftPower.powerValidity",
                                                                )
                                                            }}
                                                        </div>
                                                        <div>-</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </UCard>
                                    </div>
                                </template>
                            </UPopover>
                        </div>
                        <div class="text-lg font-medium">0</div>
                    </div>
                </div>
            </UCard>

            <UTabs
                v-model="tab"
                :content="false"
                :items="items"
                class="mt-8 w-fit"
                @update:model-value="getPowerDetailList"
            />
        </div>

        <div class="flex flex-1 flex-col overflow-hidden">
            <UTable
                sticky
                :columns="columns"
                :data="paging.items"
                :ui="{ root: 'border rounded-lg' }"
            >
                <template #accountType-cell="{ row }">
                    {{ row.original.accountTypeDesc }}
                </template>
                <template #changeAmount-cell="{ row }">
                    <span :class="row.original.action === 1 ? 'text-green-500' : 'text-red-500'">
                        {{ row.original.action === 1 ? "+" : "-" }}
                        {{ row.original.changeAmount }}
                    </span>
                </template>
                <template #remark-cell="{ row }">
                    <div>
                        {{ row.original.remark }}
                    </div>
                </template>
            </UTable>
            <div class="flex items-center justify-end gap-3">
                <BdPagination
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    :total="paging.total"
                    :ui="{ root: 'mt-4' }"
                    @change="getPowerDetailList"
                />
            </div>
        </div>
    </div>
</template>
