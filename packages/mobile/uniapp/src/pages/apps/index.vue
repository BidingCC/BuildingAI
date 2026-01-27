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

// 查询列表
const queryList = (pageNo: number, pageSize: number) => {
    const params: QueryPublicAgentParams = {
        page: pageNo,
        pageSize: pageSize,
        keyword: "",
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
            pagingRef.value?.complete([]);
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

const handleAgentClick = (item: Agent) => {
    uni.navigateTo({
        url: `/packages/agent/explore?id=${item.publishToken}`,
    });
};

definePage({
    style: {
        navigationBarTitle: "pages.apps",
        auth: false,
        hiddenHeader: true,
    },
});
</script>

<template>
    <BdNavbar :title="t('pages.apps')" :show-back="false" :show-home="false" filter="blur(4px)">
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

        <z-paging
            ref="pagingRef"
            v-model="agentLists"
            @query="queryList"
            :show-scrollbar="false"
            :fixed="false"
            mt="2"
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
                @click="handleAgentClick(item)"
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
                    <view mt="2">编辑于{{ item.updatedAt }}</view>
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
