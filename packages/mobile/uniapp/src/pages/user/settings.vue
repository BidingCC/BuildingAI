<script setup lang="ts">
const { t, currentLocale, currentLocaleLabel, locales, setLocale } = useLocale();

definePage({
    style: {
        navigationBarTitleText: "设置",
    },
});

// Show locale picker
function showLocalePicker() {
    uni.showActionSheet({
        itemList: locales.map(l => l.label),
        success: (res) => {
            setLocale(locales[res.tapIndex].value);
        },
    });
}
</script>

<template>
    <view class="p-4">
        <view class="mb-4 text-lg font-bold dark:text-white">
            {{ t("common.settings") }}
        </view>

        <!-- Language Setting -->
        <view
            class="flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-800"
            @click="showLocalePicker"
        >
            <view class="dark:text-white">{{ t("common.language") }}</view>
            <view class="flex items-center text-gray-500">
                <text>{{ currentLocaleLabel }}</text>
                <text class="i-carbon-chevron-right ml-1" />
            </view>
        </view>

        <!-- Current locale info -->
        <view class="mt-4 text-sm text-gray-400">
            Current: {{ currentLocale }}
        </view>
    </view>
</template>
