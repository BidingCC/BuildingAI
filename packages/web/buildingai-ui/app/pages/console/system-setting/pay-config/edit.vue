<script setup lang="ts">
import { PayConfigPayType, type PayConfigType } from "@buildingai/constants/shared";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const componentMap: Record<PayConfigType, () => Promise<Component>> = {
    [PayConfigPayType.WECHAT]: () => import("./components/wechat-pay.vue"),
    [PayConfigPayType.ALIPAY]: () => import("./components/ali-pay.vue"),
};

const formComponent = computed(() => {
    const type = parseInt(route.query.type as string) as PayConfigType;
    const loader = componentMap[type];
    return loader ? defineAsyncComponent(loader) : null;
});

const pageTitle = computed(() => {
    const type = parseInt(route.query.type as string) as PayConfigType;
    switch (type) {
        case PayConfigPayType.WECHAT:
            return t("payment-config.wxTitle");
        case PayConfigPayType.ALIPAY:
            return t("payment-config.aliTitle");
        default:
            return "Unavailable";
    }
});
</script>

<template>
    <div class="user-edit-container">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ $t("console-common.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">{{ pageTitle }}</h1>
        </div>
        <Component :is="formComponent"></Component>
    </div>
</template>
