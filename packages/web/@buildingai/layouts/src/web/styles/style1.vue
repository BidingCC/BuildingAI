<script setup lang="ts">
import { ROUTES } from "@buildingai/constants/web";

import type { NavigationConfig } from "../../../../../buildingai-ui/app/components/console/page-link-picker/layout";

const MobileMenuButton = defineAsyncComponent(() => import("../components/mobile-menu-button.vue"));
const MobileNavigation = defineAsyncComponent(() => import("../components/mobile-navigation.vue"));
const UserProfile = defineAsyncComponent(() => import("../components/user-profile.vue"));
const SiteLogo = defineAsyncComponent(() => import("../components/web-site-logo.vue"));

const props = defineProps<{
    navigationConfig: NavigationConfig;
}>();

const userStore = useUserStore();
const route = useRoute();

const mobileMenuOpen = shallowRef(false);
const navListRef = ref<HTMLElement | null>(null);

const isOverflowing = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const updateScrollState = () => {
    const el = navListRef.value;
    if (!el) return;

    isOverflowing.value = el.scrollWidth > el.clientWidth;
    canScrollLeft.value = el.scrollLeft > 1;
    // 使用更宽松的容差，确保在接近右边界时也能显示按钮
    canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
};

const scrollLeftFn = () => {
    navListRef.value?.scrollBy({ left: -200, behavior: "smooth" });
};

const scrollRightFn = () => {
    navListRef.value?.scrollBy({ left: 200, behavior: "smooth" });
};

onMounted(() => {
    nextTick(() => {
        updateScrollState();
        // 使用 ResizeObserver 监听导航列表尺寸变化
        if (navListRef.value) {
            const resizeObserver = new ResizeObserver(() => {
                updateScrollState();
            });
            resizeObserver.observe(navListRef.value);
            // 清理函数
            onUnmounted(() => {
                resizeObserver.disconnect();
            });
        }
    });
});

watch(
    () => props.navigationConfig.items,
    () => nextTick(updateScrollState),
    { deep: true },
);

useEventListener(window, "resize", updateScrollState);
</script>

<template>
    <div class="bg-muted/50 flex h-full w-full flex-col">
        <header class="sticky top-0 z-50 hidden p-4 sm:block">
            <div
                class="relative grid h-[var(--navbar-height)] w-full items-center rounded-2xl border border-transparent px-2 py-1.5 shadow backdrop-blur-sm lg:grid-cols-[auto_1fr_auto]"
            >
                <!-- Logo -->
                <SiteLogo layout="mixture" />

                <!-- 中间导航（带滑动） -->
                <div class="relative mx-4 flex items-center overflow-hidden">
                    <!-- 左箭头 -->
                    <div
                        class="bg-muted pointer-events-none absolute left-0 z-10 flex h-full items-center"
                    >
                        <UButton
                            v-if="isOverflowing && canScrollLeft"
                            icon="i-lucide-chevron-left"
                            @click="scrollLeftFn"
                            variant="ghost"
                            size="lg"
                            class="pointer-events-auto px-2"
                        />
                    </div>

                    <!-- 导航列表 -->
                    <ul
                        ref="navListRef"
                        @scroll="updateScrollState"
                        class="scrollbar-hide flex max-w-[70vw] gap-2 overflow-x-auto px-10 font-medium whitespace-nowrap"
                    >
                        <li v-for="item in props.navigationConfig.items" :key="item.id">
                            <NuxtLink
                                :to="item.link?.path || '/'"
                                :target="item.link?.path?.startsWith('http') ? '_blank' : '_self'"
                                class="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition"
                                :class="{
                                    'bg-primary text-white':
                                        route.path === item.link?.path ||
                                        route.meta.activePath === item.link?.path,
                                }"
                            >
                                <Icon v-if="item.icon" :name="item.icon" />
                                {{ item.title }}
                            </NuxtLink>
                        </li>
                    </ul>

                    <!-- 右箭头 -->
                    <div
                        class="bg-muted pointer-events-none absolute right-0 z-10 flex h-full items-center"
                    >
                        <UButton
                            v-if="isOverflowing && canScrollRight"
                            icon="i-lucide-chevron-right"
                            @click="scrollRightFn"
                            variant="ghost"
                            size="lg"
                            class="pointer-events-auto px-2"
                        />
                    </div>
                </div>

                <!-- 右侧 -->
                <div class="flex items-center justify-end gap-3">
                    <BdThemeToggle />

                    <UserProfile size="md">
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
        </header>

        <main class="bg-background flex-1 overflow-hidden rounded-t-xl">
            <slot />
        </main>

        <MobileMenuButton v-model="mobileMenuOpen" />
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
