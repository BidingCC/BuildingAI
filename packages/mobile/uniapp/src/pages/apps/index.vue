<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import type { QueryPublicAgentParams } from "@buildingai/service/webapi/ai-agent";
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

import BdNavbar from "@/components/bd-navbar.vue?async";
import { useDebounce } from "@/hooks/use-debounce";
import { apiGetPublicAgents } from "@/service/agent";

const { t } = useI18n();

const agentLists = shallowRef<Agent[]>([]);
const pagingRef = shallowRef<ZPagingRef>();

// 搜索关键词
const searchKeyword = shallowRef("");

// 排序方式
const sortBy = shallowRef<"latest" | "popular">("latest");
const sortOptions = [
    { label: "最新发布", value: "latest" as const },
    { label: "最受欢迎", value: "popular" as const },
];

// 排序弹窗引用
const sortPopupRef = ref<UniPopupInstance>();

// 查询列表
const queryList = (pageNo: number, pageSize: number) => {
    const params: QueryPublicAgentParams = {
        page: pageNo,
        pageSize: pageSize,
        keyword: "",
        sortBy: sortBy.value,
    };

    // 如果有搜索关键词，添加到参数中
    if (searchKeyword.value.trim()) {
        params.keyword = searchKeyword.value.trim();
    }

    apiGetPublicAgents(params)
        .then((res) => {
            pagingRef.value?.complete(res.items);
        })
        .catch((error) => {
            console.error("Failed to load agents:", error);
            pagingRef.value?.complete(false);
        });
};

// 使用防抖 Hook 处理搜索
const { debouncedFn: debouncedSearch } = useDebounce(() => {
    pagingRef.value?.reload();
}, 500);

// 搜索处理
const handleSearch = (value: string) => {
    searchKeyword.value = value;
    debouncedSearch();
};

// 清除搜索
const handleClearSearch = () => {
    searchKeyword.value = "";
    pagingRef.value?.reload();
};

// 打开排序选择面板
const handleOpenSortMenu = () => {
    sortPopupRef.value?.open?.();
};

// 切换排序方式
const handleSortChange = (value: "latest" | "popular") => {
    sortBy.value = value;
    sortPopupRef.value?.close?.();
    pagingRef.value?.reload();
};

// 获取当前排序选项的标签
const currentSortLabel = computed(() => {
    return sortOptions.find((opt) => opt.value === sortBy.value)?.label || "最新发布";
});

definePage({
    style: {
        navigationBarTitle: "pages.apps",
        hiddenHeader: true,
    },
});
</script>

<template>
    <BdNavbar :title="t('pages.apps')" :show-back="false" :show-home="false" filter="blur(4px)">
        <!-- <template #left>
            <view bg="white" py="2" px="4" rounded="5" flex gap="1" items-center z="0">
                <view i-lucide-search size="4"></view>
                <view text="sm muted-foreground">搜索智能体</view>
            </view>
        </template> -->
    </BdNavbar>
    <view class="flex h-[calc(100vh-112px)] flex-col overflow-hidden px-4">
        <view bg="white" py="2" px="4" rounded="5" flex gap="1" items-center z="0">
            <view i-lucide-search size="4"></view>
            <input
                :value="searchKeyword"
                type="text"
                placeholder="搜索智能体"
                font-size="sm"
                @input="(e) => handleSearch((e.target as HTMLInputElement).value)"
            />
            <view
                v-if="searchKeyword"
                i-lucide-x
                size="3"
                text="muted-foreground"
                @click="handleClearSearch"
            ></view>
        </view>
        <view flex justify-end gap="2" font-size="sm" text="muted-foreground" my="2">
            <view text="primary" flex items-center gap="1" @click="handleOpenSortMenu">
                {{ currentSortLabel }}
                <view i-lucide-chevron-down size="3"></view>
            </view>
        </view>

        <!-- 排序选择弹窗 -->
        <uni-popup ref="sortPopupRef" type="top" :safe-area="false" z-index="999">
            <view class="bg-background rounded-b-5 overflow-hidden shadow-lg">
                <view
                    class="bg-background active:bg-muted flex items-center justify-center border-b border-gray-200 py-4"
                    :class="sortBy === 'latest' ? 'text-primary-600' : 'text-foreground'"
                    @click="handleSortChange('latest')"
                >
                    <text class="text-base leading-normal">最新发布</text>
                </view>
                <view
                    class="bg-background active:bg-muted flex items-center justify-center py-4"
                    :class="sortBy === 'popular' ? 'text-primary-600' : 'text-foreground'"
                    @click="handleSortChange('popular')"
                >
                    <text class="text-base leading-normal">最受欢迎</text>
                </view>
            </view>
        </uni-popup>
        <z-paging
            ref="pagingRef"
            v-model="agentLists"
            @query="queryList"
            :show-scrollbar="false"
            :fixed="false"
            class="flex-1"
        >
            <view
                border="~ rounded-lg"
                p="3"
                bg="background"
                shadow="sm"
                mb="2"
                v-for="item in agentLists"
                :key="item.id"
            >
                <view flex items-center gap="2">
                    <image :src="item.avatar" size="10" rounded="md" />
                    <view>{{ item.name }}</view>
                    <image :src="item.provider?.iconUrl" size="4" ml="auto" rounded="md" />
                </view>
                <view
                    text="sm muted-foreground"
                    mt="3"
                    border-t-solid
                    border-t-1
                    border-t-gray-200
                    pt="3"
                >
                    {{ item.description }}
                </view>
                <view flex justify-between items-center text="xs muted-foreground" mt="2">
                    <view flex items-center gap="1">
                        <view i-lucide-message-square-text size="3"></view
                        >{{ item.conversationCount }} <view i-lucide-users size="3"></view
                        >{{ item.userCount }}
                    </view>
                    <view mt="2">编辑于2025-12-22</view>
                </view>
            </view>
        </z-paging>
    </view>
</template>
<style>
/* #ifndef H5 */
page {
    background-image:
        url("@/static/images/background.png"),
        linear-gradient(
            to bottom,
            var(--primary-300) 0%,
            var(--primary-200) 10%,
            var(--primary-50) 25%,
            var(--background-soft) 30%,
            var(--background-soft) 100%
        );
    background-size: 100%, cover;
    background-position: top, top;
    background-repeat: no-repeat, no-repeat;
    z-index: 0;
}
/* #endif */
</style>
