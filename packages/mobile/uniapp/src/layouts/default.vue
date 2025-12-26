<script setup lang="ts">
import { getCurrentPageMeta } from "virtual:pages-meta";
import { useI18n } from "vue-i18n";

import BdNavbar from "@/components/bd-navbar.vue?async";
import BdTabbar from "@/components/bd-tabbar.vue?async";

import { isDark } from "../hooks/use-dark";
// import { updateTabBarTitles } from "../utils/tabbar";

const title = computed(() => getCurrentPageMeta()?.style?.navigationBarTitle);
const hiddenHeader = computed(() => getCurrentPageMeta()?.style?.hiddenHeader !== true);

const { t } = useI18n();

// updateTabBarTitles(t);
uni.hideTabBar();
</script>

<template>
    <view class="app flex h-full flex-col" :class="{ dark: isDark }">
        <slot name="header" v-if="hiddenHeader">
            <BdNavbar :title="t(title)" :show-back="true" :show-home="true" filter="blur(4px)" />
        </slot>
        <slot />
        <BdTabbar />
    </view>
</template>
