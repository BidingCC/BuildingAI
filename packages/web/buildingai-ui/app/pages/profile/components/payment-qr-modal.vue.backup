<script setup lang="ts">
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
                <!-- QR Code -->
                <div class="relative h-52 w-52">
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
