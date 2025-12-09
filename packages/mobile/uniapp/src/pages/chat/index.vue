<script setup lang="ts">
import { useRouter } from "@uni-helper/uni-use";

const { t, currentLocale, currentLocaleLabel, locales, setLocale } = useLocale();

definePage({
    style: {
        navigationBarTitle: "pages.chat",
    },
    middleware: ["auth"],
});

const router = useRouter();

const handleClick = () => {
    router.navigate({
        url: "/pages/about_us/index",
    });
};

const showLocalePicker = () => {
    uni.showActionSheet({
        itemList: locales.map((l) => l.label),
        success: (res) => {
            setLocale(locales[res.tapIndex ?? 0]?.value ?? "en");
            updateTabBarTitles(t);
        },
    });
};
</script>

<template>
    <view class="p-4">
        <view class="dark:text-primary text-center text-2xl font-bold text-black">
            {{ t("pages.chat") }}
        </view>

        <view class="mt-8">
            <view
                class="flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-800"
                @click="showLocalePicker"
            >
                <view class="dark:text-white">{{ t("common.language") || "Language" }}</view>
                <view class="flex items-center text-gray-500">
                    <text>{{ currentLocaleLabel }}</text>
                    <text class="i-carbon-chevron-right ml-1" />
                </view>
            </view>
        </view>

        <view class="mt-4 text-sm text-gray-500">Current: {{ currentLocale }}</view>

        <view class="mt-8" @click="handleClick">
            <view class="text-center text-gray-400">Click to navigate</view>
        </view>
    </view>
</template>
