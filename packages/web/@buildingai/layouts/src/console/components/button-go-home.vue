<script setup lang="ts">
const handleClick = () => {
    const runtimeConfig = useRuntimeConfig();

    if (runtimeConfig.public.isPlugin) {
        window.location.href = "/";
    } else {
        navigateTo("/");
    }
};
</script>

<template>
    <UTooltip :text="$t('layouts.goHome')" :delay-duration="0">
        <UButton
            data-sidebar="trigger"
            variant="ghost"
            color="neutral"
            size="xs"
            :ui="{ base: 'py-2' }"
            @click="handleClick"
        >
            <UIcon name="i-lucide-house" class="size-4" />
            <span>{{ $t("common.goHomeText") }}</span>
        </UButton>
    </UTooltip>
</template>
