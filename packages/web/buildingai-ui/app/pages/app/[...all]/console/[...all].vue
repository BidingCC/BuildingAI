<script setup lang="ts">
definePageMeta({
    layout: "extension",
    auth: true,
});

const route = useRoute();

const extensionId = computed(() => {
    return route.fullPath.match(/\/app\/([^/]+)\/console/)?.[1] || "";
});

const consolePath = computed(() => {
    return route.fullPath.match(/\/app\/[^/]+\/console\/(.*)$/)?.[1]?.replace(/\/$/, "") || "";
});

const iframeUrl = computed(() => {
    if (!extensionId.value) return `/extension/console`;
    const base = `/extension/${extensionId.value}/console`;
    return consolePath.value ? `${base}/${consolePath.value}` : base;
});

const iframeRef = ref<HTMLIFrameElement | null>(null);
const isUpdatingFromRoute = ref(false);
const isUpdatingFromIframe = ref(false);

const buildRoutePath = (path: string) => {
    return path ? `/app/${extensionId.value}/console/${path}` : `/app/${extensionId.value}/console`;
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
    if (!iframeRef.value?.contentWindow || isUpdatingFromRoute.value || isUpdatingFromIframe.value)
        return;

    try {
        const { pathname, search, hash } = iframeRef.value.contentWindow.location;
        const match = (pathname + search + hash).match(/^\/extension\/[^/]+\/console\/(.*)$/);
        updateUrl(buildRoutePath(match?.[1] || ""));
    } catch {
        // Cross-origin
    }
};

watch(
    () => consolePath.value,
    (newPath) => {
        if (!iframeRef.value || isUpdatingFromIframe.value) return;

        const targetUrl = newPath
            ? `/extension/${extensionId.value}/console/${newPath}`
            : `/extension/${extensionId.value}/console`;

        if (iframeRef.value.src.endsWith(targetUrl)) return;

        isUpdatingFromRoute.value = true;
        iframeRef.value.src = targetUrl;
        nextTick(() => {
            isUpdatingFromRoute.value = false;
        });
    },
);

onMounted(() => {
    const handleMessage = (event: MessageEvent) => {
        const { type, path } = event.data || {};
        if (type !== "extension-navigation" || !path) return;

        const newPath = path.startsWith("console/") ? path.replace(/^console\/?/, "") : path;
        updateUrl(buildRoutePath(newPath));
    };

    window.addEventListener("message", handleMessage);
    onUnmounted(() => window.removeEventListener("message", handleMessage));
});

useHead({
    title: `Extension Console: ${extensionId.value}`,
    meta: [{ name: "description", content: `Extension console: ${extensionId.value}` }],
});
</script>

<template>
    <iframe
        ref="iframeRef"
        :src="iframeUrl"
        class="h-full w-full border-0"
        :title="`Extension Console: ${extensionId}`"
        @load="() => nextTick(syncIframeUrlToRoute)"
    />
</template>
