<script setup lang="ts">
import Logo from "@/static/logo.png";
const appStore = useAppStore();

const websiteInfo = computed(() => {
    return appStore.siteConfig?.webinfo;
});
</script>

<template>
    <view class="flex flex-col items-center justify-center gap-2">
        <image :src="websiteInfo?.logo || Logo" size="144rpx" />
        <text class="text-xl font-bold">{{ websiteInfo?.name }}</text>
    </view>
</template>
