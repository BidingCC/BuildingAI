<script setup lang="ts">
import { uiI18nMap } from "@buildingai/i18n-config";
import { AnalyseActionType, apiRecordAnalyse } from "@buildingai/service/common";
import * as uiLocale from "@nuxt/ui/locale";
import colors from "tailwindcss/colors";
import { Analytics } from "@vercel/analytics/nuxt";

const { locale } = useI18n();
const appConfig = useAppConfig();
const colorMode = useColorMode();
const appStore = useAppStore();
const route = useRoute();

const color = computed(() =>
    colorMode.value === "dark" && appConfig.ui.colors.neutral
        ? (colors as never)[appConfig.ui.colors.neutral][900]
        : "white",
);
const radius = computed(() => `:root { --ui-radius: ${appConfig.theme.radius || 0.25}rem; }`);
const blackAsPrimary = computed(() =>
    appConfig.theme.blackAsPrimary
        ? `:root { --ui-primary: black; --color-primary: black; } .dark { --ui-primary: white; --color-primary: white;}`
        : ":root {}",
);

// /** Get Global Configuration */
await useAsyncData("config", () => appStore.getConfig(), {
    lazy: import.meta.server,
});

/** Get Login Settings */
await useAsyncData("loginSettings", () => appStore.getLoginSettings(), {
    lazy: import.meta.server,
});

useHead({
    title: appStore.siteConfig?.webinfo?.name,
    meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { key: "theme-color", name: "theme-color", content: color },
    ],
    link: [
        { rel: "icon", href: appStore.siteConfig?.webinfo?.icon || "/favicon.ico" },
        { rel: "apple-touch-icon", href: appStore.siteConfig?.webinfo?.logo || "/favicon.ico" },
    ],
    style: [
        { innerHTML: radius, id: "nuxt-ui-radius", tagPriority: -2 },
        { innerHTML: blackAsPrimary, id: "nuxt-ui-black-as-primary", tagPriority: -2 },
    ],
    htmlAttrs: {
        lang: useCookie("nuxt-ui-language")?.value || locale.value || "zh-Hans",
    },
});

useSeoMeta({
    title: appStore.siteConfig?.webinfo?.name,
    description: appStore.siteConfig?.webinfo?.description || "",
    ogTitle: appStore.siteConfig?.webinfo?.name,
    ogDescription: appStore.siteConfig?.webinfo?.description || "",
    ogImage: appStore.siteConfig?.webinfo?.logo,
    ogType: "website",
    ogLocale: locale.value,
    ogSiteName: appStore.siteConfig?.webinfo?.name,
});

async function recordPageVisit(path: string) {
    try {
        await apiRecordAnalyse({
            actionType: AnalyseActionType.PAGE_VISIT,
            source: path,
            extraData: {
                referrer: document.referrer || null,
                timestamp: Date.now(),
            },
        });
    } catch (error) {
        console.error("Record page visit failed:", error);
    }
}

recordPageVisit(route.path);
</script>

<template>
    <UApp
        :toaster="appConfig.toaster"
        :locale="uiLocale[uiI18nMap[locale] as keyof typeof uiLocale]"
        data-vaul-drawer-wrapper
    >
        <!-- Loading Indicator -->
        <NuxtLoadingIndicator color="var(--ui-primary)" :height="2" />
        <!-- Route Change Announcer -->
        <NuxtRouteAnnouncer />
        <!-- Vercel Web Analytics -->
        <Analytics />
        <!-- Page Layout -->
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>
