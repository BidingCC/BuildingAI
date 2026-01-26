<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const tabs = computed<{ name: string; label: string }[]>(() => [
    { name: "information", label: t("system.website.tabs.information") },
    { name: "copyright", label: t("system.website.tabs.copyright") },
    { name: "statistics", label: t("system.website.tabs.statistics") },
]);

const activeTab = computed({
    get: () => {
        const index = tabs.value.findIndex((t) => t.name === route.query.tab);
        return index >= 0 ? index.toString() : "0";
    },
    set: (v: string) => {
        const index = parseInt(v, 10);
        const validIndex = Math.max(0, Math.min(index, tabs.value.length - 1));
        const tabName = tabs.value[validIndex]?.name || tabs.value[0]?.name || "information";
        router.replace({
            query: { tab: tabName },
        });
    },
});

const currentComponent = computed(() => {
    const index = parseInt(activeTab.value, 10);
    const tab = tabs.value[index];
    if (!tab) {
        return defineAsyncComponent(() => import("./components/information.vue"));
    }
    return defineAsyncComponent(() => import(`./components/${tab.name}.vue`));
});
</script>

<template>
    <div class="system-website flex h-full flex-col">
        <div class="inline-block w-auto">
            <UTabs
                v-model="activeTab"
                size="md"
                :content="false"
                :items="tabs.map((tab) => ({ label: tab.label }))"
                class="w-fit"
            />
        </div>

        <div class="flex-1 overflow-y-auto">
            <component :is="currentComponent" class="lg:max-w-2xl xl:max-w-4xl" />
        </div>
    </div>
</template>
