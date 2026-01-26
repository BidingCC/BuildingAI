<script lang="ts" setup>
import { PayConfigPayType, type PayConfigType } from "@buildingai/constants/shared";
import type {
    MemberCenterInfo,
    MembershipOrderInfo,
    MembershipPlan,
} from "@buildingai/service/webapi/member-center";
import {
    apiGetMemberCenterInfo,
    apiSubmitMembershipOrder,
} from "@buildingai/service/webapi/member-center";
import type { PrepaidInfo } from "@buildingai/service/webapi/recharge-center";
import { apiGetPayResult, apiPostPrepaid } from "@buildingai/service/webapi/recharge-center";

const PaymentQrModal = defineAsyncComponent(() => import("../../components/payment-qr-modal.vue"));
const MemberSuccessModal = defineAsyncComponent(
    () => import("../../components/member-success-modal.vue"),
);
const SubscriptionModal = defineAsyncComponent(
    () => import("../../components/subscription-modal.vue"),
);

/**
 * 支付方式接口
 */
interface PaymentMethod {
    value: number;
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
    orderInfo: null as MembershipOrderInfo | null,
    plans: [] as MembershipPlan[],
    paymentMethods: [] as PaymentMethod[],
    selectedPlanIndex: 0,
    selectedLevelIndex: 0,
    selectedPaymentMethod: PayConfigPayType.WECHAT as PayConfigType,
    membershipSuccess: false,
    isQrCodeExpired: false,
    membershipStatus: false,
});

/**
 * 支付轮询
 */
const { start: startPaymentPolling, clear: stopPaymentPolling } = usePollingTask(
    async (stopPolling) => {
        try {
            if (!state.orderInfo?.orderId) {
                stopPolling();
                return;
            }

            const res = await apiGetPayResult({
                orderId: state.orderInfo.orderId,
                from: "membership",
            });

            if (res.payState === 1) {
                stopPolling();
                await refreshMemberCenterInfo();
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
            if (!state.membershipSuccess) {
                state.isQrCodeExpired = true;
            }
        },
    },
);

/**
 * 获取会员中心信息
 */
const { data: memberCenterInfo } = await useAsyncData(
    "memberCenterInfo",
    () => apiGetMemberCenterInfo(),
    {
        transform: (data: MemberCenterInfo) => {
            state.paymentMethods = data.payWayList.map((item) => ({
                value: item.payType,
                label: item.name,
                icon: item.logo,
            }));
            state.plans = data.plans.filter((plan) => plan.status);
            state.membershipStatus = data.membershipStatus;
            return data;
        },
    },
);

/**
 * 刷新会员中心信息
 */
const refreshMemberCenterInfo = async (): Promise<void> => {
    try {
        const res = await apiGetMemberCenterInfo();
        state.plans = res.plans.filter((plan) => plan.status);
    } catch (error) {
        console.error("Failed to refresh member center info:", error);
    }
};

/**
 * 当前选中的套餐
 */
const currentPlan = computed(() => {
    if (state.plans.length === 0) return null;
    return state.plans[state.selectedPlanIndex];
});

/**
 * 当前套餐可用的等级列表
 */
const availableLevels = computed(() => {
    if (!currentPlan.value?.billing) return [];
    return currentPlan.value.billing.filter((item) => item.status && item.level);
});

/**
 * 当前选中的等级计费项
 */
const currentBillingItem = computed(() => {
    if (availableLevels.value.length === 0) return null;
    return availableLevels.value[state.selectedLevelIndex];
});

/**
 * 套餐时长选择 tabs 配置
 */
const planTabs = computed(() => {
    return state.plans.map((plan) => ({
        label: plan.name,
        value: plan.id,
        discount: plan.label,
    }));
});

/**
 * 当前选中的套餐 ID
 */
const selectedPlanId = computed({
    get: () => state.plans[state.selectedPlanIndex]?.id || "",
    set: (val: string) => {
        const index = state.plans.findIndex((p) => p.id === val);
        if (index !== -1) {
            handlePlanChange(index);
        }
    },
});

/**
 * 格式化用户订阅到期时间
 */
const formatSubscriptionEndTime = computed(() => {
    if (!memberCenterInfo.value?.userSubscription) return "";
    const endTime = new Date(memberCenterInfo.value.userSubscription.endTime);
    return endTime.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
});

/**
 * 处理套餐切换
 */
const handlePlanChange = (index: number): void => {
    state.selectedPlanIndex = index;
    state.selectedLevelIndex = 0;
};

/**
 * 处理等级选择
 */
const handleLevelSelect = (index: number): void => {
    state.selectedLevelIndex = index;
};

/**
 * 处理订阅购买
 */
const handleSubscribe = async (): Promise<void> => {
    try {
        if (!currentPlan.value || !currentBillingItem.value) {
            toast.error(t("membership.frontend.center.noOptionSelected"));
            return;
        }

        const res = await apiSubmitMembershipOrder({
            planId: currentPlan.value.id,
            levelId: currentBillingItem.value.levelId,
            payType: state.selectedPaymentMethod,
        });
        state.orderInfo = res;

        const prepaidInfo = await apiPostPrepaid({
            from: "membership",
            orderId: res.orderId,
            payType: state.selectedPaymentMethod,
        });
        mountPaymentModal(prepaidInfo);
        state.isQrCodeExpired = false;
        state.membershipSuccess = false;
        startPaymentPolling();
    } catch (error) {
        console.error("Subscribe failed:", error);
    }
};

/**
 * 挂载支付二维码弹窗
 */
const paymentModal = overlay.create(PaymentQrModal);
const mountPaymentModal = async (prepaidInfo: PrepaidInfo): Promise<void> => {
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
        toast.warning(t("membership.frontend.center.cancelPay"));
    }
};

/**
 * 挂载成功弹窗
 */
const mountSuccessModal = async (): Promise<void> => {
    const modal = overlay.create(MemberSuccessModal);
    const instance = modal.open();
    paymentModal.close();
    const shouldRefresh = await instance.result;
    // 关闭弹窗后刷新会员中心信息
    await refreshMemberCenterInfo();
    if (shouldRefresh) {
        router.push(`/profile/${userStore.userInfo?.id}/purchase-record`);
    }
};

/**
 * 刷新二维码
 */
const handleRefreshQrCode = async (): Promise<void> => {
    try {
        stopPaymentPolling();
        if (!state.orderInfo?.orderId) {
            console.error("Order ID does not exist");
            toast.error(t("membership.frontend.center.orderNotFound"));
            return;
        }

        const prepaidInfo = await apiPostPrepaid({
            from: "membership",
            orderId: state.orderInfo.orderId,
            payType: state.selectedPaymentMethod,
        });
        mountPaymentModal(prepaidInfo);
        state.isQrCodeExpired = false;
        state.membershipSuccess = false;
        startPaymentPolling();
    } catch (error) {
        console.error("Failed to refresh QR code:", error);
    }
};

/**
 * 打开订阅管理弹框
 */
const handleSubscription = async (): Promise<void> => {
    const modal = overlay.create(SubscriptionModal);
    const instance = modal.open();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        refreshMemberCenterInfo();
    }
};

/**
 * 跳转到服务条款
 */
const toServiceTerms = (): void => {
    window.open("/agreement?type=agreement&item=payment", "_blank");
};

/**
 * 跳转到算力明细
 */
const toPowerDetail = (): void => {
    router.push(`/profile/${userStore.userInfo?.id}/power-detail`);
};

onUnmounted(() => {
    stopPaymentPolling();
});

definePageMeta({
    title: "menu.memberCenter",
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="h-full">
        <div v-if="state.membershipStatus" class="flex h-full flex-col space-y-4 px-6 pt-6">
            <div class="flex flex-1 flex-col space-y-8 overflow-y-auto">
                <!-- 用户信息 -->
                <div
                    v-if="memberCenterInfo?.userSubscription"
                    class="bg-muted flex items-center justify-between rounded-lg p-4"
                >
                    <div class="flex items-center gap-4">
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
                            <div class="text-muted-foreground flex items-center gap-2 text-sm">
                                <template v-if="memberCenterInfo?.userSubscription">
                                    <span>
                                        {{ memberCenterInfo.userSubscription.level?.name }}
                                    </span>
                                    <USeparator orientation="vertical" class="h-3" />
                                    <span>
                                        {{
                                            t("membership.frontend.center.expireAt", {
                                                time: formatSubscriptionEndTime,
                                            })
                                        }}
                                    </span>
                                    <UBadge
                                        v-if="memberCenterInfo.userSubscription.isExpired"
                                        color="error"
                                        size="xs"
                                    >
                                        {{ t("membership.frontend.center.expired") }}
                                    </UBadge>
                                </template>
                                <template v-else>
                                    <span>{{ t("membership.frontend.center.normalUser") }}</span>
                                </template>
                                <div
                                    class="text-primary cursor-pointer pl-4"
                                    @click="handleSubscription"
                                >
                                    {{ t("membership.frontend.center.subscriptionManagement") }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        class="flex cursor-pointer items-center gap-1 text-right"
                        @click="toPowerDetail"
                    >
                        <div>
                            <div class="text-muted-foreground text-sm">
                                {{ t("membership.frontend.center.myPower") }}
                            </div>
                            <div class="text-primary flex items-center gap-1 text-xl font-bold">
                                <UIcon name="i-lucide-sparkles" class="text-lg" />
                                <div>{{ memberCenterInfo?.user.power || 0 }}</div>
                                <UIcon
                                    name="i-lucide-chevron-right"
                                    class="text-muted-foreground"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 套餐时长选择 -->
                <div class="flex justify-center">
                    <UTabs
                        v-model="selectedPlanId"
                        :items="planTabs"
                        :content="false"
                        variant="pill"
                        :ui="{
                            label: 'text-muted-foreground dark:text-white px-2',
                            list: 'gap-4 rounded-full',
                            indicator: 'rounded-full bg-white dark:bg-black font-extrabold',
                            trigger:
                                'px-2 py-1.5 text-sm font-normal data-[state=active]:font-extrabold',
                        }"
                    >
                        <template #default="{ item }">
                            <div
                                class="flex items-center gap-2"
                                :class="{ 'text-primary': item.value === selectedPlanId }"
                            >
                                <span>{{ item.label }}</span>
                                <span v-if="item.discount" class="text-primary text-xs font-normal">
                                    {{ item.discount }}
                                </span>
                            </div>
                        </template>
                    </UTabs>
                </div>

                <!-- 会员等级卡片 -->
                <div v-if="availableLevels.length > 0" class="flex justify-center gap-5">
                    <div
                        v-for="(item, index) in availableLevels"
                        :key="item.levelId"
                        class="border-muted relative max-h-90 w-60 cursor-pointer rounded-xl border bg-white p-5 transition-all duration-200 dark:bg-gray-900/5"
                        :class="[
                            state.selectedLevelIndex === index
                                ? 'border-primary shadow-primary/10 shadow-lg'
                                : 'hover:border-primary border-muted',
                        ]"
                        @click="handleLevelSelect(index)"
                    >
                        <!-- 推荐标签 -->
                        <div
                            v-if="item.label"
                            class="absolute -top-4 left-0 rounded-tl-md rounded-br-md bg-[#352B00] px-2 py-0.5 text-xs text-[#FFE7B5]"
                        >
                            {{ item.label }}
                        </div>

                        <!-- 等级名称和图标 -->
                        <div
                            class="mb-3 flex items-center gap-1.5"
                            :class="{ 'pt-1': index === 0 }"
                        >
                            <UAvatar :src="item.level?.icon" size="xs" />
                            <span class="text-sm font-medium">{{ item.level?.name }}</span>
                        </div>

                        <!-- 价格 -->
                        <div class="mb-3 flex items-baseline gap-1">
                            <span class="text-primary text-xl font-bold">
                                ¥{{ item.salesPrice }}
                            </span>
                            <span
                                v-if="item.originalPrice !== item.salesPrice && item.originalPrice"
                                class="text-muted-foreground text-xs line-through"
                            >
                                ¥{{ item.originalPrice }}/月
                            </span>
                        </div>

                        <!-- 赠送算力 -->
                        <div class="mb-3 flex items-start gap-1.5 text-xs">
                            <UIcon
                                v-if="item.level?.givePower"
                                name="i-lucide-zap"
                                class="text-primary mt-0.5 shrink-0"
                            />
                            <div>
                                <div v-if="item.level?.givePower" class="font-medium">
                                    {{
                                        t("membership.frontend.center.givePower", {
                                            power: item.level.givePower,
                                        })
                                    }}
                                </div>
                                <div v-if="item.level?.description" class="text-muted-foreground">
                                    {{ item.level.description }}
                                </div>
                            </div>
                        </div>

                        <!-- 权益列表 -->
                        <div class="space-y-2">
                            <div
                                v-for="(benefit, bIndex) in item.level?.benefits || []"
                                :key="bIndex"
                                class="flex items-center gap-1.5 text-xs"
                            >
                                <UIcon
                                    v-if="!benefit.icon"
                                    name="i-lucide-check"
                                    class="text-muted-foreground shrink-0"
                                    size="16"
                                />
                                <UAvatar
                                    v-else
                                    :src="benefit.icon"
                                    size="3xs"
                                    class="text-muted-foreground shrink-0"
                                />
                                <span class="text-muted-foreground">
                                    {{ benefit.content }}
                                </span>
                            </div>
                        </div>

                        <!-- 选中标记 -->
                        <div
                            v-if="state.selectedLevelIndex === index"
                            class="bg-primary absolute right-0 bottom-0 flex h-7 w-8 items-center justify-center rounded-tl-lg rounded-br-lg text-white"
                        >
                            <UIcon name="i-lucide-check" class="text-sm" />
                        </div>
                    </div>
                </div>
                <div v-else class="text-muted-foreground py-8 text-center">
                    {{ t("membership.frontend.center.noLevelsAvailable") }}
                </div>

                <!-- 支付方式 -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">
                        {{ t("membership.frontend.center.paymentMethod") }}
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
            </div>

            <!-- 底部支付栏 -->
            <div class="flex items-center justify-between border-t pt-4">
                <div class="text-sm">
                    <span class="text-muted-foreground">
                        {{ t("membership.frontend.center.agreement") }}
                    </span>
                    <UButton variant="link" class="p-0" @click="toServiceTerms">
                        《{{
                            appStore.siteConfig?.agreement.paymentTitle ||
                            t("membership.frontend.center.paymentAgreement")
                        }}》
                    </UButton>
                </div>
                <div class="flex items-center gap-4">
                    <div v-if="currentBillingItem" class="text-xl font-bold">
                        ¥{{ currentBillingItem.salesPrice }}
                    </div>
                    <UButton
                        color="primary"
                        size="lg"
                        :disabled="!currentBillingItem"
                        loadingAuto
                        @click="handleSubscribe"
                    >
                        {{ t("membership.frontend.center.subscribe") }}
                    </UButton>
                </div>
            </div>
        </div>

        <!-- 未开放 -->
        <div v-else class="flex h-full w-full items-center justify-center p-20">
            <div class="w-full max-w-md p-8 text-center">
                <UIcon name="i-lucide-lock" class="text-primary mx-auto mb-4 text-4xl" />
                <h1 class="mb-2 text-2xl font-bold">
                    {{ t("membership.frontend.center.notOpen") }}
                </h1>
                <p class="text-muted-foreground text-sm">
                    {{ t("membership.frontend.center.notOpenTip") }}
                </p>
                <UButton
                    class="mt-6"
                    icon="i-tabler-arrow-left"
                    variant="soft"
                    @click="$router.back()"
                >
                    {{ t("membership.frontend.center.back") }}
                </UButton>
            </div>
        </div>
    </div>
</template>
