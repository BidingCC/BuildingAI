<script setup lang="ts">
import type { ExtensionFormData } from "@buildingai/service/consoleapi/extensions";
import {
    apiGetAppsDecorate,
    apiGetPublicApps,
    type QueryPublicAppsParams,
} from "@buildingai/service/webapi/apps";

import AppCard from "./components/app-card.vue";

const router = useRouter();
const { t } = useI18n();

/** 搜索表单状态 */
const searchForm = shallowReactive<QueryPublicAppsParams>({
    name: "",
    page: 1,
    pageSize: 20,
});

/** 加载状态 */
const loading = shallowRef(false);
/** 是否还有更多数据 */
const hasMore = shallowRef(true);
/** 应用列表 */
const apps = shallowRef<ExtensionFormData[]>([]);

/**
 * 构建查询参数
 * @returns 查询参数对象
 */
const buildQueryParams = (): QueryPublicAppsParams => ({
    name: searchForm.name,
    page: searchForm.page,
    pageSize: searchForm.pageSize,
});

/** 获取装修配置 */
const { data: appsDecorate } = await useAsyncData("apps-decorate", () => apiGetAppsDecorate());

/** SSR 初始数据加载 */
const { data: initialData, pending: ssrLoading } = await useAsyncData("public-apps-initial", () =>
    apiGetPublicApps(buildQueryParams()),
);

// 初始化应用列表
if (initialData.value) {
    apps.value = initialData.value.items || [];
    hasMore.value = initialData.value.totalPages > (searchForm.page || 1);
}

/**
 * 获取应用列表
 * @param reset 是否重置列表
 */
const getAppsList = async (reset = false) => {
    if (loading.value) return;

    loading.value = true;

    if (reset) {
        searchForm.page = 1;
        apps.value = [];
        hasMore.value = true;
    }

    try {
        const response = await apiGetPublicApps(buildQueryParams());

        if (reset) {
            apps.value = response.items || [];
        } else {
            apps.value.push(...(response.items || []));
        }

        hasMore.value = response.totalPages > (searchForm.page || 1);
    } catch (error) {
        console.error("获取应用列表失败:", error);
        hasMore.value = false;
    } finally {
        loading.value = false;
    }
};

/**
 * 加载更多数据
 */
const loadMore = async () => {
    if (!hasMore.value || loading.value) return;
    searchForm.page = (searchForm.page || 1) + 1;
    await getAppsList();
};

/** 搜索防抖处理 */
const handleSearch = useDebounceFn(() => getAppsList(true), 500);
watch(() => searchForm.name, handleSearch);

/**
 * 处理应用点击事件
 * @param app 应用数据
 */
const handleAppClick = (app: ExtensionFormData) => {
    if (app.identifier) {
        router.push(`/app/${app.identifier}`);
    }
};

definePageMeta({
    layout: "default",
    title: "menu.apps",
    auth: false,
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="container mx-auto flex h-full flex-col overflow-hidden">
        <!-- 固定头部：标题和搜索框 -->
        <div class="bg-background flex flex-none flex-col gap-3 p-4">
            <div class="flex items-center justify-between">
                <h2 class="hidden flex-none font-bold sm:block sm:text-base lg:text-lg">
                    {{ t("menu.apps") }}
                </h2>

                <div class="relative flex justify-center">
                    <UInput
                        v-model="searchForm.name"
                        :placeholder="t('extensions.manage.search')"
                        class="sm:w-full lg:w-md"
                        variant="soft"
                        @input="handleSearch"
                    >
                        <template #leading>
                            <UIcon name="i-lucide-search" />
                        </template>
                    </UInput>
                </div>
            </div>
        </div>

        <!-- 固定广告运营位 -->
        <div
            v-if="appsDecorate?.enabled && appsDecorate?.heroImageUrl"
            class="flex-none cursor-pointer overflow-hidden px-4 pb-4"
            @click="appsDecorate?.link && navigateToWeb(appsDecorate.link)"
        >
            <BdAspectRatio :ratio="1488 / 170">
                <NuxtImg
                    :src="appsDecorate.heroImageUrl"
                    :alt="appsDecorate.title || 'banner'"
                    class="h-full w-full rounded-lg object-contain"
                />
            </BdAspectRatio>
        </div>

        <!-- 可滚动的应用列表区域 -->
        <div class="min-h-0 flex-1">
            <BdScrollArea class="h-full">
                <BdInfiniteScroll
                    :loading="loading || ssrLoading"
                    :has-more="hasMore"
                    :no-more-text="searchForm.page === 1 ? ' ' : ''"
                    @load-more="loadMore"
                >
                    <!-- 应用列表 -->
                    <template v-if="apps.length > 0">
                        <div
                            class="grid grid-cols-1 gap-6 px-4 pt-2 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        >
                            <AppCard
                                v-for="app in apps"
                                :key="app.id"
                                :extension="app"
                                @click="handleAppClick"
                            />
                        </div>
                    </template>

                    <!-- 空状态 -->
                    <div v-else-if="!loading && !ssrLoading">
                        <div class="flex h-full min-h-[50vh] w-full items-center justify-center">
                            <div class="flex flex-col items-center gap-3">
                                <UIcon name="i-lucide-box" class="text-muted-foreground size-12" />
                                <span class="text-muted-foreground">
                                    {{ t("extensions.manage.empty.title") }}
                                </span>
                            </div>
                        </div>
                    </div>
                </BdInfiniteScroll>
            </BdScrollArea>
        </div>
    </div>
</template>
