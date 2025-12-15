<script setup lang="ts">
import Logo from "@/static/logo.png";

definePage({
    style: {
        navigationBarTitle: "pages.aboutUs",
    },
});

const { t } = useI18n();
const appStore = useAppStore();
const router = useRouter();
</script>

<template>
    <view class="px-4">
        <view flex="~ items-center justify-center" gap="2" py="10">
            <view flex="~ col items-center" gap="2">
                <image
                    :src="appStore.siteConfig?.webinfo.logo || Logo"
                    class="size-14 rounded-lg"
                />
                <text text="foreground xl" font="medium">
                    {{ appStore.siteConfig?.webinfo.name }}
                </text>
                <text text="muted-foreground xs">版本号: v25.2.0 (Build: 20260101)</text>
            </view>
        </view>
        <view class="bg-background rounded-lg px-2">
            <view
                class="flex items-center justify-between pl-2"
                @click="router.navigate({ url: '/pages/agreement/index?url=service' })"
            >
                <view
                    w="full"
                    flex="~ justify-between items-center"
                    class="border-b-solid border-muted border-b py-3 pr-2"
                >
                    <view class="text-foreground text-sm">{{ t("login.userAgreement") }}</view>
                    <view class="text-muted-foreground flex items-center">
                        <text class="i-carbon-chevron-right mt-px" />
                    </view>
                </view>
            </view>
            <view
                class="flex items-center justify-between pl-2"
                @click="router.navigate({ url: '/pages/agreement/index?url=privacy' })"
            >
                <view w="full" flex="~ justify-between items-center" class="py-3 pr-2">
                    <view class="text-foreground text-sm">{{ t("login.privacyPolicy") }}</view>
                    <view class="text-muted-foreground flex items-center">
                        <text class="i-carbon-chevron-right mt-px" />
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>
