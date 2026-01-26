<script setup lang="ts">
import type { ComputedRef } from "vue";

import MainPage from "../components/main-page.vue";
import SidebarNavbar from "../sidebar/sidebar-navbar.vue";
import type { NavigationItem, PluginMenuItem } from "./menu";
import { transformMenuToNavigation } from "./menu";
import Sidebar from "./sidebar.vue";

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

const props = defineProps<{
    /** Console menu configuration */
    menu?: PluginMenuItem[];
    /** Plugin manifest */
    manifest?: PluginManifest;
}>();

const collapsed = shallowRef<boolean>(false);
const mobileMenu = shallowRef<boolean>(false);

const toggleSidebar = () => {
    collapsed.value = !collapsed.value;
};

const openMobileMenu = () => {
    mobileMenu.value = true;
};

/**
 * Transform menu configuration to navigation structure
 * Converts PluginMenuItem[] to NavigationItem[] with active states
 */
const navigationItems = computed<NavigationItem[]>(() => {
    if (!props.menu?.length) return [];

    const currentPath = useRoute().path;
    return transformMenuToNavigation(props.menu, currentPath);
});

// Provide navigation items to child components (Sidebar)
provide<ComputedRef<NavigationItem[]>>("pluginConsoleMenu", navigationItems);
</script>

<template>
    <div class="bg-sidebar flex h-screen w-full overflow-hidden">
        <div class="app-sidebar">
            <Sidebar
                :collapsed="collapsed"
                :manifest="props.manifest"
                v-model:mobile-menu="mobileMenu"
            />
        </div>
        <div
            class="bg-background m-0 flex min-w-0 flex-1 flex-col items-center shadow-lg md:m-2 md:ml-0 md:rounded-xl"
        >
            <SidebarNavbar
                :collapsed="collapsed"
                :mobile-menu="mobileMenu"
                :navigation-items="navigationItems"
                @toggle="toggleSidebar"
                @open-mobile-menu="openMobileMenu"
            />
            <MainPage layout="sidebar" />
        </div>
    </div>
</template>
