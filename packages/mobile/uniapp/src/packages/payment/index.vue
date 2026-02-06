<script setup lang="ts">
import type {
    OrderPayFromType,
    PayConfigType,
} from "@buildingai/constants/shared/payconfig.constant";
import { OrderPayFrom } from "@buildingai/constants/shared/payconfig.constant";
import { PayConfigPayType } from "@buildingai/constants/shared/payconfig.constant";
import { UserTerminal } from "@buildingai/constants/shared/status-codes.constant";

import { useLockFn } from "@/hooks/use-lock-fn";
import { usePay } from "@/hooks/use-pay";
import { apiGetPayWayList, apiPostPrepaid, type PayWayItem, type PrepaidInfo } from "@/service/pay";
import { apiPostRecharge } from "@/service/recharge";
import { useUserStore } from "@/stores/user";
import { getTerminal } from "@/utils/env";
const { t } = useI18n();
const userStore = useUserStore();
const { launchPay } = usePay();

const payWayList = shallowRef<PayWayItem[]>([]);
const selectedPayWayId = ref("");

/** 从充值页带入：套餐 id、来源、展示金额（从当前页 options 读取） */
const rechargeId = shallowRef("");
const from = shallowRef<OrderPayFromType>(OrderPayFrom.RECHARGE);
const sellPrice = shallowRef("0");
const isPayed = ref(false);
const orderId = shallowRef("");
onMounted(() => {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1] as { options?: Record<string, string> };
    const opts = page?.options ?? {};
    rechargeId.value = opts.rechargeId ?? "";
    from.value = (opts.from as OrderPayFromType) ?? OrderPayFrom.RECHARGE;
    const sellPriceEncoded = opts.sellPrice;
    sellPrice.value = sellPriceEncoded ? decodeURIComponent(sellPriceEncoded) : "0";

    apiGetPayWayList().then((res) => {
        const list = res ?? [];
        payWayList.value = list;
        const defaultItem = list.find((i) => i.isDefault === 1) ?? list[0];
        if (defaultItem) selectedPayWayId.value = defaultItem.id;
    });
});

function onPayWayChange(e: { detail: { value: string } }) {
    selectedPayWayId.value = e.detail.value;
}
const onPaymentResult = () => {
    uni.redirectTo({
        url: `/packages/payment-result/index?orderId=${orderId.value}&from=recharge&sellPrice=${sellPrice.value}`,
    });
};

const { isLock, lockFn: onPay } = useLockFn(async () => {
    if (!rechargeId.value) {
        uni.showToast({ title: "缺少充值信息", icon: "none" });
        return;
    }
    const selected = payWayList.value.find((p) => p.id === selectedPayWayId.value);
    if (!selected?.payType) {
        uni.showToast({ title: "请选择支付方式", icon: "none" });
        return;
    }

    const scene = getTerminal();
    // 微信支付前按端判断是否已绑定微信：小程序需 bindWechat，公众号需 bindWechatOa
    if (selected.payType === PayConfigPayType.WECHAT) {
        await userStore.getUser();
        const userInfo = userStore.userInfo;
        if (scene === UserTerminal.MP) {
            if (!userInfo?.bindWechat) {
                uni.showToast({ title: "请先绑定微信小程序", icon: "none" });
                setTimeout(() => {
                    uni.reLaunch({ url: "/packages/user-settings/index" });
                }, 1500);
                return;
            }
        } else if (scene === UserTerminal.OA) {
            if (!userInfo?.bindWechatOa) {
                uni.showToast({ title: "请先绑定微信公众号", icon: "none" });
                setTimeout(() => {
                    uni.reLaunch({ url: "/packages/user-settings/index" });
                }, 1500);
                return;
            }
        }
    }
    const rechargeRes = await apiPostRecharge({
        id: rechargeId.value,
        payType: selected.payType as PayConfigType,
        scene,
    });
    orderId.value = rechargeRes.orderId;
    try {
        const prepaidInfo = await apiPostPrepaid({
            from: OrderPayFrom.RECHARGE,
            orderId: rechargeRes.orderId,
            payType: selected.payType as PayConfigType,
            scene,
        });
        await launchPay(prepaidInfo, selected.payType, scene);
    } catch (error) {
        console.error(error);
    }
    const sellPriceEnc = encodeURIComponent(sellPrice.value);
    // #ifndef H5
    uni.redirectTo({
        url: `/packages/payment-result/index?orderId=${rechargeRes.orderId}&from=recharge&sellPrice=${sellPriceEnc}`,
    });
    // #endif
    // #ifdef H5
    if (isWechatOa) {
        uni.redirectTo({
            url: `/packages/payment-result/index?orderId=${rechargeRes.orderId}&from=recharge&sellPrice=${sellPriceEnc}`,
        });
    } else {
        isPayed.value = true;
    }
    // #endif
});

definePage({
    style: {
        navigationBarTitle: "pages.payment",
        auth: true,
        hiddenHeader: true,
    },
});
</script>
<template>
    <view class="pb-safe flex min-h-full flex-col">
        <BdNavbar :title="t('pages.payment')" filter="blur(4px)" />
        <view class="mt-10 flex flex-col items-center justify-center">
            <view class="flex items-center gap-1"
                ><text class="text-base">¥</text
                ><text class="text-2xl font-bold">{{ sellPrice }}</text></view
            >
            <view class="text-muted-foreground text-sm">请选择支付方式并完成支付</view>
        </view>
        <view class="bg-background mx-4 mt-10 flex-1 rounded-lg p-3">
            <view v-if="payWayList.length === 0" class="py-4 text-center text-sm">
                暂无可用的支付方式
            </view>
            <view v-else class="space-y-2">
                <radio-group @change="onPayWayChange">
                    <view
                        v-for="item in payWayList"
                        :key="item.id"
                        class="flex items-center gap-3 rounded-lg p-3"
                    >
                        <image
                            v-if="item.logo"
                            :src="item.logo"
                            class="size-8 rounded-lg"
                            mode="aspectFit"
                        />
                        <view class="flex-1 font-medium">{{ item.name }}</view>
                        <view class="radio-wrap">
                            <radio
                                :value="item.id"
                                :checked="selectedPayWayId === item.id"
                                color="var(--primary-500)"
                            />
                        </view>
                    </view>
                </radio-group>
            </view>
        </view>
        <view class="mx-4 mt-auto py-4">
            <view
                class="bg-primary rounded-lg py-3 text-center font-medium text-white"
                :class="{ 'opacity-60': isLock }"
                @click="onPay"
            >
                <span v-if="isPayed" @click="onPaymentResult"> 已完成支付支付 </span>
                <span v-else>
                    {{ isLock ? "支付中" : "立即支付" }}
                </span>
            </view>
            <view
                v-if="isPayed"
                class="text-muted-foreground mt-3 text-center text-sm"
                @click="onPaymentResult"
            >
                取消支付
            </view>
        </view>
    </view>
</template>
<style scoped>
.radio-wrap {
    transform: scale(0.85);
    transform-origin: center;
}
</style>
<style>
/* #ifndef H5 */
page {
    background-image:
        url("@/static/images/background.png"),
        linear-gradient(
            to bottom,
            var(--primary-300) 0%,
            var(--primary-200) 10%,
            var(--primary-50) 25%,
            var(--background-soft) 30%,
            var(--background-soft) 100%
        );
    background-size: 100%, cover;
    background-position: top, top;
    background-repeat: no-repeat, no-repeat;
    z-index: 0;
}
/* #endif */
</style>
