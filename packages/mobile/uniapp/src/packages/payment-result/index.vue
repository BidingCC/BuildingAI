<script setup lang="ts">
import type { OrderPayFromType } from "@buildingai/constants/shared/payconfig.constant";
import { OrderPayFrom } from "@buildingai/constants/shared/payconfig.constant";

import { usePollingTask } from "@/hooks/use-polling-task";
import type { PayResult } from "@/service/pay";
import { apiGetPayResult } from "@/service/pay";

const { t } = useI18n();

/** 页面参数：orderId、from、sellPrice */
const orderId = ref("");
const from = ref<OrderPayFromType>(OrderPayFrom.RECHARGE);
const sellPrice = ref("");

/** 轮询结果：pending 待支付（含轮询中）| success | timeout 轮询结束仍待支付 */
const status = ref<"pending" | "success" | "timeout">("pending");
const payResult = ref<PayResult | null>(null);

const POLL_INTERVAL = 2000;
const POLL_MAX_ATTEMPTS = 5;

function isPaid(res: PayResult): boolean {
    return res.payStatus === 1 || res.payState === 1;
}

async function checkPayResult(stopFn: () => void) {
    if (status.value !== "pending") return;
    try {
        const res = await apiGetPayResult({
            orderId: orderId.value,
            from: from.value,
        });
        if (isPaid(res)) {
            payResult.value = res;
            status.value = "success";
            stopFn();
        }
    } catch {
        // 单次请求失败继续轮询
    }
}

const { start: startPolling } = usePollingTask(checkPayResult, {
    interval: POLL_INTERVAL,
    maxAttempts: POLL_MAX_ATTEMPTS,
    onEnded: () => {
        if (status.value === "pending") {
            status.value = "timeout";
        }
    },
});

onMounted(async () => {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1] as { options?: Record<string, string> };
    const opts = page?.options ?? {};
    orderId.value = opts.orderId ?? "";
    from.value = (opts.from as OrderPayFromType) || OrderPayFrom.RECHARGE;
    const sellPriceEnc = opts.sellPrice;
    sellPrice.value = sellPriceEnc ? decodeURIComponent(sellPriceEnc) : "";

    // 先查一次，成功则不再轮询
    try {
        const res = await apiGetPayResult({ orderId: orderId.value, from: from.value });
        payResult.value = res;
        if (isPaid(res)) {
            payResult.value = res;
            status.value = "success";
            return;
        }
    } catch {
        // 忽略，交给轮询
    }

    startPolling();
});

definePage({
    style: {
        navigationBarTitle: "pages.paymentResult",
        auth: true,
        hiddenHeader: true,
    },
});

const onBack = () => {
    uni.reLaunch({ url: "/packages/recharge/index" });
};

const onViewRecord = () => {
    uni.reLaunch({ url: "/packages/power_detail/index" });
};
</script>
<template>
    <view class="pb-safe flex min-h-full flex-col">
        <BdNavbar :title="t('pages.paymentResult')" filter="blur(4px)" />
        <view class="mt-16 flex flex-1 flex-col items-center px-4">
            <!-- 支付成功 -->
            <template v-if="status === 'success'">
                <view
                    class="mb-6 flex size-16 items-center justify-center rounded-full bg-green-500"
                >
                    <view i-lucide-check class="size-12 text-white" />
                </view>
                <view class="text-xl font-semibold">支付成功</view>
                <view class="text-muted-foreground mt-2 text-sm">感谢您的支付，积分已到账</view>
            </template>

            <!-- 待支付：进入即显示，有订单信息时在后台轮询 -->
            <template v-else-if="(status === 'pending' && orderId && from) || status === 'timeout'">
                <view class="mb-6 flex size-16 items-center justify-center rounded-full bg-red-500">
                    <view i-lucide-clock class="size-12 text-white" />
                </view>
                <view class="text-xl font-semibold">待支付</view>
                <view class="text-muted-foreground mt-2 text-center text-sm">
                    若已完成支付，请稍后在积分明细中查看到账情况
                </view>
            </template>
            <!-- 缺少参数：pending 且无订单信息 -->
            <template v-else-if="status === 'pending'">
                <view class="bg-muted mb-6 flex size-16 items-center justify-center rounded-full">
                    <view i-lucide-alert-circle class="text-muted-foreground size-12" />
                </view>
                <view class="text-muted-foreground text-sm">缺少订单信息</view>
            </template>
            <view class="bg-background mt-8 w-full max-w-sm rounded-lg p-4">
                <view class="text-muted-foreground flex justify-between text-sm">
                    <text>订单编号</text>
                    <text>{{ payResult?.orderNo ?? "—" }}</text>
                </view>
                <view class="text-muted-foreground mt-2 flex justify-between text-sm">
                    <text>支付金额</text>
                    <text>¥ {{ sellPrice || "—" }}</text>
                </view>
            </view>
        </view>
        <view class="mx-4 py-6">
            <view
                class="bg-primary rounded-lg py-3 text-center font-medium text-white"
                @click="onViewRecord"
            >
                查看记录
            </view>
            <view
                class="text-primary mt-2 rounded-lg bg-white py-3 text-center font-medium"
                @click="onBack"
            >
                返回充值中心
            </view>
        </view>
    </view>
</template>
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
