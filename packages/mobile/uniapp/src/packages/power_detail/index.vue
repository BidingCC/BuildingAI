<script setup lang="ts">
import type {
    PowerDetailItem,
    PowerDetailQueryParams,
} from "@buildingai/service/webapi/power-detail";

import { apiGetUserPowerDetail } from "@/service/user";
const { t } = useI18n();
const membershipGiftPower = shallowRef(0);
const rechargePower = shallowRef(0);
const power = shallowRef(0);
const powerDetailLists = shallowRef<PowerDetailItem[]>([]);
const pagingRef = shallowRef<ZPagingRef>();

definePage({
    style: {
        navigationBarTitle: "pages.powerDetail",
        auth: true,
        hiddenHeader: false,
    },
});
// 查询列表
const queryList = (pageNo: number, pageSize: number) => {
    const params: PowerDetailQueryParams = {
        page: pageNo,
        pageSize: pageSize,
    };

    apiGetUserPowerDetail(params)
        .then((res) => {
            membershipGiftPower.value = res.extend.membershipGiftPower;
            rechargePower.value = res.extend.rechargePower;
            power.value = res.extend.power;
            pagingRef.value?.complete(res.items);
        })
        .catch((error) => {
            console.error("Failed to load agents:", error);
            pagingRef.value?.complete([]);
        });
};
</script>
<template>
    <view class="bg-background m-4 flex justify-around rounded-lg py-4">
        <view>
            <view class="mb-2 flex items-center justify-between">
                <view class="text-foreground text-sm font-medium"> 积分余额 </view>
            </view>
            <view flex="~ items-center justify-center" gap="2">
                <view text="muted-foreground sm">
                    <view text="warning-600 lg" font="medium">{{ power }}</view>
                </view>
            </view>
        </view>
        <view>
            <view class="mb-2 flex items-center justify-between">
                <view class="text-foreground text-sm font-medium"> 订阅积分 </view>
            </view>
            <view flex="~ items-center justify-center" gap="2">
                <view text="muted-foreground sm">
                    <view text="warning-600 lg" font="medium">{{ membershipGiftPower }}</view>
                </view>
            </view>
        </view>
        <view>
            <view class="mb-2 flex items-center justify-between">
                <view class="text-foreground text-sm font-medium"> 充值积分 </view>
            </view>
            <view flex="~ items-center justify-center   " gap="2">
                <view text="muted-foreground sm">
                    <view text="warning-600 lg" font="medium">{{ rechargePower }}</view>
                </view>
            </view>
        </view>
    </view>
    <view class="mb-safe mx-4 h-full rounded-lg">
        <z-paging
            ref="pagingRef"
            v-model="powerDetailLists"
            @query="queryList"
            :show-scrollbar="false"
            :fixed="false"
            class="bg-background h-full rounded-lg"
        >
            <view
                v-for="item in powerDetailLists"
                :key="item.id"
                class="flex items-center justify-between bg-white p-2 text-sm"
            >
                <view class="space-y-2">
                    <view>{{ item.accountTypeDesc }}</view>
                    <view class="text-muted-foreground text-xs">{{ item.createdAt }}</view>
                </view>
                <view :class="item.action === 1 ? 'text-green-500' : 'text-red-500'" class="text-lg"
                    >{{ item.action === 1 ? "+" : "-" }}{{ item.changeAmount }}</view
                >
            </view>
        </z-paging>
    </view>
</template>
<style></style>
