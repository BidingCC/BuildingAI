<script setup lang="ts">
import { getCurrentPageTitle } from "virtual:pages-meta";
import { useI18n } from "vue-i18n";

import { isDark } from "../hooks/use-dark";
import { updateTabBarTitles } from "../utils/tabbar";

const title = computed(() => getCurrentPageTitle());
const { t } = useI18n();

updateTabBarTitles(t);
</script>

<template>
    <view class="app flex h-full flex-col" :class="{ dark: isDark }">
        <slot name="header">
            <bd-navbar :title="t(title)" :show-back="true" :show-home="true" />
        </slot>
        <slot />
    </view>
</template>
