<script setup lang="ts">
const { t } = useI18n();

definePage({
    style: {
        navigationBarTitle: "pages.apps",
    },
});
</script>

<template>
    <div>
        <view class="dark:text-primary text-center text-2xl font-bold text-black">
            {{ t("pages.apps") }}
        </view>
    </div>
</template>
