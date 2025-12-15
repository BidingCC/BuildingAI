<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const activeTab = shallowRef("0");

const tabs = computed<{ name: string; label: string }[]>(() => [
    { name: "tabbar", label: t("decorate.mobile.tabs.tabbar") },
    { name: "user", label: t("decorate.mobile.tabs.settings") },
]);

const currentComponent = computed(() => {
    const index = parseInt(activeTab.value, 10);
    const tab = tabs.value[index];
    if (!tab) {
        return defineAsyncComponent(() => import("./components/tabbar/index.vue"));
    }
    return defineAsyncComponent(() => import(`./components/user/index.vue`));
});
</script>

<template>
    <div class="mobile-decorate">
        <div class="mb-4 inline-block w-auto">
            <UTabs
                v-model="activeTab"
                size="md"
                :content="false"
                :items="tabs.map((tab) => ({ label: tab.label }))"
            />
        </div>
        <div>
            <component :is="currentComponent" class="lg:max-w-2xl xl:max-w-4xl" />
        </div>
    </div>
</template>
