<script lang="ts" setup>
import { ROUTES } from "@buildingai/constants/web";

import Logo from "../../../../../buildingai-ui/public/logo.svg";
import LogoFull from "../../../../../buildingai-ui/public/logo-full.svg";

const props = defineProps<{
    layout: "side" | "mixture";
    collapsed?: boolean;
    isWeb?: boolean;
}>();

const appStore = useAppStore();

/**
 * Navigate back to home page
 */
function backToHome() {
    navigateTo(ROUTES.HOME);
}

defineOptions({ inheritAttrs: false });
</script>

<template>
    <h1
        v-if="props.layout === 'side'"
        v-bind="$attrs"
        class="hover:bg-secondary dark:hover:bg-surface-800 flex cursor-pointer items-center rounded-xl transition-all select-none"
        :class="{
            'p-1': props.collapsed,
            'p-2': !props.collapsed,
            'gap-2': !appStore.siteConfig?.webinfo.logo,
        }"
        @click="backToHome"
    >
        <div
            class="flex flex-none items-center gap-2 rounded-lg transition-all"
            :class="{
                'justify-center': !appStore.siteConfig?.webinfo.logo,
            }"
        >
            <NuxtImg
                v-if="appStore.siteConfig?.webinfo.logo"
                :src="appStore.siteConfig?.webinfo.logo"
                alt="Logo"
                class="size-9"
            />

            <Logo v-else class="text-background size-9" :fontControlled="false" filled />
        </div>
        <div
            class="flex flex-col gap-0.5 truncate leading-none whitespace-nowrap"
            :class="{ hidden: props.collapsed }"
        >
            <span class="text-sm font-bold">{{ appStore.siteConfig?.webinfo.name }}</span>
            <span v-if="!props.isWeb" class="text-muted-foreground truncate text-xs">
                {{ $t("layouts.admin") }}
            </span>
        </div>
    </h1>
    <h1 v-if="props.layout === 'mixture'" class="flex items-center truncate" @click="backToHome">
        <template v-if="appStore.siteConfig?.webinfo.logo">
            <NuxtImg
                :src="appStore.siteConfig?.webinfo.logo"
                alt="Logo"
                class="h-8 w-8 flex-none"
            />
            <span class="ml-2 truncate text-lg font-bold">
                {{ appStore.siteConfig?.webinfo.name }}
            </span>
        </template>

        <LogoFull v-else class="text-foreground h-6" filled :fontControlled="false" />
    </h1>
</template>
