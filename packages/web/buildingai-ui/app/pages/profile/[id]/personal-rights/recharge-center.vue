<script lang="ts" setup>
import { PayConfigPayType, type PayConfigType } from "@buildingai/constants/shared";
import type { RechargeRule } from "@buildingai/service/webapi/recharge-center";
import type { OrderInfo, PrepaidInfo } from "@buildingai/service/webapi/recharge-center";
import {
    apiGetPayResult,
    apiGetRechargeCenterInfo,
    apiPostPrepaid,
    apiPostRecharge,
} from "@buildingai/service/webapi/recharge-center";

const PaymentQrModal = defineAsyncComponent(() => import("../../components/payment-qr-modal.vue"));
const RechargeSuccessModal = defineAsyncComponent(
    () => import("../../components/recharge-success-modal.vue"),
);

interface PaymentMethod {
    value: PayConfigType;
    label: string;
    icon: string;
}

const appStore = useAppStore();
const { t } = useI18n();
const toast = useMessage();
const router = useRouter();
const userStore = useUserStore();
const overlay = useOverlay();

const state = reactive({
    _prepaidData: null as PrepaidInfo | null,
    orderInfo: null as OrderInfo | null,
    rechargeOptions: [] as RechargeRule[],
    paymentMethods: [] as PaymentMethod[],
    selectedOptionIndex: 0,
    selectedPaymentMethod: PayConfigPayType.WECHAT as PayConfigType,
    rechargeInstructions: undefined as string | undefined,
    rechargeSuccess: false,
    isQrCodeExpired: false,
});
const { start: startPaymentPolling, clear: stopPaymentPolling } = usePollingTask(
    async (stopPolling) => {
        try {
            if (!state.orderInfo?.orderId) {
                stopPolling();
                return;
            }

            const res = await apiGetPayResult({
                orderId: state.orderInfo.orderId,
                from: "recharge",
            });

            if (res.payStatus === 1) {
                stopPolling();
                await refreshRechargeInfo();
                await userStore.getUser();
                mountSuccessModal();
            }
        } catch (error) {
            console.error("Payment polling error:", error);
        }
    },
    {
        interval: 3000,
        maxWaitTime: 120000,
        stopCondition: () => state.isQrCodeExpired,
        onEnded: () => {
            if (!state.rechargeSuccess) {
                state.isQrCodeExpired = true;
            }
        },
    },
);

const { data: rechargeCenterInfo } = await useAsyncData(
    "rechargeCenterInfo",
    () => apiGetRechargeCenterInfo(),
    {
        transform: (data) => {
            state.paymentMethods = data.payWayList.map((item) => ({
                value: item.payType,
                label: item.name,
                icon: item.logo,
            }));
            const defaultMethod = data.payWayList.find((item) => item.isDefault);
            if (defaultMethod) {
                state.selectedPaymentMethod = defaultMethod.payType;
            }

            state.rechargeInstructions = data.rechargeExplain;
            state.rechargeOptions = data.rechargeRule;
            return data;
        },
    },
);

const refreshRechargeInfo = async (): Promise<void> => {
    try {
        const res = await apiGetRechargeCenterInfo();
        state.paymentMethods = res.payWayList.map((item) => ({
            value: item.payType,
            label: item.name,
            icon: item.logo,
        }));
        state.rechargeInstructions = res.rechargeExplain;
        state.rechargeOptions = res.rechargeRule;
    } catch (error) {
        console.error("Failed to refresh recharge info:", error);
    }
};

const currentOption = computed(() => {
    if (state.rechargeOptions.length === 0) {
        return null;
    }
    return state.rechargeOptions[state.selectedOptionIndex];
});

const handleRecharge = async (): Promise<void> => {
    try {
        if (!currentOption.value) {
            toast.error(t("marketing.frontend.recharge.noOptionSelected"));
            return;
        }

        const res = await apiPostRecharge({
            id: currentOption.value.id,
            payType: state.selectedPaymentMethod,
        });
        state.orderInfo = res;

        const prepaidInfo = await apiPostPrepaid({
            from: "recharge",
            orderId: res.orderId,
            payType: state.selectedPaymentMethod,
        });
        mountPaymentModal(prepaidInfo);
        state.isQrCodeExpired = false;
        state.rechargeSuccess = false;
        startPaymentPolling();
    } catch (error) {
        console.error("Recharge failed:", error);
    }
};

const paymentModal = overlay.create(PaymentQrModal);
const mountPaymentModal = async (prepaidInfo: PrepaidInfo) => {
    const instance = paymentModal.open({
        prepaidData: prepaidInfo,
        orderInfo: state.orderInfo,
        isQrCodeExpired: state.isQrCodeExpired,
        onRefreshQrCode: () => handleRefreshQrCode(),
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        stopPaymentPolling();
        state.isQrCodeExpired = false;
        toast.warning(t("marketing.frontend.recharge.cancelPay"));
    }
};

const mountSuccessModal = async () => {
    const modal = overlay.create(RechargeSuccessModal);

    const instance = modal.open();
    paymentModal.close();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        toRechargeRecord();
    }
};

const tokenDetail = (): void => {
    router.push(`/profile/${userStore.userInfo?.id}/power-detail`);
};

const handleRefreshQrCode = async (): Promise<void> => {
    try {
        stopPaymentPolling();
        if (!state.orderInfo?.orderId) {
            console.error("Order ID does not exist");
            toast.error(t("marketing.frontend.recharge.orderNotFound"));
            return;
        }

        const prepaidInfo = await apiPostPrepaid({
            from: "recharge",
            orderId: state.orderInfo.orderId,
            payType: state.selectedPaymentMethod,
        });
        mountPaymentModal(prepaidInfo);
        state.isQrCodeExpired = false;
        state.rechargeSuccess = false;
        startPaymentPolling();
    } catch (error) {
        console.error("Failed to refresh QR code:", error);
    }
};

const toServiceTerms = (): void => {
    window.open("/agreement?type=agreement&item=payment", "_blank");
};

const toRechargeRecord = (): void => {
    router.push(`/profile/${userStore.userInfo?.id}/power-detail`);
};

onUnmounted(() => {
    stopPaymentPolling();
});

definePageMeta({
    title: "menu.rechargeCenter",
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="h-full">
        <div
            v-if="rechargeCenterInfo?.rechargeStatus"
            class="flex h-full flex-col space-y-4 px-6 pt-6"
        >
            <div class="flex flex-1 flex-col space-y-8 overflow-y-auto">
                <!-- User information -->
                <div class="bg-muted flex items-center gap-4 rounded-lg p-4">
                    <UAvatar :src="userStore.userInfo!.avatar" size="3xl" />
                    <div>
                        <div class="text-lg font-medium">
                            <span>
                                {{
                                    userStore.userInfo!.nickname ||
                                    t("user.frontend.profile.notSet")
                                }}
                            </span>
                        </div>
                        <div
                            class="text-muted-foreground flex cursor-pointer items-center gap-1"
                            @click="tokenDetail"
                        >
                            <span class="text-center">
                                {{ t("marketing.frontend.recharge.powerBalance") }}：
                                {{ rechargeCenterInfo?.user.power }}
                            </span>
                            <UIcon name="i-lucide-chevron-right" class="text-sm" />
                        </div>
                    </div>
                </div>

                <!-- Recharge options -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">
                        {{ t("marketing.frontend.recharge.selectRechargePackage") }}
                    </h2>
                    <div
                        v-if="state.rechargeOptions.length > 0"
                        class="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        <div
                            v-for="(option, index) in state.rechargeOptions"
                            :key="index"
                            class="border-muted relative cursor-pointer rounded-lg border p-4 transition-all duration-200"
                            :class="{
                                'border-primary-500 bg-muted': state.selectedOptionIndex === index,
                                'bg-primary/5': state.selectedOptionIndex === index,
                                'hover:border-primary-300 border-gray-200':
                                    state.selectedOptionIndex !== index,
                            }"
                            @click="state.selectedOptionIndex = index"
                        >
                            <!-- Special offer label -->
                            <div
                                v-if="option.label"
                                class="absolute -top-4 left-0 rounded-tl-md rounded-br-md bg-[#352B00] px-2 py-0.5 text-xs text-[#FFE7B5]"
                            >
                                {{ option.label }}
                            </div>

                            <!-- Power value -->
                            <div class="mb-2 flex items-center gap-2">
                                <UIcon name="i-lucide-zap" class="text-primary text-xl" />
                                <span class="text-xl font-bold">{{ option.power }}</span>
                            </div>

                            <!-- Price -->
                            <div class="mb-4 text-lg font-medium">¥ {{ option.sellPrice }}</div>

                            <!-- Description list -->
                            <ul class="space-y-2">
                                <li v-if="option.givePower" class="flex items-center gap-2">
                                    <UIcon name="i-lucide-check" class="text-sm text-green-500" />
                                    <span class="space-x-1 text-sm text-gray-600">
                                        <span>{{ t("marketing.frontend.recharge.add") }}</span>
                                        <span class="font-bold"> {{ option.givePower }} </span>
                                        <span>{{ t("marketing.frontend.recharge.power") }}</span>
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div v-else class="text-muted-foreground">
                        {{ t("marketing.frontend.recharge.noRechargeOptions") }}
                    </div>
                </div>

                <!-- Payment method -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">
                        {{ t("marketing.frontend.recharge.paymentMethod") }}
                    </h2>
                    <div class="flex flex-row items-center justify-start gap-6">
                        <URadioGroup
                            v-model="state.selectedPaymentMethod"
                            orientation="horizontal"
                            variant="card"
                            color="primary"
                            :items="state.paymentMethods"
                        >
                            <template #label="{ item }: { item: PaymentMethod }">
                                <div class="flex items-center gap-2">
                                    <UAvatar :src="item?.icon" size="2xs" />
                                    <span>{{ item?.label }}</span>
                                </div>
                            </template>
                        </URadioGroup>
                    </div>
                </div>

                <!-- Recharge instructions -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">
                        {{ t("marketing.frontend.recharge.rechargeInstructions.title") }}
                    </h2>
                    <div
                        v-if="state.rechargeInstructions"
                        v-html="state.rechargeInstructions"
                        class="text-muted-foreground space-y-2 text-sm whitespace-pre-wrap"
                    ></div>
                    <div v-else class="text-muted-foreground text-sm">
                        {{ t("marketing.frontend.recharge.rechargeInstructions.content") }}
                    </div>
                </div>
            </div>

            <!-- Payment button -->
            <div class="flex items-center justify-between border-t pt-4">
                <div class="text-lg">
                    <span class="text-muted-foreground text-sm">{{
                        t("marketing.frontend.recharge.agreement")
                    }}</span>
                    <UButton variant="link" class="p-0" @click="toServiceTerms">
                        《{{
                            appStore.siteConfig?.agreement.paymentTitle ||
                            t("marketing.frontend.recharge.payment")
                        }}》
                    </UButton>
                </div>
                <div class="flex items-center gap-4">
                    <div v-if="currentOption" class="text-xl font-bold">
                        ¥ {{ currentOption?.sellPrice }}
                    </div>
                    <UButton
                        color="primary"
                        size="lg"
                        :disabled="!rechargeCenterInfo?.rechargeRule.length"
                        loadingAuto
                        @click="handleRecharge"
                    >
                        {{ t("marketing.frontend.recharge.immediatelyPurchase") }}
                    </UButton>
                </div>
            </div>
        </div>
        <!-- Not open -->
        <div v-else class="flex h-full w-full items-center justify-center p-20">
            <div class="w-full max-w-md p-8 text-center">
                <UIcon name="i-lucide-lock" class="text-primary mx-auto mb-4 text-4xl" />
                <h1 class="mb-2 text-2xl font-bold">
                    {{ t("marketing.frontend.recharge.notOpen") }}
                </h1>
                <p class="text-muted-foreground text-sm">
                    {{ t("marketing.frontend.recharge.notOpenTip") }}
                </p>
                <UButton
                    class="mt-6"
                    icon="i-tabler-arrow-left"
                    variant="soft"
                    @click="$router.back()"
                >
                    {{ t("marketing.frontend.recharge.back") }}
                </UButton>
            </div>
        </div>
    </div>
</template>
