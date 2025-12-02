<script setup lang="ts">
import { isDark } from "../hooks/use-dark";
</script>

<template>
    <view class="app" :class="{ dark: isDark }">
        <view class="px-10 py-20 text-center">
            <slot />
            <view class="mx-auto mt-5 text-center text-sm opacity-25"> [Default Layout] </view>
        </view>
    </view>
</template>
