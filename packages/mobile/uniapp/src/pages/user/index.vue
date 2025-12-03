<script setup lang="ts">
const { t } = useI18n();

definePage({
    style: {
        navigationBarTitle: "pages.user",
    },
});
</script>

<template>
    <div>
        <view class="dark:text-primary text-center text-2xl font-bold text-black">
            {{ t("pages.user") }}
        </view>
    </div>
</template>
