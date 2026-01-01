<script setup lang="ts">
import { PayConfigPayType } from "@buildingai/constants/shared";
import type { OrderInfo, PrepaidInfo } from "@buildingai/service/webapi/recharge-center";

const props = defineProps<{
    /** Payment data containing QR code information */
    prepaidData: PrepaidInfo | null;
    /** Order information */
    orderInfo: OrderInfo | null;
    /** Whether the QR code has expired */
    isQrCodeExpired: boolean;
}>();
const emits = defineEmits<{
    /** Handle modal close */
    close: [value: boolean];
    /** Handle QR code refresh */
    refreshQrCode: [];
}>();

const { t } = useI18n();

/**
 * Check if payment method is Alipay
 */
const isAlipay = computed(() => props.prepaidData?.payType === PayConfigPayType.ALIPAY);

/**
 * Check if payment method is WeChat Pay
 */
const isWeChatPay = computed(() => props.prepaidData?.payType === PayConfigPayType.WECHAT);

/**
 * Handle QR code refresh
 */
const handleRefresh = (): void => {
    emits("refreshQrCode");
};

/**
 * Get payment method title
 */
const paymentTitle = computed(() => {
    if (!props.prepaidData) return "";
    return props.prepaidData.payType === 1
        ? t("marketing.frontend.recharge.wxPay")
        : t("marketing.frontend.recharge.alipayPay");
});

/**
 * Get payment method text for instruction
 */
const paymentMethodText = computed(() => {
    if (!props.prepaidData) return "";
    return props.prepaidData.payType === 1
        ? t("marketing.frontend.recharge.wxPay")
        : t("marketing.frontend.recharge.alipayPay");
});

/**
 * Handle Alipay payment form submission
 */
const handleAlipayPayment = () => {
    if (!props.prepaidData?.payForm) {
        console.error("Payment form not found");
        return;
    }

    try {
        const newWindow = window.open("about:blank", "_blank");
        if (newWindow) {
            newWindow.document.writeln(props.prepaidData.payForm);
            newWindow.document.close();
        } else {
            alert("backup window");
        }
    } catch (error) {
        console.error("Failed to submit Alipay payment form:", error);
    }
};

/**
 * Auto-submit Alipay payment form when data is ready
 */
watch(
    () => props.prepaidData,
    (newData) => {
        if (newData && isAlipay.value && newData.payForm) {
            // Delay execution to ensure DOM is rendered
            nextTick(() => {
                handleAlipayPayment();
            });
        }
    },
    { immediate: true },
);
</script>

<template>
    <BdModal
        :ui="{
            content: 'max-w-sm overflow-y-auto h-fit',
        }"
        :title="paymentTitle"
        @close="emits('close', true)"
    >
        <template #default>
            <div class="flex flex-col items-center justify-center gap-2">
                <!-- WeChat Pay: QR Code -->
                <div v-if="isWeChatPay" class="relative h-52 w-52">
                    <NuxtImg
                        v-if="prepaidData?.qrCode?.code_url"
                        class="w-full"
                        :src="prepaidData.qrCode.code_url"
                        :alt="`${paymentTitle} QR Code`"
                    />

                    <!-- QR Code Expired Overlay -->
                    <div
                        v-if="isQrCodeExpired"
                        class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm dark:bg-gray-800/60"
                    >
                        <UIcon
                            name="i-lucide-alert-triangle"
                            class="mb-2 text-5xl text-yellow-500"
                        />
                        <p class="mb-2 text-sm text-gray-700 dark:text-gray-300">
                            {{ t("marketing.frontend.recharge.qrCodeExpired") }}
                        </p>
                        <UButton class="cursor-pointer" size="xs" @click="handleRefresh">
                            {{ t("marketing.frontend.recharge.refreshQrCode") }}
                        </UButton>
                    </div>
                </div>

                <!-- Alipay: Show Payment Guide -->
                <div
                    v-if="isAlipay"
                    class="flex w-full flex-col items-center justify-center space-y-4 py-8"
                >
                    <!-- Alipay Logo -->
                    <NuxtImg
                        src="https://cdn.aptoide.com/imgs/6/8/4/684670b993da48b85ed2d32d4f56bbfc_icon.png"
                        alt="Alipay"
                        class="h-16 w-16"
                    />

                    <!-- Loading Animation -->
                    <UIcon name="i-lucide-loader-2" class="text-primary h-12 w-12 animate-spin" />

                    <!-- Payment Steps -->
                    <div class="space-y-2 text-center">
                        <p class="text-lg font-medium">
                            {{ t("marketing.frontend.recharge.alipayTips.tip1") }}
                        </p>
                        <p class="text-muted-foreground text-sm">
                            {{ t("marketing.frontend.recharge.alipayTips.tip2") }}
                        </p>
                    </div>

                    <!-- Payment Instructions -->
                    <div class="bg-muted w-full space-y-2 rounded-lg p-4 text-left">
                        <p class="font-medium">
                            {{ t("marketing.frontend.recharge.alipayTips.stepTitle") }}
                        </p>
                        <ol class="text-muted-foreground space-y-1 text-sm">
                            <li>{{ t("marketing.frontend.recharge.alipayTips.step1") }}</li>
                            <li>{{ t("marketing.frontend.recharge.alipayTips.step2") }}</li>
                            <li>{{ t("marketing.frontend.recharge.alipayTips.step3") }}</li>
                        </ol>
                    </div>
                </div>

                <!-- Total Amount -->
                <div>
                    <span class="text-lg font-medium">
                        {{ t("marketing.frontend.recharge.total") }}：
                    </span>
                    <span class="text-xl font-bold text-red-500">
                        ¥{{ orderInfo?.orderAmount }}
                    </span>
                </div>

                <!-- Payment Instruction -->
                <div class="text-center text-lg">
                    {{ t("marketing.frontend.recharge.use") }}
                    {{ paymentMethodText }}
                    {{ t("marketing.frontend.recharge.pay") }}
                </div>

                <!-- Contact Info -->
                <div class="text-muted-foreground pt-2 text-center text-sm">
                    {{ t("marketing.frontend.recharge.contact") }}
                </div>
            </div>
        </template>
    </BdModal>
</template>
