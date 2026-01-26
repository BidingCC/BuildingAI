<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import {
    apiGetAgentDecorate,
    apiGetPublicAgents,
    type QueryPublicAgentParams,
} from "@buildingai/service/webapi/ai-agent";
import { apiGetTagList } from "@buildingai/service/webapi/tag";

import AgentSquareCard from "./components/square-card.vue";

const router = useRouter();
const { t } = useI18n();

const searchForm = shallowReactive<QueryPublicAgentParams>({
    keyword: "",
    sortBy: "latest" as "latest" | "popular",
    page: 1,
    pageSize: 20,
});

const loading = shallowRef(false);
const hasMore = shallowRef(true);
const selectedTagId = shallowRef<string | undefined>(undefined);
const agents = shallowRef<Agent[]>([]);

const buildQueryParams = (): QueryPublicAgentParams => ({
    keyword: searchForm.keyword,
    sortBy: searchForm.sortBy,
    page: searchForm.page,
    pageSize: searchForm.pageSize,
    tagIds: selectedTagId.value ? [selectedTagId.value] : undefined,
});

const { data: tagsList } = await useAsyncData("tags", () => apiGetTagList(), {
    transform: (data) => [
        {
            name: t("ai-agent.frontend.square.recommended"),
            id: undefined,
        },
        ...data,
    ],
});

const { data: agentDecorate } = await useAsyncData("agent-decorate", () => apiGetAgentDecorate());

const { data: initialData, pending: ssrLoading } = await useAsyncData("public-agents-initial", () =>
    apiGetPublicAgents(buildQueryParams()),
);

if (initialData.value) {
    agents.value = initialData.value.items || [];
    hasMore.value = initialData.value.totalPages > (searchForm.page || 1);
}

const getAgentList = async (reset = false) => {
    if (loading.value) return;

    loading.value = true;

    if (reset) {
        searchForm.page = 1;
        agents.value = [];
        hasMore.value = true;
    }

    try {
        const response = await apiGetPublicAgents(buildQueryParams());

        if (reset) {
            agents.value = response.items || [];
        } else {
            agents.value.push(...(response.items || []));
        }

        hasMore.value = response.totalPages > (searchForm.page || 1);
    } catch (error) {
        console.error("获取智能体列表失败:", error);
        hasMore.value = false;
    } finally {
        loading.value = false;
    }
};

const loadMore = async () => {
    if (!hasMore.value || loading.value) return;
    searchForm.page = (searchForm.page || 1) + 1;
    await getAgentList();
};

const handleSearch = useDebounceFn(() => getAgentList(true), 500);
watch(() => searchForm.keyword, handleSearch);

const handleSortChange = (sortBy: "latest" | "popular") => {
    searchForm.sortBy = sortBy;
    getAgentList(true);
};

const handleTagClick = (tagId: string | undefined) => {
    selectedTagId.value = tagId;
    getAgentList(true);
};

const handleAgentClick = (agent: Agent) => {
    if (agent.publishToken) {
        router.push(`/public/agent/explore/${agent.publishToken}`);
    }
};

definePageMeta({
    layout: "default",
    title: "menu.agentSquare",
    auth: false,
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="container mx-auto flex h-full flex-col">
        <div class="bg-background sticky top-0 z-10 flex flex-col gap-3 p-4">
            <div class="flex items-center justify-between">
                <h2 class="hidden flex-none font-bold sm:block sm:text-base lg:text-lg">
                    {{ $t("ai-agent.frontend.square.square") }}
                </h2>

                <div class="relative mx-auto flex w-full max-w-3xl justify-center">
                    <UInput
                        v-model="searchForm.keyword"
                        :placeholder="$t('ai-agent.frontend.square.searchPlaceholder')"
                        class="sm:w-full lg:w-md"
                        variant="soft"
                        @input="handleSearch"
                    >
                        <template #leading>
                            <UIcon name="i-lucide-search" />
                        </template>
                    </UInput>
                </div>
                <div
                    class="dark:bg-background/30 flex flex-none gap-2 rounded-lg bg-neutral-100 p-1"
                >
                    <UButton
                        :color="searchForm.sortBy === 'latest' ? 'primary' : 'neutral'"
                        :variant="searchForm.sortBy === 'latest' ? 'solid' : 'ghost'"
                        @click="handleSortChange('latest')"
                    >
                        {{ $t("ai-agent.frontend.square.sortByLatest") }}
                    </UButton>
                    <UButton
                        :color="searchForm.sortBy === 'popular' ? 'primary' : 'neutral'"
                        :variant="searchForm.sortBy === 'popular' ? 'solid' : 'ghost'"
                        @click="handleSortChange('popular')"
                    >
                        {{ $t("ai-agent.frontend.square.sortByPopular") }}
                    </UButton>
                </div>
            </div>

            <div class="flex flex-wrap gap-2">
                <UButton
                    v-for="tag in tagsList"
                    :key="tag.id ?? 'recommended'"
                    :color="selectedTagId === tag.id ? 'primary' : 'neutral'"
                    :variant="selectedTagId === tag.id ? 'soft' : 'ghost'"
                    class="px-3 py-1"
                    @click="handleTagClick(tag.id)"
                >
                    {{ tag.name }}
                </UButton>
            </div>
        </div>

        <div class="h-full min-h-0">
            <section class="flex h-full min-h-0 flex-col">
                <BdScrollArea class="min-0 h-full">
                    <BdInfiniteScroll
                        :loading="loading || ssrLoading"
                        :has-more="hasMore"
                        :no-more-text="searchForm.page === 1 ? ' ' : ''"
                        @load-more="loadMore"
                    >
                        <div
                            v-if="agentDecorate?.enabled"
                            class="flex flex-col items-center justify-between gap-4 px-4 pb-8 lg:flex-row"
                        >
                            <div class="flex flex-col gap-6">
                                <div class="flex flex-col gap-2 pr-10">
                                    <h1
                                        class="line-clamp-2 font-bold sm:text-2xl sm:text-xl lg:text-4xl"
                                    >
                                        <span>{{ agentDecorate?.title }}</span>
                                    </h1>
                                    <p class="text-muted-foreground pr-4 text-base">
                                        <span>{{ agentDecorate?.description }}</span>
                                    </p>
                                </div>
                                <div>
                                    <UButton
                                        color="neutral"
                                        variant="solid"
                                        size="xl"
                                        class="rounded-full px-6"
                                        @click="
                                            agentDecorate?.link && navigateToWeb(agentDecorate.link)
                                        "
                                    >
                                        {{ $t("ai-agent.frontend.square.ctaLabel") }}
                                    </UButton>
                                </div>
                            </div>
                            <div
                                class="relative flex-none overflow-hidden rounded-lg"
                                style="width: 520px; height: 280px"
                                @click="agentDecorate?.link && navigateToWeb(agentDecorate.link)"
                            >
                                <NuxtImg
                                    :src="agentDecorate?.heroImageUrl"
                                    alt="square"
                                    class="h-full w-full object-cover"
                                />

                                <div class="absolute right-0 bottom-0 left-0 p-4">
                                    <NuxtImg
                                        :src="agentDecorate?.overlayIconUrl"
                                        class="mb-3 size-16 rounded-lg"
                                    />
                                    <h3 class="text-background text-lg font-bold">
                                        {{ agentDecorate?.overlayTitle }}
                                    </h3>
                                    <p class="text-background text-sm">
                                        {{ agentDecorate?.overlayDescription }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <template v-if="agents.length > 0">
                            <div
                                class="grid grid-cols-1 gap-6 px-4 pt-2 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                                <AgentSquareCard
                                    v-for="agent in agents"
                                    :key="agent.id"
                                    :agent="agent"
                                    @click="handleAgentClick"
                                />
                            </div>
                        </template>
                        <div v-else>
                            <div class="flex h-[70vh] w-full items-center justify-center">
                                <div class="flex flex-col items-center gap-3">
                                    <span class="text-muted-foreground">
                                        {{ $t("ai-agent.frontend.square.noResults") }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </BdInfiniteScroll>
                </BdScrollArea>
            </section>
        </div>
    </div>
</template>
