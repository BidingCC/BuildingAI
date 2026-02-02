<script setup lang="ts">
definePageMeta({ auth: false });

import { type ExtensionFormData } from "@buildingai/service/consoleapi/extensions";
import { apiGetWebExtensionDetailByIdentifier } from "@buildingai/service/webapi/extension";

const route = useRoute();

const isConsoleRoute = computed(() => route.path.includes("/console"));

const extensionId = computed(() => {
    if (isConsoleRoute.value) return "";
    return route.fullPath.match(/\/app\/([^/]+)/)?.[1] || "";
});

const { data: extensionInfo } = await useAsyncData<ExtensionFormData | null>(
    `extension-info-${extensionId.value}`,
    async () => {
        if (!extensionId.value) return null;
        try {
            return await apiGetWebExtensionDetailByIdentifier(extensionId.value);
        } catch (error) {
            console.error("[extension] Failed to load extension info:", error);
            return null;
        }
    },
    {
        default: () => null,
        watch: [extensionId],
    },
);

const extensionIconUrl = computed(
    () => extensionInfo.value?.aliasIcon || extensionInfo.value?.icon || "",
);
const extensionDisplayName = computed(
    () =>
        extensionInfo.value?.alias || extensionInfo.value?.name || extensionId.value || "Extension",
);

const extensionPath = computed(() => {
    const all = route.params.all;
    return Array.isArray(all) && all.length > 1 ? all.slice(1).join("/") : "";
});

const iframeUrl = computed(() => {
    const base = `/extension/${extensionId.value}/`;
    return extensionPath.value ? `${base}${extensionPath.value}` : base;
});

const iframeRef = ref<HTMLIFrameElement | null>(null);
const isUpdatingFromRoute = ref(false);
const isUpdatingFromIframe = ref(false);
const isIframeLoading = ref(true);

const buildRoutePath = (path: string) => {
    return path ? `/app/${extensionId.value}/${path}` : `/app/${extensionId.value}`;
};

const updateUrl = (newRoutePath: string) => {
    if (route.path === newRoutePath) return;
    isUpdatingFromIframe.value = true;
    window.history.replaceState({ ...window.history.state }, "", newRoutePath);
    nextTick(() => {
        isUpdatingFromIframe.value = false;
    });
};

const syncIframeUrlToRoute = () => {
    if (
        isConsoleRoute.value ||
        !iframeRef.value?.contentWindow ||
        isUpdatingFromRoute.value ||
        isUpdatingFromIframe.value
    ) {
        return;
    }

    try {
        const { pathname, search, hash } = iframeRef.value.contentWindow.location;
        const match = (pathname + search + hash).match(/^\/extension\/[^/]+\/(.*)$/);
        updateUrl(buildRoutePath(match?.[1] || ""));
    } catch {
        // Cross-origin
    }
};

const handleIframeLoad = () => {
    isIframeLoading.value = false;
    nextTick(syncIframeUrlToRoute);
};

watch(
    () => extensionPath.value,
    (newPath) => {
        if (isConsoleRoute.value || !iframeRef.value || isUpdatingFromIframe.value) return;

        const targetUrl = newPath
            ? `/extension/${extensionId.value}/${newPath}`
            : `/extension/${extensionId.value}/`;

        if (iframeRef.value.src.endsWith(targetUrl)) return;

        isUpdatingFromRoute.value = true;
        isIframeLoading.value = true;
        iframeRef.value.src = targetUrl;
        nextTick(() => {
            isUpdatingFromRoute.value = false;
        });
    },
);

watch(
    () => extensionId.value,
    () => {
        if (isConsoleRoute.value) return;
        isIframeLoading.value = true;
    },
);

onMounted(() => {
    const handleMessage = (event: MessageEvent) => {
        const { type, path } = event.data || {};
        if (type !== "extension-navigation" || path.startsWith("console")) return;
        updateUrl(buildRoutePath(path));
    };

    window.addEventListener("message", handleMessage);
    onUnmounted(() => window.removeEventListener("message", handleMessage));
});
</script>

<template>
    <div v-if="!isConsoleRoute" class="relative h-full w-full">
        <iframe
            ref="iframeRef"
            :src="iframeUrl"
            class="h-full w-full border-0"
            :title="`Extension Frontend: ${extensionId}`"
            loading="eager"
            @load="handleIframeLoad"
        />

        <!-- Iframe Loading Overlay (Tailwind, style reference: spa-loading-template.html) -->
        <div
            v-if="isIframeLoading"
            class="absolute inset-0 z-999999 flex items-center justify-center bg-[#f8f9fa] text-inherit dark:bg-[#121212] dark:text-[#ddd]"
        >
            <div class="flex flex-col items-center gap-6">
                <div class="flex size-[240px] items-center justify-center">
                    <div
                        class="animate-[pulse_1.5s_ease-in-out_infinite] drop-shadow-[0_0_12px_rgba(81,10,252,0.2)] motion-reduce:animate-none dark:drop-shadow-[0_0_12px_rgba(81,10,252,0.35)]"
                    >
                        <UAvatar
                            :src="extensionIconUrl || undefined"
                            :alt="extensionDisplayName"
                            icon="i-lucide-puzzle"
                            :ui="{
                                root: `size-12 rounded-xl ${extensionIconUrl ? '' : 'bg-primary'}`,
                                icon: 'size-6 text-white',
                            }"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
    <NuxtPage v-else />
</template>
