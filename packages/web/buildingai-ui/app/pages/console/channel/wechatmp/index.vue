<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const activeTab = shallowRef("0");

const tabs = computed<{ name: string; label: string }[]>(() => [
    { name: "info", label: t("channel.wechatMP.tabs.info") },
    { name: "version", label: t("channel.wechatMP.tabs.version") },
]);

const currentComponent = shallowRef(defineAsyncComponent(() => import("./components/info.vue")));

watch(
    activeTab,
    (newTab) => {
        const index = parseInt(newTab, 10);
        const tab = tabs.value[index];
        if (!tab) {
            currentComponent.value = defineAsyncComponent(() => import("./components/info.vue"));
        } else {
            currentComponent.value = defineAsyncComponent(
                () => import(`./components/${tab.name}.vue`),
            );
        }
    },
    { immediate: true },
);
</script>

<template>
    <div class="wechatmp">
        <div class="mb-4 inline-block w-auto">
            <UTabs
                v-model="activeTab"
                size="md"
                :content="false"
                :items="tabs.map((tab) => ({ label: tab.label }))"
            />
        </div>
        <div>
            <component :is="currentComponent" :key="activeTab" />
        </div>
    </div>
</template>
