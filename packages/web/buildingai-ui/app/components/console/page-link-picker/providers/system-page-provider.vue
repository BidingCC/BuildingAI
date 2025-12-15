<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { type LinkItem, LinkType, type RouteMeta } from "../layout.d";
import { mobilePages } from "../mobile-pages";

const { t } = useI18n();

// 组件属性
interface Props {
    /** 搜索查询 */
    searchQuery?: string;
    /** 当前选中的链接 */
    selected?: LinkItem | null;
    /** Mode: mobile or web */
    mode?: "mobile" | "web";
}

const props = withDefaults(defineProps<Props>(), {
    searchQuery: "",
    selected: null,
    mode: "web",
});

// 组件事件
const emit = defineEmits<{
    (e: "select", link: LinkItem): void;
}>();

// 响应式状态
const systemPages = ref<LinkItem[]>([]);

// 计算属性
const filteredPages = computed(() => {
    if (!props.searchQuery) return systemPages.value;

    const query = props.searchQuery.toLowerCase();
    return systemPages.value.filter(
        (page) =>
            page.name?.toLowerCase().includes(query) || page.path?.toLowerCase().includes(query),
    );
});

/**
 * 加载系统页面
 */
const getSystemPages = async () => {
    // 如果是移动端模式，使用 mobile-pages.ts 中的页面列表
    if (props.mode === "mobile") {
        const pages: LinkItem[] = mobilePages.map((page) => ({
            type: LinkType.SYSTEM,
            name: page.name,
            path: page.path,
            query: {},
        }));

        // 按名称排序
        pages.sort((a: LinkItem, b: LinkItem) => {
            const nameA = a.name || "";
            const nameB = b.name || "";
            return nameA.localeCompare(nameB);
        });

        systemPages.value = pages;
        return;
    }

    // Web 模式：从路由中获取系统页面
    const routes = useRouter().getRoutes();

    const pages: LinkItem[] = [];

    for (const route of routes) {
        const meta = route.meta as RouteMeta;

        // 只显示允许在链接选择器中显示的页面
        if (!meta?.inLinkSelector) continue;

        // 只显示系统页面
        if (!meta?.inSystem) continue;

        pages.push({
            type: LinkType.SYSTEM,
            name: meta.title || route.name?.toString() || route.path,
            path: route.path,
            query: {},
        });
    }

    // 按名称排序
    pages.sort((a: LinkItem, b: LinkItem) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB);
    });

    systemPages.value = pages;
};

/**
 * 选择页面
 */
const selectPage = (page: LinkItem) => {
    emit("select", page);
};

/**
 * 检查是否为选中状态
 */
const isSelected = (page: LinkItem) => {
    return props.selected?.path === page.path && props.selected?.type === LinkType.SYSTEM;
};

// 组件挂载时加载数据
onMounted(() => getSystemPages());

// 监听 mode 变化，重新加载页面列表
watch(
    () => props.mode,
    () => {
        getSystemPages();
    },
);
</script>

<template>
    <div class="system-page-provider flex h-full flex-col">
        <!-- 空状态 -->
        <div v-if="filteredPages.length === 0" class="flex flex-1 items-center justify-center">
            <div class="mx-auto max-w-sm text-center">
                <UIcon
                    name="i-heroicons-document-magnifying-glass"
                    class="text-muted-foreground/50 mx-auto mb-4 h-16 w-16"
                />
                <h3 class="text-foreground mb-2 text-lg font-semibold">
                    {{
                        searchQuery
                            ? t("console-common.linkPicker.emptyState.noMatchingPages")
                            : t("console-common.linkPicker.emptyState.noSystemPages")
                    }}
                </h3>
                <p class="text-muted-foreground text-sm">
                    {{
                        searchQuery
                            ? t("console-common.linkPicker.emptyState.tryOtherKeywords")
                            : t("console-common.linkPicker.emptyState.contactAdmin")
                    }}
                </p>
            </div>
        </div>

        <!-- 页面列表 -->
        <div v-else class="flex-1 overflow-y-auto p-6">
            <div class="flex flex-wrap gap-3">
                <div
                    v-for="page in filteredPages"
                    :key="page.path"
                    :class="[
                        'group relative flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200',
                        isSelected(page)
                            ? 'bg-primary/5 shadow-sm'
                            : 'bg-accent hover:bg-primary/5',
                    ]"
                    @click="selectPage(page)"
                >
                    <!-- 页面图标 -->
                    <!-- <div class="flex-none">
                        <div
                            :class="[
                                'flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                                isSelected(page)
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-accent text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                            ]"
                        >
                            <UIcon name="i-heroicons-document" class="h-6 w-6" />
                        </div>
                    </div> -->

                    <!-- 页面信息 -->
                    <div class="min-w-0 flex-1">
                        <div
                            class="text-foreground flex items-center truncate text-base font-semibold"
                        >
                            {{ t(page.name as string) }}
                        </div>
                        <!-- <p class="text-muted-foreground truncate text-sm">
                            {{ page.path }}
                        </p> -->
                    </div>

                    <!-- 选中标识 -->
                    <div v-if="isSelected(page)" class="absolute top-0 right-0 flex-none">
                        <div
                            class="bg-primary flex size-3 items-center justify-center rounded-full"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
