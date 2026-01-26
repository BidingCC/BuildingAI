<script setup lang="ts">
import { PluginLayout } from "@buildingai/layouts/console";
import type { PluginMenuItem } from "@buildingai/layouts/console/menu";
import { apiGetExtensionPluginLayout } from "@buildingai/service/consoleapi/extensions";

const extensionId = computed(() => {
    const match = useRoute().fullPath.match(/\/buildingai\/extension\/([^/]+)\/console/);
    return match ? match[1] : "";
});

// Fetch plugin layout configuration from API
const { data: layoutConfig } = await useAsyncData(
    `plugin-layout-${extensionId.value}`,
    () => {
        if (!extensionId.value) {
            throw new Error("Extension ID is required");
        }
        return apiGetExtensionPluginLayout(extensionId.value);
    },
    {
        default: () => ({
            manifest: null,
            consoleMenu: null,
        }),
    },
);

// Get manifest and consoleMenu directly from API response
const manifest = computed(() => {
    const m = layoutConfig.value?.manifest;
    if (!m) return null;
    // Ensure author has required fields
    return {
        ...m,
        author: m.author || { name: "", homepage: "" },
    };
});

const consoleMenu = computed<PluginMenuItem[] | undefined>(() => {
    return layoutConfig.value?.consoleMenu as PluginMenuItem[] | undefined;
});
</script>

<template>
    <PluginLayout v-if="manifest" :menu="consoleMenu" :manifest="manifest" />
    <div v-else class="flex h-screen items-center justify-center">
        <div class="text-center">
            <p class="text-lg font-semibold">Loading extension layout...</p>
            <p class="text-sm text-gray-500">Waiting for extension configuration...</p>
        </div>
    </div>
</template>
