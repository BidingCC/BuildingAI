<script lang="ts" setup>
const router = useRouter();
const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();

const items = computed<
    {
        label: string;
        icon: IconType;
        children?: {
            label: string;
            icon: IconType;
            to: string;
            slot?: string;
        }[];
    }[]
>(() => [
    {
        label: t("common.label.personalRights"),
        icon: "i-lucide-book-open",
        children: [
            {
                label: t("common.personalRights.rechargeCenter"),
                icon: "i-lucide-badge-dollar-sign",
                to: `/profile/${userStore.userInfo?.id}/personal-rights/recharge-center`,
            },
            {
                label: t("common.personalRights.memberCenter"),
                icon: "i-lucide-crown",
                to: `/profile/${userStore.userInfo?.id}/personal-rights/member-center`,
            },
        ],
    },
    {
        label: t("common.label.profile"),
        icon: "i-lucide-book-open",
        children: [
            {
                label: t("user.frontend.profile.title"),
                icon: "i-lucide-user",
                to: `/profile/${userStore.userInfo?.id}`,
            },
            {
                label: t("common.settings.mcpServer"),
                icon: {
                    type: "svg",
                    content: `<svg viewBox="0 0 195 195" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
                        <path d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
                        <path d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
                    </svg>`,
                },
                to: `/profile/${userStore.userInfo?.id}/mcp-settings`,
            },
            {
                label: t("user.frontend.profile.purchaseRecord"),
                icon: "i-lucide-clock-8",
                to: `/profile/${userStore.userInfo?.id}/purchase-record`,
            },
            {
                label: t("user.frontend.profile.powerDetail"),
                icon: "i-lucide-database-zap",
                to: `/profile/${userStore.userInfo?.id}/power-detail`,
            },
            {
                label: t("common.settings.general"),
                icon: "i-lucide-settings-2",
                slot: "components" as const,
                to: `/profile/${userStore.userInfo?.id}/general-settings`,
            },
        ],
    },
]);

const pageTitle = ref(route.meta.title as string);

watch(
    () => route.meta.title,
    () => {
        pageTitle.value = route.meta.title as string;
    },
);

const normalizePath = (path: string): string => {
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    // Replace UUID with :id
    let normalized = path.replace(uuidPattern, ":id");
    // Normalize dynamic route parameter format :id() or other names :param() to :id
    // This allows matching paths like /profile/:id()/power-detail
    normalized = normalized.replace(/:[a-zA-Z0-9_]+\(\)/g, ":id");
    return normalized;
};

const isPathMatch = (path1: string, path2: string): boolean => {
    // If exactly equal, return true directly
    if (path1 === path2) return true;
    // Compare after normalizing paths
    return normalizePath(path1) === normalizePath(path2);
};
</script>

<template>
    <div class="container mx-auto flex h-full justify-between gap-12 px-4 py-8">
        <div
            class="bg-muted flex w-52 flex-col gap-2 rounded-lg p-4"
            :style="{
                '--text-color-muted': 'var(--color-accent-foreground)',
                '--text-color-dimmed': 'var(--color-accent-foreground)',
            }"
        >
            <div v-for="item in items" :key="item.label" class="flex flex-col gap-2">
                <div class="text-muted-foreground px-2 py-1 text-xs font-medium">
                    {{ item.label }}
                </div>

                <div class="flex flex-col gap-2">
                    <div
                        v-for="category in item.children"
                        :key="category.label"
                        class="group relative"
                    >
                        <UButton
                            :label="category.label"
                            :ui="{
                                base: 'flex justify-between w-full gap-2 cursor-pointer relative pl-6 py-2',
                            }"
                            :variant="isPathMatch(category.to, route.path) ? 'soft' : 'ghost'"
                            :color="isPathMatch(category.to, route.path) ? 'primary' : 'neutral'"
                            @click="router.push(category.to)"
                        >
                            <template v-if="typeof category.icon === 'string'">
                                <UIcon :name="category.icon" size="16" />
                            </template>
                            <template
                                v-else-if="
                                    typeof category.icon === 'object' &&
                                    category.icon?.type === 'svg'
                                "
                            >
                                <div
                                    class="flex size-4 items-center justify-center"
                                    v-html="category.icon.content"
                                ></div>
                            </template>
                            <span class="block flex-1 truncate text-left">
                                {{ category.label }}
                            </span>
                        </UButton>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex w-full flex-1 flex-col overflow-hidden">
            <div class="flex h-fit items-center gap-2 pb-4">
                <UButton
                    variant="soft"
                    color="primary"
                    icon="i-heroicons-arrow-left"
                    @click="router.push('/')"
                />
                <h1 class="flex-1 pr-[36px] text-center text-xl font-semibold">
                    <slot name="page-title">{{ t(pageTitle) }}</slot>
                </h1>
            </div>

            <div class="flex-1 overflow-y-auto">
                <NuxtPage />
            </div>
        </div>
    </div>
</template>
