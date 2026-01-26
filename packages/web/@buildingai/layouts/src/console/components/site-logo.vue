<script lang="ts" setup>
import { ROUTES } from "@buildingai/constants/web";

import LogoFull from "../../../../../buildingai-ui/public/logo-full.svg";

const props = defineProps<{
    layout: "side" | "mixture";
    collapsed?: boolean;
    isWeb?: boolean;
}>();

const appStore = useAppStore();

function backToHome() {
    return navigateTo(ROUTES.HOME);
}

defineOptions({ inheritAttrs: false });
</script>

<template>
    <h1
        v-if="props.layout === 'side'"
        v-bind="$attrs"
        class="hover:bg-secondary dark:hover:bg-surface-800 flex cursor-pointer items-center gap-2 rounded-xl transition-all select-none"
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

            <UIcon v-else name="system-logo" class="text-background size-9" />
        </div>
        <div
            class="flex flex-col gap-0.5 truncate leading-none whitespace-nowrap"
            :class="{ hidden: props.collapsed }"
        >
            <span class="text-sm font-bold">{{ appStore.siteConfig?.webinfo.name }}</span>
            <div class="flex items-center gap-1">
                <span v-if="!props.isWeb" class="text-muted-foreground truncate text-xs">
                    {{ $t("layouts.admin") }}
                </span>
                <UBadge
                    v-if="!props.isWeb && appStore.siteConfig?.webinfo?.version"
                    variant="soft"
                    class="text-xs"
                >
                    v{{ appStore.siteConfig.webinfo.version }}
                </UBadge>
            </div>
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

        <!-- 没有logo的时候显示全称 -->
        <LogoFull v-else class="text-foreground h-6" filled :fontControlled="false" />
        <!-- <UIcon v-else name="system-logo-full" class="text-foreground h-6" /> -->
    </h1>
</template>
