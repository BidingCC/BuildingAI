<script setup lang="ts">
import type { RechargeCenterInfo } from "@buildingai/service/webapi/recharge-center";

import { useLockFn } from "@/hooks/use-lock-fn";
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

/** 选择套餐后跳转结算页，订单在结算页创建 */
const { isLock, lockFn: toPayment } = useLockFn(async () => {
    const list = rechargeCenterInfo.value?.rechargeRule;
    const rule = list?.[active.value];
    if (!rule?.id) {
        uni.showToast({ title: "请选择充值套餐", icon: "none" });
        return;
    }
    const sellPrice = encodeURIComponent(String(rule.sellPrice ?? ""));
    uni.navigateTo({
        url: `/packages/payment/index?rechargeId=${rule.id}&from=recharge&sellPrice=${sellPrice}`,
    });
});
</script>
<template>
    <view class="pb-safe flex h-full flex-col">
        <view class="p-3">
            <view>充值套餐</view>
            <view class="mt-3 grid grid-cols-3 gap-2">
                <view
                    v-for="(item, index) in rechargeCenterInfo?.rechargeRule"
                    class="bg-background border-muted gap-4 space-y-1 rounded-lg border border-solid p-3"
                    :class="
                        active == index
                            ? 'bg-primary-50 border-primary-500 border border-solid'
                            : 'bg-background'
                    "
                    @click="active = index"
                >
                    <view class="flex items-center gap-1">
                        <view i-lucide-zap size="3" text="primary" />
                        <view class="text-bold">{{ item.power }}</view>
                    </view>
                    <view class="flex items-center gap-1">
                        <text i-lucide-check size="3" class="text-green-500"> </text>
                        <text class="text-sm">
                            {{ item.givePower
                            }}<text class="text-muted-foreground ml-1 text-xs">(赠送)</text>
                        </text>
                    </view>
                    <view class="flex items-center gap-1">
                        <text i-lucide-badge-japanese-yen size="3" class="text-red-500"> </text>
                        <text class="text-sm"> {{ item.sellPrice }} </text>
                    </view>
                </view>
            </view>
        </view>
        <view class="p-3">
            <view>充值说明</view>
            <view
                class="bg-background text-muted-foreground mt-3 space-y-2 rounded-lg p-3 text-sm whitespace-pre-wrap"
                v-html="rechargeCenterInfo?.rechargeExplain || '暂无充值说明'"
            ></view>
        </view>
        <view
            class="bg-primary mx-3 mt-auto rounded-lg p-2 text-center text-white"
            :class="{ 'opacity-60': isLock }"
            @click="toPayment"
        >
            {{ isLock ? "跳转中..." : "立即购买" }}
        </view>
    </view>
</template>
