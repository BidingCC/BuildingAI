<script setup lang="ts">
import type { NavigationConfig } from "../../../../../buildingai-ui/app/components/console/page-link-picker/layout";

const UserProfile = defineAsyncComponent(() => import("../components/user-profile.vue"));
const SiteLogo = defineAsyncComponent(() => import("../components/web-site-logo.vue"));
const MobileMenuButton = defineAsyncComponent(() => import("../components/mobile-menu-button.vue"));
const MobileNavigation = defineAsyncComponent(() => import("../components/mobile-navigation.vue"));
import { useNavigationMenu } from "../hooks/use-navigation-menu";

const props = defineProps<{
    navigationConfig: NavigationConfig;
    hasPreview?: boolean;
}>();
const userStore = useUserStore();

// 侧边栏折叠状态
const collapsed = shallowRef(false);
// 移动端菜单状态
const mobileMenuOpen = shallowRef(false);

// 使用通用的导航菜单逻辑
const { navigationItems, linkItems } = useNavigationMenu(toRef(props, "navigationConfig"));
</script>

<template>
    <div class="bg-muted dark:bg-muted/50 flex h-full w-full flex-row">
        <!-- 桌面版侧边栏 - 参考 index.vue 的实现 -->
        <aside
            class="relative hidden h-full flex-col transition-all duration-300 md:flex"
            :class="{ 'w-18': collapsed, 'w-54': !collapsed }"
        >
            <!-- 顶部Logo区域 - 固定 -->
            <div class="flex-none p-2">
                <SiteLogo layout="side" :collapsed="collapsed" :isWeb="true" />
            </div>

            <!-- 中间菜单区域 - 可滚动 -->
            <BdScrollArea class="flex-1 px-1.5 py-2" :shadow="false">
                <!-- 主导航菜单 -->
                <div>
                    <UNavigationMenu
                        :collapsed="collapsed"
                        orientation="vertical"
                        :items="navigationItems"
                        :ui="{
                            list: 'navbar-menu',
                            link: collapsed
                                ? 'justify-center py-3 hover:bg-secondary dark:hover:bg-surface-800 rounded-lg'
                                : 'justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg',
                            linkLeadingIcon: collapsed ? 'size-5' : 'size-4',
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
            </BdScrollArea>

            <!-- 底部区域 - 固定 -->
            <div class="flex flex-none flex-col gap-2 px-1.5 py-2">
                <!-- 底部链接菜单 -->
                <ClientOnly>
                    <UNavigationMenu
                        v-if="userStore.userInfo?.permissions"
                        :collapsed="collapsed"
                        orientation="vertical"
                        :items="linkItems"
                        class="w-full"
                        :ui="{
                            list: 'navbar-other',
                            link: collapsed
                                ? 'justify-center py-3 hover:bg-secondary dark:hover:bg-surface-800 rounded-lg'
                                : 'justify-start hover:bg-secondary dark:hover:bg-surface-800 p-2 px-3 leading-6 rounded-lg',
                            linkLeadingIcon: collapsed ? 'size-5' : 'size-4',
                        }"
                    />
                </ClientOnly>

                <!-- 用户头像 -->
                <UserProfile
                    :size="collapsed ? 'md' : 'lg'"
                    :collapsed="collapsed"
                    :content="{
                        side: 'bottom',
                        align: 'start',
                        sideOffset: -60,
                        alignOffset: collapsed ? 120 : 220,
                    }"
                />
            </div>

            <!-- 折叠/展开按钮 -->
            <div
                class="transition-left absolute z-50 hidden duration-300 md:block"
                :style="{ bottom: '30%', left: collapsed ? '54px' : '200px' }"
            >
                <UButton
                    :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    class="bg-background rounded-full border p-2 shadow-md"
                    @click="collapsed = !collapsed"
                >
                    <span class="sr-only">
                        {{ collapsed ? "展开侧边栏" : "折叠侧边栏" }}
                    </span>
                </UButton>
            </div>
        </aside>

        <!-- 主要内容区域 -->
        <main
            class="bg-background flex min-w-0 flex-1 flex-col overflow-y-scroll rounded-l-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            :class="{ 'py-4 pr-2': hasPreview }"
        >
            <slot />
        </main>

        <!-- 移动端菜单按钮 -->
        <MobileMenuButton v-model="mobileMenuOpen" :show-user-profile="false" />
        <!-- 移动端导航菜单 -->
        <MobileNavigation v-model="mobileMenuOpen" :navigation-config="navigationConfig" />
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
