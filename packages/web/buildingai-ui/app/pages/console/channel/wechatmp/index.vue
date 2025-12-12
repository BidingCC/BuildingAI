<script setup lang="ts">
const activeTab = shallowRef("0");

const tabs = computed<{ name: string; label: string }[]>(() => [
    { name: "info", label: "小程序配置" },
    { name: "version", label: "版本管理" },
]);

const currentComponent = computed(() => {
    const index = parseInt(activeTab.value, 10);
    const tab = tabs.value[index];
    if (!tab) {
        return defineAsyncComponent(() => import("./components/info.vue"));
    }
    return defineAsyncComponent(() => import(`./components/${tab.name}.vue`));
});
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
            <component :is="currentComponent" class="lg:max-w-2xl xl:max-w-4xl" />
        </div>
    </div>
</template>
