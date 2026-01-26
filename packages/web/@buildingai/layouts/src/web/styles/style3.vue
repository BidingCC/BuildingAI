<script setup lang="ts">
import { ROUTES } from "@buildingai/constants/web";

import type { NavigationMenuItem } from "#ui/types";

import type { NavigationConfig } from "../../../../../buildingai-ui/app/components/console/page-link-picker/layout";

const MobileMenuButton = defineAsyncComponent(() => import("../components/mobile-menu-button.vue"));
const MobileNavigation = defineAsyncComponent(() => import("../components/mobile-navigation.vue"));
const UserProfile = defineAsyncComponent(() => import("../components/user-profile.vue"));
const SiteLogo = defineAsyncComponent(() => import("../components/web-site-logo.vue"));

const props = defineProps<{
    navigationConfig: NavigationConfig;
}>();

const userStore = useUserStore();

// 移动端菜单状态
const mobileMenuOpen = shallowRef(false);

const navRef = ref<HTMLElement | null>(null);
const isOverflow = ref(false);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const checkOverflow = () => {
    const el = navRef.value;
    if (!el) return;

    const { scrollWidth, clientWidth, scrollLeft } = el;

    isOverflow.value = scrollWidth > clientWidth;
    canScrollLeft.value = scrollLeft > 0;
    canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 2;
};

const scrollNav = (dir: "left" | "right") => {
    navRef.value?.scrollBy({
        left: dir === "left" ? -200 : 200,
        behavior: "smooth",
    });

    requestAnimationFrame(checkOverflow);
};

onMounted(() => {
    nextTick(() => {
        checkOverflow();

        if (navRef.value) {
            useEventListener(navRef.value, "scroll", checkOverflow);
        }
    });

    useEventListener(window, "resize", checkOverflow);
});

/**
 * 将 NavigationConfig 转换为 NavigationMenuItem 格式
 */
const navigationItems = computed((): NavigationMenuItem[] => {
    return props.navigationConfig.items.map((item: NavigationMenuItem) => ({
        label: item.title,
        icon: item.icon,
        badge: item.badge,
        // to: toAbsolutePath(item.link?.path || "/"),
        to: item.link?.path || "/",
        active:
            useRoute().path === item.link?.path ||
            useRoute().path.startsWith(item.link?.path + "/") ||
            useRoute().meta.activePath === item.link?.path,
        // target: item.link?.path?.startsWith("http") ? "_blank" : undefined,
        children: item.children?.map((child: NavigationMenuItem) => ({
            label: child.title,
            description: `前往 ${child.title}`,
            icon: child.icon,
            to: child?.link?.path || "/",
            // to: toAbsolutePath(child?.link?.path || "/"),
            // target: child?.link?.path?.startsWith("http") ? "_blank" : undefined,
        })),
    }));
});
</script>

<template>
    <div class="bg-muted/50 flex h-full w-full flex-col">
        <!-- Header -->
        <header class="bg-background/80 sticky top-0 z-40 hidden backdrop-blur sm:block">
            <div class="mx-auto flex h-14 items-center gap-4 px-4">
                <!-- 左：Logo -->
                <SiteLogo layout="mixture" class="shrink-0" />

                <!-- 中：可滚动导航 -->
                <div class="relative flex flex-1 justify-center overflow-hidden">
                    <!-- 左箭头 -->
                    <div class="flex w-10 justify-center">
                        <UButton
                            v-if="isOverflow && canScrollLeft"
                            @click="scrollNav('left')"
                            icon="i-lucide-chevron-left"
                            variant="ghost"
                            size="lg"
                            class="bg-background/80 absolute top-1/2 left-1 z-10 flex -translate-y-1/2 rounded-full p-1 shadow backdrop-blur"
                        />
                    </div>
                    <!-- 滚动容器 -->
                    <div ref="navRef" class="scrollbar-hide mx-auto max-w-full overflow-x-auto">
                        <!-- 强制内容宽度 -->
                        <div class="w-max px-2">
                            <UNavigationMenu
                                :items="navigationItems"
                                orientation="horizontal"
                                variant="pill"
                                color="primary"
                            />
                        </div>
                    </div>

                    <!-- 右箭头 -->
                    <div class="flex w-10 justify-center">
                        <UButton
                            v-if="isOverflow && canScrollRight"
                            @click="scrollNav('right')"
                            icon="i-lucide-chevron-right"
                            variant="ghost"
                            size="lg"
                            class="bg-background/80 absolute top-1/2 right-1 z-10 flex -translate-y-1/2 rounded-full p-1 shadow backdrop-blur"
                        />
                    </div>

                    <!-- 左右渐隐（高级感） -->
                    <div
                        class="from-background pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r to-transparent"
                    />
                    <div
                        class="from-background pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l to-transparent"
                    />
                </div>

                <!-- 右：操作区 -->
                <div class="flex shrink-0 items-center gap-3">
                    <BdThemeToggle />

                    <UserProfile
                        size="md"
                        :collapsed="false"
                        :content="{ side: 'bottom', align: 'center' }"
                    >
                        <template #default>
                            <UAvatar :src="userStore.userInfo?.avatar" size="md" />
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

        <!-- Main -->
        <main class="bg-background shadow-default flex-1 overflow-hidden rounded-t-xl">
            <slot />
        </main>

        <!-- Mobile -->
        <MobileMenuButton v-model="mobileMenuOpen" :show-user-profile="false" />
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
