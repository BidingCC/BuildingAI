<script setup lang="ts">
import { ROUTES } from "@buildingai/constants/web";

import type { NavigationConfig } from "../../../../../buildingai-ui/app/components/console/page-link-picker/layout";

const MobileMenuButton = defineAsyncComponent(() => import("../components/mobile-menu-button.vue"));
const MobileNavigation = defineAsyncComponent(() => import("../components/mobile-navigation.vue"));
const UserProfile = defineAsyncComponent(() => import("../components/user-profile.vue"));
const SiteLogo = defineAsyncComponent(() => import("../components/web-site-logo.vue"));

defineProps<{
    navigationConfig: NavigationConfig;
    hasPreview?: boolean;
}>();

const userStore = useUserStore();
const locationPathname = window.location.pathname;
const route = useRoute();
const mobileMenuOpen = shallowRef(false);

const navRef = ref<HTMLElement | null>(null);
const isOverflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const checkOverflow = () => {
    const el = navRef.value;
    if (!el) return;
    isOverflow.value = el.scrollWidth > el.clientWidth;
    canScrollLeft.value = el.scrollLeft > 0;
    canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
};

const scrollNav = (dir: "left" | "right") => {
    navRef.value?.scrollBy({
        left: dir === "left" ? -200 : 200,
        behavior: "smooth",
    });
};

onMounted(() => {
    nextTick(checkOverflow);
    useEventListener(window, "resize", checkOverflow);
});
</script>

<template>
    <div class="bg-muted/50 flex h-full w-full flex-col">
        <!-- 顶部导航栏 -->
        <header class="relative hidden sm:block">
            <!-- 顶部左右 -->
            <div class="flex items-center justify-between p-4">
                <SiteLogo layout="mixture" />

                <div class="flex items-center gap-3">
                    <BdThemeToggle />

                    <UserProfile size="md" :collapsed="false">
                        <template #default>
                            <UAvatar :src="userStore.userInfo?.avatar" />
                        </template>
                    </UserProfile>

                    <NuxtLink v-if="userStore.userInfo?.permissions" :to="ROUTES.CONSOLE">
                        <UButton color="primary" class="rounded-full">
                            {{ $t("layouts.menu.workspace") }}
                        </UButton>
                    </NuxtLink>
                </div>
            </div>

            <!-- 中央浮动导航 -->
            <div
                :class="[
                    hasPreview
                        ? 'pointer-events-none absolute top-4 left-1/2 z-50 -translate-x-1/2'
                        : 'pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2',
                ]"
            >
                <div class="pointer-events-auto relative">
                    <!-- 左箭头 -->
                    <UButton
                        v-if="isOverflow && canScrollLeft"
                        @click="scrollNav('left')"
                        icon="i-lucide-chevron-left"
                        variant="ghost"
                        size="lg"
                        class="bg-background/80 absolute top-1/2 left-1 z-10 flex -translate-y-1/2 rounded-full p-1 shadow backdrop-blur"
                    />

                    <!-- 导航 -->
                    <ul
                        ref="navRef"
                        @scroll="checkOverflow"
                        class="scrollbar-hide border-border/50 bg-background/70 flex max-w-[70vw] items-center gap-6 overflow-x-auto rounded-full border px-10 py-2 whitespace-nowrap backdrop-blur"
                    >
                        <li
                            v-for="item in navigationConfig.items"
                            :key="item.id"
                            class="hover:text-primary transition-colors"
                        >
                            <NuxtLink
                                :to="item.link?.path || '/'"
                                class="flex items-center gap-1 text-sm font-medium"
                                :class="{
                                    'text-primary':
                                        locationPathname === item.link?.path ||
                                        item.link?.path === route.path ||
                                        item.link?.path === route.meta.activePath,
                                }"
                            >
                                <Icon v-if="item.icon" :name="item.icon" size="16" />
                                {{ item.title }}
                            </NuxtLink>
                        </li>
                    </ul>

                    <!-- 右箭头 -->
                    <UButton
                        v-if="isOverflow && canScrollRight"
                        @click="scrollNav('right')"
                        icon="i-lucide-chevron-right"
                        variant="ghost"
                        size="lg"
                        class="bg-background/80 absolute top-1/2 right-1 z-10 flex -translate-y-1/2 rounded-full p-1 shadow backdrop-blur"
                    />
                </div>
            </div>
        </header>

        <!-- 主要内容区域 -->
        <main class="bg-background shadow-default h-full flex-1 overflow-hidden rounded-t-xl">
            <slot />
        </main>

        <!-- 移动端菜单按钮 -->
        <MobileMenuButton v-model="mobileMenuOpen" />
        <!-- 移动端导航菜单 -->
        <MobileNavigation v-model="mobileMenuOpen" :navigation-config="navigationConfig" />
    </div>
</template>
<style scoped>
.scrollbar-hide {
    -ms-overflow-style: none; /* IE */
    scrollbar-width: none; /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
    display: none; /* Chrome / Safari */
}
</style>
