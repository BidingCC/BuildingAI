<script setup lang="ts">
import type { RechargeCenterInfo } from "@buildingai/service/webapi/recharge-center";

import { apiGetRechargeCenterInfo } from "@/service/user";
const active = shallowRef(0);
const rechargeCenterInfo = shallowRef<RechargeCenterInfo>();

onMounted(() => {
    apiGetRechargeCenterInfo().then((res) => {
        rechargeCenterInfo.value = res;
    });
});
definePage({
    style: {
        navigationBarTitle: "pages.recharge",
        auth: true,
        hiddenHeader: false,
    },
});
</script>
<template>
    <view class="pb-safe flex h-full flex-col">
        <view class="p-2">
            <view>充值套餐</view>
            <view class="mt-3 grid grid-cols-3 gap-2">
                <view
                    v-for="(item, index) in rechargeCenterInfo?.rechargeRule"
                    class="bg-background border-muted gap-4 rounded-lg border border-solid p-3"
                    :class="
                        active == index
                            ? 'bg-primary-50 border-primary-500 border border-solid'
                            : 'bg-background'
                    "
                    @click="active = index"
                >
                    <view class="flex items-center gap-1">
                        <view i-lucide-zap size="3" text="primary" />
                        <view>{{ item.power }}</view>
                    </view>
                    <view>
                        <text class="text-muted-foreground text-xs"> ¥ </text>
                        <text> {{ item.sellPrice }} </text>
                    </view>
                </view>
            </view>
        </view>
        <view class="p-2">
            <view>充值说明</view>
            <view
                class="bg-background text-muted-foreground mt-3 space-y-2 rounded-lg p-3 text-sm whitespace-pre-wrap"
                v-html="rechargeCenterInfo?.rechargeExplain || '暂无充值说明'"
            ></view>
        </view>
        <view class="bg-primary m-2 mt-auto rounded-lg p-2 text-center text-white"> 立即购买 </view>
    </view>
</template>
