<script setup lang="ts">
import type { ExtensionFormData } from "@buildingai/service/consoleapi/extensions";
import { apiGetExtensionDetailByIdentifier } from "@buildingai/service/consoleapi/extensions";
import type { NavigationMenuItem } from "@nuxt/ui";
import type { ComputedRef } from "vue";

import type { PluginMenuItem } from "./menu";

interface PluginManifest {
    identifier: string;
    name: string;
    version: string;
    description: string;
    author: {
        name: string;
        homepage: string;
    };
}

const UserMenu = defineAsyncComponent(() => import("../components/user-menu.vue"));
const SiteLogo = defineAsyncComponent(() => import("../components/site-logo.vue"));

const props = defineProps<{
    /** 是否折叠 */
    collapsed?: boolean;
    /** 是否打开移动端菜单 */
    mobileMenu?: boolean;
    /** 插件信息 */
    manifest?: PluginManifest;
}>();

const emits = defineEmits<{
    /** 打开移动端菜单 */
    (e: "update:mobileMenu"): void;
}>();

const isOpen = useVModel(props, "mobileMenu", emits);
const collapsed = computed(() => props.collapsed);

/**
 * Get navigation items from parent PluginLayout
 * Items are transformed from PluginMenuItem[] to PluginMenuItem[] with active states
 */
const navigationItems = inject<ComputedRef<PluginMenuItem[]>>(
    "pluginConsoleMenu",
    computed(() => []),
);

console.log("navigationItems", navigationItems.value);

/**
 * Menu groups for UNavigationMenu component
 * UNavigationMenu expects array of groups, we provide single group
 */
const menuGroups = computed<NavigationMenuItem[][]>(() => {
    const items = unref(navigationItems);
    return items?.length ? [items as unknown as NavigationMenuItem[]] : [];
});

const pluginInfo = shallowRef<ExtensionFormData | null>(null);

const router = useRouter();

const handleBack = () => {
    if (import.meta.dev) {
        router.push("/");
    } else {
        window.location.href = "/console/manage";
    }
};

const getPluginInfo = async () => {
    console.log("props.manifest", props.manifest);
    const res = await apiGetExtensionDetailByIdentifier(props.manifest?.identifier as string);
    pluginInfo.value = res as ExtensionFormData;
    console.log("pluginInfo", pluginInfo.value);
};

defineShortcuts({
    o: () => (isOpen.value = !isOpen.value),
});

onMounted(() => getPluginInfo());
</script>

<template>
    <div>
        <aside
            class="bg-sidebar hidden h-screen flex-col p-2 transition-all duration-300 md:flex"
            :class="{ 'w-16': collapsed, 'w-64': !collapsed }"
        >
            <!-- 插件信息卡片 -->
            <div v-if="pluginInfo" class="p-1">
                <div
                    class="bg-secondary rounded-lg p-3 transition-all"
                    :class="
                        collapsed ? 'flex items-center justify-center bg-transparent! p-1!' : ''
                    "
                >
                    <div
                        v-if="collapsed"
                        class="group/logo relative flex items-center justify-center"
                    >
                        <UAvatar
                            class="m-1 size-9 opacity-100 group-hover/logo:opacity-0"
                            :src="pluginInfo.icon"
                            :text="pluginInfo.author?.name"
                            size="md"
                        />
                        <UButton
                            color="primary"
                            class="size-10 rounded-full"
                            icon="i-lucide-arrow-left"
                            variant="soft"
                            :ui="{
                                base: 'flex cursor-pointer absolute inset-0 z-1 justify-center items-center group-hover/logo:opacity-100 opacity-0',
                            }"
                            :label="collapsed ? '' : $t('layouts.pluginSidebar')"
                            @click="handleBack"
                        >
                        </UButton>
                    </div>
                    <div v-else class="space-y-2">
                        <div class="flex items-center justify-between">
                            <UButton
                                color="primary"
                                icon="i-lucide-arrow-left"
                                variant="soft"
                                class="rounded-full"
                                @click="handleBack"
                            >
                            </UButton>

                            <UAvatar
                                :src="pluginInfo.icon"
                                :text="pluginInfo.author?.name"
                                size="md"
                            />
                        </div>
                        <h3
                            class="text-foreground mb-0.5! truncate text-sm font-semibold"
                            :title="pluginInfo.name"
                        >
                            {{ pluginInfo.name }}
                        </h3>
                        <div
                            class="text-muted-foreground text-xs"
                            :title="`版本: ${pluginInfo.version}`"
                        >
                            v{{ pluginInfo.version }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 菜单区域 -->
            <BdScrollArea class="flex-1">
                <div class="flex flex-grow flex-col overflow-hidden px-1 py-4">
                    <!-- 菜单 -->
                    <div
                        :style="{
                            '--text-color-muted': 'var(--color-accent-foreground)',
                            '--text-color-dimmed': 'var(--color-accent-foreground)',
                        }"
                    >
                        <UNavigationMenu
                            :collapsed="collapsed"
                            orientation="vertical"
                            :items="menuGroups"
                            :ui="{
                                label: 'text-muted-foreground',
                                list: 'navbar-menu',
                                link: collapsed
                                    ? 'justify-center size-10 hover:bg-secondary dark:hover:bg-surface-800 rounded-lg'
                                    : 'justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg',
                                linkLeadingIcon: collapsed ? 'size-4.5' : 'size-4',
                            }"
                        >
                            <template #item-trailing="{ item }">
                                <UIcon
                                    v-if="item.children?.length"
                                    name="i-lucide-chevron-right"
                                    class="iconify iconify--lucide size-4 shrink-0 transform transition-transform duration-200 group-data-[state=open]:rotate-90"
                                />
                            </template>
                        </UNavigationMenu>
                    </div>
                </div>
            </BdScrollArea>

            <!-- 底部折叠按钮 -->
            <UserMenu
                :hidden-layout="true"
                mode="sidebar"
                :collapsed="collapsed"
                :mobile-menu="false"
                @update:collapsed="collapsed = $event"
            />
        </aside>

        <!-- 移动端菜单 -->
        <USlideover v-model:open="isOpen" side="left" :ui="{ content: '!w-fit flex-0 max-w-fit' }">
            <template #content>
                <aside
                    class="bg-sidebar flex h-screen w-64 flex-col p-2 transition-all duration-300"
                >
                    <!-- 顶部Logo区域 -->
                    <SiteLogo layout="side" :collapsed="false" />

                    <!-- 插件信息卡片 -->
                    <div v-if="pluginInfo" class="mt-2 mb-2">
                        <div class="bg-secondary rounded-lg p-2">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <UAvatar
                                        :src="pluginInfo.icon"
                                        :text="pluginInfo.author?.name"
                                        size="xs"
                                    />
                                    <h3
                                        class="text-foreground truncate text-sm font-semibold"
                                        :title="pluginInfo.name"
                                    >
                                        {{ pluginInfo.name }}
                                    </h3>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <span
                                        class="text-muted-foreground text-xs"
                                        :title="`版本: ${pluginInfo.version}`"
                                    >
                                        v{{ pluginInfo.version }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 菜单区域 -->
                    <div class="flex flex-grow flex-col overflow-y-auto py-4">
                        <div
                            :style="{
                                '--text-color-muted': 'var(--color-accent-foreground)',
                                '--text-color-dimmed': 'var(--color-accent-foreground)',
                            }"
                        >
                            <UNavigationMenu
                                :collapsed="false"
                                orientation="vertical"
                                :items="menuGroups"
                                :ui="{
                                    list: 'navbar-menu',
                                    link: 'justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg',
                                    linkLeadingIcon: 'size-4',
                                }"
                            >
                                <template #item-trailing="{ item }">
                                    <UIcon
                                        v-if="item.children?.length"
                                        name="i-lucide-chevron-right"
                                        class="iconify iconify--lucide size-4 shrink-0 transform transition-transform duration-200 group-data-[state=open]:rotate-90"
                                    />
                                </template>
                            </UNavigationMenu>
                        </div>
                    </div>

                    <!-- 底部折叠按钮 -->
                    <UserMenu
                        mode="sidebar"
                        :collapsed="collapsed"
                        :mobile-menu="true"
                        @update:collapsed="collapsed = $event"
                    />
                </aside>
            </template>
        </USlideover>
    </div>
</template>

<style lang="scss" scoped>
aside :deep(.navbar-menu) > li:not(:first-child) {
    margin-bottom: 4px;
}
aside :deep(.navbar-menu) {
    .text-dimmed {
        color: var(--color-accent-foreground);
    }
    .text-muted {
        color: var(--color-accent-foreground);
    }
}

aside :deep(.navbar-other) {
    a .iconify {
        color: var(--color-accent-foreground);
    }
    a .truncate {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-accent-foreground);

        svg {
            width: 16px;
            height: 16px;
        }
    }
}
</style>
