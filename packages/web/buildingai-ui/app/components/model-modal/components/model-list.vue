<script setup lang="ts">
import {
    apiBatchDeleteAiModel,
    apiBatchSetAiModelIsActive,
    apiBatchSortAiModel,
    apiGetAiModelList,
    apiSetAiModelIsActive,
} from "@buildingai/service/consoleapi/ai-model";
import type { AiModelInfo, ModelType } from "@buildingai/service/consoleapi/ai-provider";
import { apiGetAiProviderModelTypes } from "@buildingai/service/consoleapi/ai-provider";
import type { AiModel, AiProvider } from "@buildingai/service/webapi/ai-conversation";
import Draggable from "vuedraggable";

const ModelModal = defineAsyncComponent(() => import("./model-form-modal.vue"));
const ModelBatchEdit = defineAsyncComponent(() => import("./model-batch-edit.vue"));
const ModelBillingSetting = defineAsyncComponent(() => import("./model-billing-setting.vue"));

const props = defineProps<{
    provider?: {
        id?: string;
        name?: string;
        iconUrl?: string;
    };
}>();

const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();
const { hasAccessByCodes } = useAccessControl();

const models = shallowRef<AiModelInfo[]>([]);
const searchForm = reactive({
    modelType: "all",
    search: "",
});
const selectedModels = ref<Set<string>>(new Set());
const selectedModelsData = ref<Set<AiModelInfo>>(new Set());

const modelTypeOptions = shallowRef<{ label: string; value: string }[]>([]);

const getModelTypes = async () => {
    try {
        const data = await apiGetAiProviderModelTypes();
        modelTypeOptions.value = [
            { label: t("ai-provider.backend.model.modelTypes.all"), value: "all" },
            ...data.map((type: ModelType) => ({
                label: type.label,
                value: type.value,
            })),
        ];
    } catch (error) {
        console.error("获取模型类型列表失败:", error);
    }
};

onMounted(() => {
    getModelTypes();
});

const { lockFn: getLists, isLock: loading } = useLockFn(async () => {
    if (!props.provider?.id) return;

    try {
        const result = await apiGetAiModelList({
            providerId: props.provider.id,
            isActive: undefined,
            keyword: searchForm.search?.trim() || undefined,
            modelType: searchForm.modelType === "all" ? undefined : searchForm.modelType,
        });
        models.value = result || [];
    } catch (error) {
        console.error("获取模型列表失败:", error);
    }
});

const { lockFn: handleToggleActive } = useLockFn(async (modelId: string, isActive: boolean) => {
    try {
        await apiSetAiModelIsActive(modelId, isActive);

        const model = models.value.find((m: AiModelInfo) => m.id === modelId);
        if (model) {
            model.isActive = isActive;
        }
        getLists();
    } catch (error) {
        console.error("切换模型状态失败:", error);
    }
});

const handleEditModel = async (model: AiModelInfo) => {
    const modal = overlay.create(ModelModal);

    const instance = modal.open({
        id: model.id,
        provider: props.provider,
    });

    const shouldRefresh = await instance.result;
    if (shouldRefresh) getLists();
};

const handleAddModel = async () => {
    const modal = overlay.create(ModelModal);

    const instance = modal.open({
        id: null,
        provider: props.provider,
    });

    const shouldRefresh = await instance.result;
    if (shouldRefresh) getLists();
};

const handleBatchEdit = async () => {
    if (selectedModels.value.size === 0) return;

    const modal = overlay.create(ModelBatchEdit);
    const instance = modal.open({
        models: selectedModelsData.value,
        provider: props.provider,
    });

    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
    selectedModels.value.clear();
    selectedModelsData.value.clear();
};

const handleBillingSetting = async () => {
    if (selectedModels.value.size === 0) {
        toast.warning(t("ai-provider.backend.messages.selectModel"));
        return;
    }

    const modal = overlay.create(ModelBillingSetting);
    const instance = modal.open({
        models: selectedModelsData.value,
        provider: props.provider,
    });

    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
    selectedModels.value.clear();
    selectedModelsData.value.clear();
};

const { lockFn: handleBatchIsActiveChange } = useLockFn(async (isActive: boolean) => {
    if (selectedModels.value.size === 0) return;
    const selectedIds = Array.from(selectedModels.value) as string[];
    try {
        await apiBatchSetAiModelIsActive(selectedIds, isActive);
        toast.success(
            isActive
                ? t("ai-provider.backend.model.messages.isActiveEnabled")
                : t("ai-provider.backend.model.messages.isActiveDisabled"),
        );
        selectedModels.value.clear();
        selectedModelsData.value.clear();
        getLists();
    } catch (error) {
        console.error("Toggle model active failed:", error);
    }
});

const { lockFn: handleBatchDelete } = useLockFn(async () => {
    if (selectedModels.value.size === 0) return;
    const selectedIds = Array.from(selectedModels.value) as string[];

    try {
        await useModal({
            title: t("ai-provider.backend.model.messages.deleteTitle"),
            description: t("ai-provider.backend.model.messages.deleteMsg"),
            color: "error",
        });

        await apiBatchDeleteAiModel(selectedIds);
        toast.success(t("console-common.batchDeleteSuccess"));
        selectedModels.value.clear();
        selectedModelsData.value.clear();
        getLists();
    } catch (error) {
        console.error("批量删除失败:", error);
        toast.error(t("console-common.batchDeleteFailed"));
    }
});

const { lockFn: handleDragEnd, isLock: isDragging } = useLockFn(async () => {
    if (models.value.length === 0) return;

    try {
        // 提取排序后的模型ID数组
        const sortedIds = models.value.map((model) => model.id as string);

        await apiBatchSortAiModel(sortedIds);
        // 刷新列表以获取最新的排序
        await getLists();
    } catch (error) {
        console.error("更新排序失败:", error);
        // 如果更新失败，重新加载列表恢复原顺序
        await getLists();
    }
});

const draggableModels = computed({
    get: () => models.value,
    set: (newOrder: AiModelInfo[]) => {
        models.value = newOrder;
        // 拖拽结束后更新排序
        handleDragEnd();
    },
});

const getBatchItems = () => {
    const items = [];
    if (hasAccessByCodes(["ai-models:update"])) {
        items.push({
            label: t("console-common.batchEnable"),
            icon: "i-lucide-eye",
            color: "neutral" as const,
            onSelect: () => handleBatchIsActiveChange(true),
        });
        items.push({
            label: t("console-common.batchDisable"),
            icon: "i-lucide-eye-off",
            color: "neutral" as const,
            onSelect: () => handleBatchIsActiveChange(false),
        });
        items.push({
            label: t("console-common.batchEdit"),
            icon: "i-lucide-edit",
            color: "neutral" as const,
            onSelect: () => handleBatchEdit(),
        });
    }
    if (hasAccessByCodes(["ai-models:delete"])) {
        items.push({
            label: t("console-common.batchDelete"),
            icon: "i-heroicons-trash",
            color: "error" as const,
            onSelect: () => handleBatchDelete(),
        });
    }
    return items;
};

const toggleModelSelection = (model: AiModelInfo) => {
    const modelId = model.id as string;
    const newSelectedModels = new Set(selectedModels.value);
    const newSelectedModelsData = new Set(selectedModelsData.value);

    if (newSelectedModels.has(modelId)) {
        newSelectedModels.delete(modelId);
        newSelectedModelsData.delete(model);
    } else {
        newSelectedModels.add(modelId);
        newSelectedModelsData.add(model);
    }

    selectedModels.value = newSelectedModels;
    selectedModelsData.value = newSelectedModelsData;
};

const toggleSelectAll = () => {
    if (selectedModels.value.size === models.value.length) {
        // Select all state, unselect all
        selectedModels.value.clear();
        selectedModelsData.value.clear();
    } else {
        // Non-select all state, select all models
        const newSelectedModels = new Set<string>();
        const newSelectedModelsData = new Set<AiModelInfo>();

        models.value.forEach((model: AiModelInfo) => {
            if (model.id) {
                newSelectedModels.add(model.id as string);
                newSelectedModelsData.add(model);
            }
        });

        selectedModels.value = newSelectedModels;
        selectedModelsData.value = newSelectedModelsData;
    }
};

const isAllSelected = computed(
    () => models.value.length > 0 && selectedModels.value.size === models.value.length,
);
const isIndeterminate = computed(
    () => selectedModels.value.size > 0 && selectedModels.value.size < models.value.length,
);

const getModelTypeTags = (modelType: string) => {
    const tags = [];

    if (modelType) {
        tags.push(modelType.toUpperCase().replaceAll("-", " "));
    }

    return tags;
};

watch(
    () => props.provider?.id,
    () => getLists(),
    { immediate: true },
);

const triggerSearch = useDebounceFn(() => {
    getLists();
}, 300);

watch(
    () => searchForm,
    () => triggerSearch(),
);
</script>

<template>
    <div class="w-full space-y-2 px-5 pb-6">
        <div class="mb-4 pl-2">
            <UInput
                v-model="searchForm.search"
                variant="soft"
                :placeholder="t('ai-provider.backend.model.searchPlaceholder')"
                :ui="{ root: 'w-full', base: 'bg-accent' }"
                @change="getLists()"
            />
        </div>
        <div class="mb-4 flex items-center justify-between pl-2">
            <div class="flex items-center gap-3">
                <UCheckbox
                    :model-value="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @update:model-value="toggleSelectAll"
                />
                <h3 class="text-xs font-medium">
                    {{ t("ai-provider.backend.model.allModels") }} {{ models.length }}
                    {{ t("ai-provider.backend.model.unit") }}
                    <span v-if="selectedModels.size > 0" class="text-primary">
                        ({{ t("ai-provider.backend.model.selected") }} {{ selectedModels.size }}
                        {{ t("ai-provider.backend.model.unit") }})
                    </span>
                </h3>
            </div>
            <div class="flex items-center gap-2">
                <USelect
                    v-model="searchForm.modelType"
                    :items="modelTypeOptions"
                    label-key="label"
                    value-key="value"
                    :placeholder="t('ai-provider.backend.model.modelTypeFilter')"
                    size="sm"
                    class="w-30"
                    @change="getLists"
                >
                </USelect>

                <UDropdownMenu
                    v-if="
                        hasAccessByCodes(['ai-models:delete']) ||
                        hasAccessByCodes(['ai-models:update'])
                    "
                    :items="getBatchItems()"
                    size="sm"
                    :content="{
                        align: 'start',
                        side: 'bottom',
                        sideOffset: 8,
                    }"
                >
                    <UButton
                        color="neutral"
                        variant="outline"
                        icon="i-lucide-list-checks"
                        size="sm"
                        :label="
                            t('ai-provider.backend.model.batchOperation', {
                                count: selectedModels.size,
                            })
                        "
                    />
                </UDropdownMenu>
                <AccessControl :codes="['ai-models:update']">
                    <UButton
                        color="primary"
                        variant="soft"
                        size="sm"
                        @click="() => handleBillingSetting()"
                    >
                        {{ t("ai-provider.backend.model.billingSetting") }}
                    </UButton>
                </AccessControl>
                <AccessControl :codes="['ai-models:create']">
                    <UButton
                        color="primary"
                        variant="soft"
                        icon="i-lucide-plus"
                        size="sm"
                        @click="() => handleAddModel()"
                    >
                        {{ t("ai-provider.backend.model.addModel") }}
                    </UButton>
                </AccessControl>
            </div>
        </div>

        <div
            v-if="loading && searchForm.search.trim() === '' && models.length === 0"
            class="space-y-3"
        >
            <div
                v-for="i in 10"
                :key="i"
                class="bg-muted flex items-center gap-4 rounded-lg p-8"
            ></div>
        </div>
        <template v-if="models.length > 0">
            <Draggable
                v-model="draggableModels"
                :disabled="isDragging"
                handle=".drag-handle"
                item-key="id"
                animation="200"
                class="space-y-0"
            >
                <template #item="{ element: model }">
                    <div
                        class="group hover:bg-muted flex items-center gap-3 rounded-lg p-2 transition-colors"
                        :class="{ 'bg-primary/5': selectedModels.has(model.id as string) }"
                    >
                        <div
                            class="flex-none opacity-0 group-hover:opacity-100"
                            :class="{ 'opacity-100': selectedModels.has(model.id as string) }"
                        >
                            <UCheckbox
                                :model-value="selectedModels.has(model.id as string)"
                                @update:model-value="toggleModelSelection(model)"
                            />
                        </div>

                        <div class="flex-none">
                            <UAvatar
                                :src="props.provider?.iconUrl"
                                :alt="props.provider?.name"
                                :ui="{
                                    root: 'rounded bg-transparent size-8',
                                    fallback: 'text-inverted',
                                }"
                                :class="[props.provider?.iconUrl ? '' : 'bg-primary']"
                            />
                        </div>
                        <UPopover
                            mode="hover"
                            :content="{
                                align: 'center',
                                side: 'left',
                                sideOffset: 10,
                            }"
                        >
                            <div class="min-w-0 flex-1">
                                <div class="mb-1 flex items-center gap-2">
                                    <h4
                                        class="hover:text-primary cursor-pointer truncate text-sm font-medium text-gray-900 transition-colors dark:text-gray-100"
                                    >
                                        {{ model.name }}
                                    </h4>

                                    <div class="flex gap-1">
                                        <UBadge
                                            variant="soft"
                                            color="neutral"
                                            v-for="tag in getModelTypeTags(model.modelType)"
                                            :key="tag"
                                            size="xs"
                                        >
                                            {{ tag }}
                                        </UBadge>

                                        <UBadge
                                            v-if="model.features?.includes('vision')"
                                            variant="soft"
                                            color="info"
                                            size="xs"
                                        >
                                            <UIcon name="i-lucide-image-play" size="xs" />
                                            {{ $t("common.ai.vision") }}
                                        </UBadge>
                                        <UBadge
                                            v-if="model.features?.includes('video')"
                                            variant="soft"
                                            color="warning"
                                            size="xs"
                                        >
                                            <UIcon name="i-lucide-video" class="mr-1" size="xs" />
                                            {{ $t("common.ai.video") }}
                                        </UBadge>
                                        <UBadge
                                            v-if="model.features?.includes('audio')"
                                            variant="soft"
                                            color="success"
                                            size="xs"
                                        >
                                            <UIcon
                                                name="i-lucide-audio-lines"
                                                class="mr-1"
                                                size="xs"
                                            />
                                            {{ $t("common.ai.audio") }}
                                        </UBadge>
                                    </div>
                                    <UIcon
                                        v-if="model.membershipLevel.length > 0"
                                        name="i-lucide-crown"
                                        class="text-warning size-4"
                                    />
                                </div>
                                <div
                                    v-if="model.billingRule.power > 0"
                                    class="text-muted-foreground flex items-center gap-2 text-xs"
                                >
                                    <span
                                        >{{ model.billingRule?.power || 0 }}
                                        {{ t("ai-provider.backend.model.points") }}</span
                                    >
                                    <span>•</span>
                                    <span
                                        >{{ model.billingRule?.tokens || 0 }}
                                        {{ t("ai-provider.backend.model.tokens") }}</span
                                    >
                                </div>
                                <UBadge v-else variant="soft" color="primary" size="sm">
                                    Free
                                </UBadge>
                            </div>
                            <template #content>
                                <ModelInfoPopover
                                    :model="model as never as unknown as AiModel"
                                    :provider="props.provider as AiProvider"
                                    :show-billing-rule="true"
                                />
                            </template>
                        </UPopover>

                        <div class="flex flex-none items-center gap-3">
                            <AccessControl :codes="['ai-models:update']">
                                <UButton
                                    color="primary"
                                    variant="ghost"
                                    icon="i-lucide-edit"
                                    size="sm"
                                    @click="handleEditModel(model)"
                                />
                                <USwitch
                                    size="sm"
                                    :model-value="model.isActive"
                                    @update:model-value="handleToggleActive(model.id, $event)"
                                />
                                <UButton
                                    class="drag-handle cursor-move"
                                    color="neutral"
                                    variant="ghost"
                                    icon="i-lucide-grip-vertical"
                                    size="sm"
                                    :disabled="isDragging"
                                />
                            </AccessControl>
                        </div>
                    </div>
                </template>
            </Draggable>
        </template>

        <div v-else-if="!loading && models.length === 0" class="py-12 text-center">
            <UIcon name="i-lucide-brain" class="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 class="text-foreground mb-2 text-lg font-medium">
                {{ t("ai-provider.backend.model.noModels") }}
            </h3>
            <p class="text-muted-foreground text-sm">
                {{ t("ai-provider.backend.model.noModelsDescription") }}
            </p>
        </div>
    </div>
</template>
