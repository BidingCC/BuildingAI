<script setup lang="ts">
import type { AiProviderInfo } from "@buildingai/service/consoleapi/ai-provider";
import type { McpServerDetail } from "@buildingai/service/consoleapi/mcp-server";
import {
    apiBatchDeleteMcpServers,
    apiDeleteMcpServer,
    apiGetMcpServerList,
    apiSetQuickMenu,
    apiUpdateMcpServer,
} from "@buildingai/service/consoleapi/mcp-server";

const McpServerCard = defineAsyncComponent(() => import("./components/mcp-server-card.vue"));
const McpServerEdit = defineAsyncComponent(() => import("./edit.vue"));
const McpDetail = defineAsyncComponent(() => import("./detail.vue"));

const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();

const selectMcpServer = shallowRef<Set<string>>(new Set());
const searchForm = shallowReactive({
    name: "",
    isDisabled: null,
});
const updateIds = shallowRef<string[]>([]);

const { paging, getLists } = usePaging({
    fetchFun: apiGetMcpServerList,
    params: searchForm,
});

const handleMcpServerSelect = (provider: McpServerDetail, selected: boolean | "indeterminate") => {
    if (typeof selected === "boolean") {
        const providerId = provider.id as string;
        if (selected) {
            selectMcpServer.value.add(providerId);
        } else {
            selectMcpServer.value.delete(providerId);
        }
    }
};

const handleSelectAll = (value: boolean | "indeterminate") => {
    const isSelected = value === true;
    if (isSelected) {
        paging.items.forEach((provider: AiProviderInfo) => {
            if (provider.id) {
                selectMcpServer.value.add(provider.id as string);
            }
        });
    } else {
        selectMcpServer.value.clear();
    }
};

const handleDelete = async (id: string | string[]) => {
    try {
        await useModal({
            title: t("ai-mcp.backend.deleteTitle"),
            description: t("ai-mcp.backend.deleteMessage"),
            color: "error",
        });

        if (Array.isArray(id)) {
            await apiBatchDeleteMcpServers(id);
            toast.success(t("ai-mcp.backend.deleteSuccess"));
        } else {
            await apiDeleteMcpServer(id);
            toast.success(t("ai-mcp.backend.deleteSuccess"));
        }

        selectMcpServer.value.clear();

        getLists();
    } catch (error) {
        console.error("Delete failed:", error);
    }
};

const handleDeleteProvider = (provider: McpServerDetail) => {
    if (provider.id) {
        handleDelete(provider.id);
    }
};

const handleBatchDelete = () => {
    const selectedIds = Array.from(selectMcpServer.value);
    if (selectedIds.length === 0) return;
    handleDelete(selectedIds);
};

const mountMcpServerEditModal = async (
    mcpServerId: string = "",
    jsonImportMode: boolean = false,
) => {
    const modal = overlay.create(McpServerEdit);

    const instance = modal.open({
        id: mcpServerId,
        isJsonImport: jsonImportMode,
        "onChange-update": (ids?: string[]) => {
            updateIds.value = ids || [];
        },
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const mountMcpDetailModal = async (mcpServerId: string) => {
    const modal = overlay.create(McpDetail);

    const instance = modal.open({ id: mcpServerId });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleViewModels = (mcpServerId: string) => {
    mountMcpDetailModal(mcpServerId);
};

const handleAddMcpServer = () => {
    mountMcpServerEditModal();
};

const handleImportMcpServer = () => {
    mountMcpServerEditModal("", true);
};

const handleSetQuickMenu = async (mcpServer: McpServerDetail) => {
    try {
        await apiSetQuickMenu(mcpServer.id);
        getLists();
        toast.success(t("ai-mcp.backend.quickMenuSuccess"));
    } catch (error) {
        console.error("Set quick menu failed:", error);
    }
};

const handleEditProvider = (provider: McpServerDetail) => {
    mountMcpServerEditModal(provider.id);
};

const handleToggleProviderActive = async (providerId: string, isDisabled: boolean) => {
    try {
        await apiUpdateMcpServer(providerId, { isDisabled });
        toast.success(isDisabled ? "MCP已禁用" : "MCP已启用");

        getLists();
    } catch (error) {
        console.error("Toggle provider active failed:", error);
    }
};

const isAllSelected = computed(() => {
    return (
        paging.items.length > 0 &&
        paging.items.every(
            (provider: AiProviderInfo) =>
                provider.id && selectMcpServer.value.has(provider.id as string),
        )
    );
});

const isIndeterminate = computed(() => {
    const selectedCount = paging.items.filter(
        (provider: AiProviderInfo) =>
            provider.id && selectMcpServer.value.has(provider.id as string),
    ).length;
    return selectedCount > 0 && selectedCount < paging.items.length;
});

onMounted(() => getLists());
</script>

<template>
    <div class="provider-list-container pb-5">
        <!-- 搜索区域 -->
        <div class="bg-background sticky top-0 z-10 flex flex-wrap gap-4 pb-2">
            <UInput
                v-model="searchForm.name"
                class="w-70"
                :placeholder="t('ai-mcp.backend.search.placeholder')"
                @change="getLists"
            />

            <USelect
                v-model="searchForm.isDisabled"
                :items="[
                    { label: t('ai-mcp.backend.search.all'), value: null },
                    { label: t('console-common.enabled'), value: false },
                    { label: t('console-common.disabled'), value: true },
                ]"
                class="w-fit"
                label-key="label"
                value-key="value"
                :placeholder="t('ai-mcp.backend.search.status')"
                @change="getLists"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <!-- 全选控制 -->
                <div class="flex items-center gap-2">
                    <UCheckbox
                        :model-value="
                            isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                        "
                        @update:model-value="handleSelectAll"
                    />
                    <span class="text-accent-foreground text-sm dark:text-gray-400">
                        {{ selectMcpServer.size }} / {{ paging.items.length }}
                        {{ t("console-common.selected") }}
                    </span>
                </div>

                <AccessControl :codes="['ai-mcp-servers:delete']">
                    <UButton
                        color="error"
                        variant="subtle"
                        :label="t('console-common.batchDelete')"
                        icon="i-heroicons-trash"
                        :disabled="selectMcpServer.size === 0"
                        @click="handleBatchDelete"
                    >
                        <template #trailing>
                            <UKbd>{{ selectMcpServer.size }}</UKbd>
                        </template>
                    </UButton>
                </AccessControl>

                <AccessControl :codes="['ai-mcp-servers:create']">
                    <UDropdownMenu
                        size="lg"
                        :items="[
                            {
                                label: t('ai-mcp.backend.quickCreateTitle'),
                                icon: 'i-heroicons-plus',
                                color: 'primary',
                                onSelect: () => handleAddMcpServer(),
                            },
                            {
                                label: t('ai-mcp.backend.importTitle'),
                                icon: 'i-lucide-file-json-2',
                                color: 'primary',
                                onSelect: () => handleImportMcpServer(),
                            },
                        ]"
                        :content="{
                            align: 'start',
                            side: 'bottom',
                            sideOffset: 8,
                        }"
                        :ui="{
                            content: 'w-48',
                        }"
                    >
                        <UButton icon="i-heroicons-plus" color="primary">
                            {{ t("ai-mcp.backend.addTitle") }}
                        </UButton>
                    </UDropdownMenu>
                </AccessControl>
            </div>
        </div>

        <!-- 卡片网格 -->
        <template v-if="!paging.loading && paging.items.length > 0">
            <BdScrollArea class="h-[calc(100vh-13rem)]" :shadow="false">
                <div
                    class="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    <McpServerCard
                        v-for="mcpServer in paging.items"
                        :key="mcpServer.id"
                        :mcpServer="mcpServer"
                        :selected="selectMcpServer.has(mcpServer.id as string)"
                        :isUpdate="updateIds"
                        @select="handleMcpServerSelect"
                        @delete="handleDeleteProvider"
                        @edit="handleEditProvider"
                        @view-models="handleViewModels"
                        @toggle-active="handleToggleProviderActive"
                        @set-quick-menu="handleSetQuickMenu"
                    />
                </div>
            </BdScrollArea>
        </template>

        <!-- 加载状态 -->
        <div
            v-else-if="paging.loading"
            class="flex h-[calc(100vh-13rem)] items-center justify-center"
        >
            <div class="flex items-center gap-3">
                <UIcon name="i-lucide-loader-2" class="text-primary-500 h-6 w-6 animate-spin" />
                <span class="text-accent-foreground">{{ $t("common.loading") }}</span>
            </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <UIcon name="i-lucide-building" class="text-muted-foreground mb-4 h-16 w-16" />
            <h3 class="text-secondary-foreground mb-2 text-lg font-medium">
                {{ $t("ai-mcp.backend.emptyState") }}
            </h3>
            <p class="text-accent-foreground">
                {{ $t("ai-mcp.backend.emptyStateDescription") }}
            </p>
            <UDropdownMenu
                size="lg"
                :items="[
                    {
                        label: t('ai-mcp.backend.quickCreateTitle'),
                        icon: 'i-heroicons-plus',
                        color: 'primary',
                        onSelect: () => handleAddMcpServer(),
                    },
                    {
                        label: t('ai-mcp.backend.importTitle'),
                        icon: 'i-lucide-file-json-2',
                        color: 'primary',
                        onSelect: () => handleImportMcpServer(),
                    },
                ]"
                :content="{
                    align: 'start',
                    side: 'bottom',
                    sideOffset: 8,
                }"
                :ui="{
                    content: 'w-48',
                }"
            >
                <UButton class="mt-4" icon="i-heroicons-plus" color="primary">
                    {{ $t("ai-mcp.backend.addFirstMcpServer") }}
                </UButton>
            </UDropdownMenu>
        </div>

        <!-- 分页 -->
        <div
            v-if="paging.total > 0"
            class="bg-background sticky bottom-0 z-10 flex items-center justify-between gap-3 py-4"
        >
            <div class="text-muted text-sm">
                {{ selectMcpServer.size }} {{ $t("console-common.selected") }}
            </div>

            <div class="flex items-center gap-1.5">
                <BdPagination
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    :total="paging.total"
                    @change="getLists"
                />
            </div>
        </div>
    </div>
</template>
