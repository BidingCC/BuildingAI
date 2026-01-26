<script lang="ts" setup>
const RechargeTable = defineAsyncComponent(() => import("../components/recharge-table.vue"));
const SubscriptionTable = defineAsyncComponent(
    () => import("../components/subscription-table.vue"),
);

const { t } = useI18n();

/** 当前激活的 Tab */
const activeTab = ref("subscription");

/**
 * Tab 选项配置
 */
const tabItems = computed(() => [
    {
        value: "subscription",
        label: t("order.frontend.subscription.tab.subscription"),
    },
    {
        value: "recharge",
        label: t("order.frontend.subscription.tab.recharge"),
    },
]);

definePageMeta({
    title: "menu.buyRecord",
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="flex h-full flex-col space-y-2 p-2 px-1">
        <!-- Tab 切换 -->
        <UTabs v-model="activeTab" :items="tabItems" class="w-fit" />
        <UCard class="max-h-full" :ui="{ body: 'h-full overflow-hidden flex flex-col' }">
            <!-- 充值记录表格 -->
            <RechargeTable v-if="activeTab === 'recharge'" />

            <!-- 订阅记录表格 -->
            <SubscriptionTable v-else-if="activeTab === 'subscription'" />
        </UCard>
    </div>
</template>
