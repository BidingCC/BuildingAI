<script lang="ts" setup>
import type { PopoverContentProps } from "reka-ui";

interface MenuItem {
    id: number;
    icon: string;
    title: string;
    path?: string;
    target?: string;
    click?: () => void;
}

const props = withDefaults(
    defineProps<{
        size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
        collapsed?: boolean;
        content?: PopoverContentProps;
    }>(),
    {
        size: "md",
        collapsed: false,
    },
);

const { t } = useI18n();
const userStore = useUserStore();

const isOpen = ref<boolean>(false);

// 快捷操作菜单
const quickActions = ref<MenuItem[]>([
    {
        id: 1,
        icon: "i-lucide-settings",
        title: "layouts.menu.system",
        click: () => navigateTo(`/profile/${userStore.userInfo?.id}/general-settings`),
    },
    {
        id: 2,
        title: "layouts.powerDetail",
        icon: "i-lucide-database-zap",
        click: () => navigateTo(`/profile/${userStore.userInfo?.id}/power-detail`),
    },
    {
        id: 3,
        title: "layouts.userAgreement",
        icon: "i-lucide-file-text",
        target: "_blank",
        path: "/agreement?type=agreement&item=service",
    },
    {
        id: 4,
        title: "layouts.privacyPolicy",
        icon: "i-lucide-shield-check",
        target: "_blank",
        path: "/agreement?type=agreement&item=privacy",
    },
]);

/**
 * Handle menu item click
 * Uses smart navigation to handle both main app and plugin contexts
 */
const handleMenuClick = (item: MenuItem) => {
    if (item.click) {
        item.click();
    } else if (item.path) {
        if (item.target === "_blank") {
            navigateTo(item.path, { external: true });
        } else {
            navigateTo(item.path);
        }
    }
    isOpen.value = false;
};
</script>

<template>
    <ClientOnly>
        <UPopover
            v-if="userStore.isLogin"
            v-model:open="isOpen"
            class="flex"
            mode="click"
            :ui="{ content: 'rounded-2xl' }"
            :content="props.content"
            :close-delay="300"
        >
            <slot>
                <div
                    class="hover:bg-muted flex items-center gap-1 rounded-lg p-1.5"
                    :class="{ 'p-3': !props.collapsed }"
                    v-ripple
                >
                    <div class="flex flex-1 items-center justify-center gap-2">
                        <UAvatar
                            :src="userStore.userInfo?.avatar"
                            :alt="userStore.userInfo?.nickname"
                            :icon="userStore.userInfo?.nickname ? 'tabler:user' : undefined"
                            :size="props.size"
                            :ui="{ root: 'rounded-lg' }"
                        />
                        <div v-if="!props.collapsed" class="flex w-[100px] flex-col">
                            <span class="truncate text-sm font-medium">
                                {{ userStore.userInfo?.nickname }}
                            </span>
                            <span class="text-secondary-foreground truncate text-xs">
                                {{ userStore.userInfo?.email || userStore.userInfo?.phone }}
                            </span>
                        </div>
                    </div>

                    <div v-if="!props.collapsed">
                        <UButton
                            icon="i-lucide-chevrons-up-down"
                            color="neutral"
                            variant="link"
                            :ui="{ leadingIcon: 'size-4' }"
                        />
                    </div>
                </div>
            </slot>

            <template #content>
                <div class="p-3" @click="isOpen = false">
                    <!-- 用户信息区域 -->
                    <div
                        class="hover:bg-muted flex cursor-pointer items-center gap-4 rounded-lg p-3"
                        @click="navigateTo(`/profile/${userStore.userInfo?.id}`)"
                    >
                        <UAvatar
                            :src="userStore.userInfo?.avatar"
                            alt="Avatar"
                            size="md"
                            img-class="bg-foreground/30"
                        />
                        <div class="flex flex-col">
                            <span class="max-w-32 truncate text-sm">
                                {{ userStore.userInfo?.nickname }}
                            </span>
                            <span class="text-foreground/60 max-w-32 truncate text-xs">
                                {{ userStore.userInfo?.username }}
                            </span>
                        </div>
                        <UIcon
                            name="i-lucide-chevron-right"
                            class="text-foreground/60 ml-auto"
                            size="20"
                        />
                    </div>

                    <div
                        class="bg-primary/10 mt-4 flex items-center justify-between rounded-xl p-3"
                    >
                        <div class="flex items-center gap-2 text-sm">
                            <span class="font-medium">{{ t("layouts.power") }}:</span>
                            <span class="text-primary">{{ userStore.userInfo?.power }}</span>
                        </div>
                        <UButton
                            size="xs"
                            @click="
                                navigateTo(
                                    `/profile/${userStore.userInfo?.id}/personal-rights/member-center`,
                                )
                            "
                        >
                            {{ t("layouts.memberSubscription") }}
                        </UButton>
                    </div>

                    <!-- 快捷操作菜单 -->
                    <div class="mt-4 grid w-72 grid-cols-4 gap-6">
                        <div
                            v-for="item in quickActions"
                            :key="item.id"
                            class="group flex w-full flex-1 cursor-pointer flex-col items-center gap-2"
                            @click="handleMenuClick(item)"
                        >
                            <div
                                class="bg-foreground/5 hover:bg-foreground/10 active:bg-foreground/15 flex h-8 w-8 items-center justify-center rounded-full"
                                v-ripple
                            >
                                <UIcon :name="item.icon" />
                            </div>
                            <p class="max-w-full truncate text-center text-xs">
                                {{ t(item.title) }}
                            </p>
                        </div>
                    </div>

                    <USeparator class="py-4" />

                    <!-- 底部操作区 -->
                    <div class="flex justify-between">
                        <!-- 退出登录 -->
                        <div
                            class="flex cursor-pointer items-center gap-1 rounded-md px-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                            v-ripple
                            @click="userStore.logout()"
                        >
                            <UIcon name="i-lucide-log-out" size="18" />
                            <p class="select-none">
                                {{ t("layouts.logout") }}
                            </p>
                        </div>

                        <!-- 主题切换 -->
                        <BdThemeToggle />
                    </div>
                </div>
            </template>
        </UPopover>
        <div v-else class="flex items-center gap-1 rounded-lg" @click="navigateTo('/login')">
            <UAvatar
                icon="i-lucide-user"
                alt="未登录"
                :size="props.size"
                :ui="{ root: 'rounded-lg' }"
            />
        </div>
    </ClientOnly>
</template>
