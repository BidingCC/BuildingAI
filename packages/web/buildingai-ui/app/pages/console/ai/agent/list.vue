<script lang="ts" setup>
import type { Agent, QueryAgentParams } from "@buildingai/service/consoleapi/ai-agent";
import {
    apiAddAgentTags,
    apiDeleteAgent,
    apiExportAgentDsl,
    apiGetAgentList,
    apiRemoveAgentTags,
} from "@buildingai/service/consoleapi/ai-agent";

const AgentCard = defineAsyncComponent(() => import("./components/agent-card.vue"));
const AgentDecorate = defineAsyncComponent(() => import("./components/agent-decorate-modal.vue"));
const AgentModal = defineAsyncComponent(() => import("./components/agent-modal.vue"));
const TemplateDrawer = defineAsyncComponent(() => import("./components/template-drawer.vue"));
const AgentDslImport = defineAsyncComponent(() => import("./components/agent-dsl-import.vue"));

const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();

const searchForm = reactive<QueryAgentParams>({
    keyword: "",
    page: 1,
    pageSize: 15,
    tagIds: [],
    isPublic: undefined,
    createMode: undefined,
});

const loading = shallowRef(false);
const hasMore = shallowRef(true);
const agents = shallowRef<Agent[]>([]);

const getLists = async () => {
    if (loading.value) return;

    loading.value = true;
    searchForm.page = 1;

    try {
        const res = await apiGetAgentList(searchForm);

        agents.value = res.items || [];
        hasMore.value = res.totalPages > searchForm.page;
    } catch (error) {
        console.error("获取数据失败:", error);
        hasMore.value = false;
    } finally {
        loading.value = false;
    }
};

const loadMore = async () => {
    if (loading.value || !hasMore.value) return;

    loading.value = true;
    if (searchForm.page !== undefined) {
        searchForm.page++;
    }

    try {
        const res = await apiGetAgentList(searchForm);

        if (res.items && res.items.length > 0) {
            agents.value.push(...res.items);
            hasMore.value = res.totalPages > (searchForm.page || 0);
        } else {
            hasMore.value = false;
        }
    } catch (error) {
        if (searchForm.page !== undefined) {
            searchForm.page--;
        }
        console.error("加载更多数据失败:", error);
    } finally {
        loading.value = false;
    }
};

const handleDelete = async (agent: Agent) => {
    try {
        await useModal({
            title: t("console-common.delete"),
            description: t("ai-agent.backend.desc.delete"),
            color: "error",
        });

        await apiDeleteAgent(agent.id);

        const originalPage = searchForm.page;
        searchForm.page = 1;
        searchForm.pageSize = agents.value.length;
        await getLists();

        searchForm.page = originalPage;
        searchForm.pageSize = 15;
        toast.success(t("common.message.deleteSuccess"));
    } catch (error) {
        console.error("删除失败:", error);
    }
};

const mountAgentModal = async (agentId: string | null = null) => {
    const modal = overlay.create(AgentModal);

    const instance = modal.open({ id: agentId });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        searchForm.page = 1;
        searchForm.pageSize = 15;
        await getLists();
    }
};

const handleCreateFromTemplate = async () => {
    const drawer = overlay.create(TemplateDrawer);
    const instance = drawer.open();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        searchForm.page = 1;
        searchForm.pageSize = 15;
        await getLists();
    }

    drawer.open();
};

const handleEdit = (agent: Agent) => {
    mountAgentModal(agent.id);
};

const handleCreate = () => {
    mountAgentModal(null);
};

const handleExportDsl = async (agent: Agent) => {
    try {
        // 导出为 YAML 格式
        const dslContent = await apiExportAgentDsl(agent.id, "yaml");

        // 创建下载链接
        const blob = new Blob([dslContent], { type: "text/yaml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${agent.name || "agent"}.yaml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("DSL 文件导出成功！");
    } catch (error) {
        console.error("导出 DSL 失败:", error);
    }
};

const handleImportAgent = async () => {
    const modal = overlay.create(AgentDslImport);
    const instance = modal.open();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        searchForm.page = 1;
        searchForm.pageSize = 15;
        await getLists();
    }
};

const handleUpdateTags = async (agent: Agent, tags: string[]) => {
    const currentTagIds = agent.tags?.map((tag) => tag.id) ?? [];
    const newTagIds = tags;

    const addedTagIds = newTagIds.filter((id) => !currentTagIds.includes(id));
    const removedTagIds = currentTagIds.filter((id) => !newTagIds.includes(id));

    if (addedTagIds.length === 0 && removedTagIds.length === 0) {
        return;
    }

    if (addedTagIds.length > 0) {
        await apiAddAgentTags(agent.id, addedTagIds);
    }

    if (removedTagIds.length > 0) {
        await apiRemoveAgentTags(agent.id, removedTagIds);
    }

    await getLists();
};

const handleAgentDecorate = async () => {
    overlay.create(AgentDecorate).open();
};

onMounted(() => getLists());
</script>

<template>
    <div class="flex w-full flex-col items-center justify-center">
        <div
            class="bg-background sticky top-0 z-10 flex w-full flex-wrap justify-between gap-4 pb-2"
        >
            <div class="flex items-center gap-4">
                <UInput
                    v-model="searchForm.keyword"
                    :placeholder="$t('ai-agent.backend.search.placeholder')"
                    class="w-80"
                    @change="getLists"
                />

                <TagSelect v-model="searchForm.tagIds" @change="getLists" />

                <USelect
                    v-model="searchForm.isPublic"
                    :items="[
                        { label: $t('ai-agent.backend.search.allStatus'), value: undefined },
                        { label: $t('ai-agent.backend.configuration.public'), value: true },
                        { label: $t('ai-agent.backend.configuration.private'), value: false },
                    ]"
                    :placeholder="$t('ai-agent.backend.search.filterByStatus')"
                    label-key="label"
                    value-key="value"
                    class="w-38"
                    @change="getLists"
                />
                <USelect
                    v-model="searchForm.createMode"
                    :items="[
                        { label: $t('ai-agent.backend.search.allMode'), value: undefined },
                        { label: $t('ai-agent.backend.create.modes.direct'), value: 'direct' },
                        { label: $t('ai-agent.backend.create.modes.coze'), value: 'coze' },
                        { label: $t('ai-agent.backend.create.modes.dify'), value: 'dify' },
                    ]"
                    :placeholder="$t('ai-agent.backend.search.filterByMode')"
                    label-key="label"
                    value-key="value"
                    class="w-38"
                    @change="getLists"
                />
            </div>

            <div>
                <UButton
                    color="primary"
                    variant="ghost"
                    icon="i-lucide-package"
                    :label="$t('decorate.openDecorateSettings')"
                    @click.stop="handleAgentDecorate"
                />
            </div>
        </div>

        <BdScrollArea class="h-[calc(100vh-9rem)] min-h-0 w-full">
            <BdInfiniteScroll
                :loading="loading"
                :has-more="hasMore"
                :threshold="200"
                :loading-text="$t('common.loading')"
                :no-more-text="searchForm.page !== 1 ? $t('common.noMoreData') : ' '"
                @load-more="loadMore"
            >
                <div
                    class="grid grid-cols-1 gap-6 pt-2 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    <div
                        class="group border-default relative cursor-pointer rounded-lg border border-dashed p-4 transition-all duration-200 hover:shadow-lg"
                        @click="handleCreate"
                    >
                        <div
                            class="group-hover:text-primary text-foreground mb-3 flex items-center gap-3"
                        >
                            <div
                                class="border-default flex size-10 flex-none items-center justify-center rounded-lg border border-dashed"
                            >
                                <UIcon name="i-lucide-plus" class="h-6 w-6" />
                            </div>

                            <h3 class="truncate text-sm font-medium">
                                {{ $t("ai-agent.backend.create.title") }}
                            </h3>
                        </div>

                        <div class="text-muted-foreground mb-6 pr-8 text-xs">
                            <p class="line-clamp-2 overflow-hidden">
                                {{ $t("ai-agent.backend.create.desc") }}
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <UButton
                                color="primary"
                                variant="ghost"
                                class="w-full"
                                icon="i-lucide-package"
                                size="sm"
                                :label="$t('ai-agent.backend.create.fromTemplate')"
                                @click.stop="handleCreateFromTemplate"
                            />
                            <UButton
                                color="neutral"
                                variant="ghost"
                                class="w-full"
                                icon="i-lucide-file-up"
                                size="sm"
                                :label="$t('ai-agent.backend.dslImport.import')"
                                @click.stop="handleImportAgent"
                            />
                        </div>
                    </div>

                    <!-- 智能体卡片 -->
                    <AgentCard
                        v-for="agent in agents"
                        :key="agent.id"
                        :agent="agent"
                        @delete="handleDelete"
                        @edit="handleEdit"
                        @export-dsl="handleExportDsl"
                        @update-tags="handleUpdateTags"
                    />
                </div>
            </BdInfiniteScroll>
        </BdScrollArea>
    </div>
</template>
