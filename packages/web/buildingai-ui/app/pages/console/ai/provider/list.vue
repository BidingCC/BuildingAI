<script setup lang="ts">
import type {
    AiProviderInfo,
    AiProviderQueryParams,
} from "@buildingai/service/consoleapi/ai-provider";
import {
    apiBatchDeleteAiProviders,
    apiDeleteAiProvider,
    apiGetAiProviderList,
    apiToggleAiProviderActive,
} from "@buildingai/service/consoleapi/ai-provider";

const ProviderCard = defineAsyncComponent(() => import("./components/provider-card.vue"));
const ProviderEdit = defineAsyncComponent(() => import("./edit.vue"));
const ModelModal = defineAsyncComponent(() => import("@/components/model-modal/model-modal.vue"));

// const router = useRouter();
const toast = useMessage();
const { t } = useI18n();
const overlay = useOverlay();

const searchForm: AiProviderQueryParams = shallowReactive({
    keyword: "",
    isActive: undefined,
});
const searchIsActive = shallowRef();
const selectedProviders = ref<Set<string>>(new Set());

const providers = shallowRef<AiProviderInfo[]>([]);

const { lockFn: getLists, isLock: loading } = useLockFn(async () => {
    try {
        const data = await apiGetAiProviderList(searchForm);
        providers.value = data;
    } catch (error) {
        console.error("Get provider list failed:", error);
    }
});

const handleProviderSelect = (provider: AiProviderInfo, selected: boolean | "indeterminate") => {
    if (typeof selected === "boolean") {
        const providerId = provider.id as string;
        if (selected) {
            selectedProviders.value.add(providerId);
        } else {
            selectedProviders.value.delete(providerId);
        }
    }
};

const handleSelectAll = (value: boolean | "indeterminate") => {
    const isSelected = value === true;
    if (isSelected) {
        providers.value.forEach((provider: AiProviderInfo) => {
            if (provider.id) {
                selectedProviders.value.add(provider.id as string);
            }
        });
    } else {
        selectedProviders.value.clear();
    }
};

const handleDelete = async (id: string | string[]) => {
    try {
        await useModal({
            title: t("ai-provider.backend.confirm.deleteTitle"),
            description: t("ai-provider.backend.confirm.deleteMessage"),
            color: "error",
        });

        if (Array.isArray(id)) {
            await apiBatchDeleteAiProviders(id);
            toast.success(t("console-common.batchDeleteSuccess"));
        } else {
            await apiDeleteAiProvider(id);
            toast.success(t("common.message.deleteSuccess"));
        }

        // Clear selected state
        selectedProviders.value.clear();

        // Refresh list
        getLists();
    } catch (error) {
        console.error("Delete failed:", error);
    }
};

const handleDeleteProvider = (provider: AiProviderInfo) => {
    if (provider.id) {
        handleDelete(provider.id);
    }
};

const handleBatchDelete = () => {
    const selectedIds = Array.from(selectedProviders.value);
    if (selectedIds.length === 0) return;
    handleDelete(selectedIds);
};

const handleViewModels = async (providerId: string) => {
    const modal = overlay.create(ModelModal);
    const instance = modal.open({ providerId: providerId });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const mountProviderEditModal = async (providerId: string = "") => {
    const modal = overlay.create(ProviderEdit);

    const instance = modal.open({ id: providerId });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

const handleAddProvider = () => {
    mountProviderEditModal();
};

const handleEditProvider = (provider: AiProviderInfo) => {
    mountProviderEditModal(provider.id);
};

const handleToggleProviderActive = async (providerId: string, isActive: boolean) => {
    try {
        await apiToggleAiProviderActive(providerId, isActive);
        toast.success(
            isActive
                ? t("ai-provider.backend.messages.enableSuccess")
                : t("ai-provider.backend.messages.disableSuccess"),
        );

        // Refresh list
        getLists();
    } catch (error) {
        console.error("Toggle provider active failed:", error);
    }
};

const isAllSelected = computed(() => {
    return (
        providers.value.length > 0 &&
        providers.value.every(
            (provider: AiProviderInfo) =>
                provider.id && selectedProviders.value.has(provider.id as string),
        )
    );
});

const isIndeterminate = computed(() => {
    const selectedCount = providers.value.filter(
        (provider: AiProviderInfo) =>
            provider.id && selectedProviders.value.has(provider.id as string),
    ).length;
    return selectedCount > 0 && selectedCount < providers.value.length;
});

const handleIsActiveChange = () => {
    if (searchIsActive.value === "all") {
        searchForm.isActive = undefined;
    } else {
        searchForm.isActive = searchIsActive.value === true;
    }
    getLists();
};

onMounted(() => getLists());
</script>

<template>
    <div class="provider-list-container pb-5">
        <!-- Search area -->
        <div class="bg-background sticky top-0 z-10 flex flex-wrap gap-4 pb-2">
            <UInput
                v-model="searchForm.keyword"
                :placeholder="t('ai-provider.backend.search.placeholder')"
                @change="getLists"
            />

            <USelect
                v-model="searchIsActive"
                :items="[
                    { label: t('ai-provider.backend.search.all'), value: 'all' },
                    { label: t('console-common.show'), value: true },
                    { label: t('console-common.hide'), value: false },
                ]"
                label-key="label"
                value-key="value"
                :placeholder="t('ai-provider.backend.search.status')"
                @change="handleIsActiveChange"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <!-- Select all control -->
                <div class="flex items-center gap-2">
                    <UCheckbox
                        :model-value="
                            isAllSelected ? true : isIndeterminate ? 'indeterminate' : false
                        "
                        @update:model-value="handleSelectAll"
                    />
                    <span class="text-accent-foreground text-sm dark:text-gray-400">
                        {{ selectedProviders.size }} / {{ providers.length }}
                        {{ t("console-common.selected") }}
                    </span>
                </div>

                <AccessControl :codes="['ai-providers:delete']">
                    <UButton
                        color="error"
                        variant="subtle"
                        :label="t('console-common.batchDelete')"
                        icon="i-heroicons-trash"
                        :disabled="selectedProviders.size === 0"
                        @click="handleBatchDelete"
                    >
                        <template #trailing>
                            <UKbd>{{ selectedProviders.size }}</UKbd>
                        </template>
                    </UButton>
                </AccessControl>

                <AccessControl :codes="['ai-providers:create']">
                    <UButton icon="i-heroicons-plus" color="primary" @click="handleAddProvider">
                        {{ t("ai-provider.backend.addTitle") }}
                    </UButton>
                </AccessControl>
            </div>
        </div>

        <!-- Card grid -->
        <template v-if="!loading && providers.length > 0">
            <BdScrollArea class="h-[calc(100vh-12rem)]" :shadow="false">
                <div
                    class="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                >
                    <ProviderCard
                        v-for="provider in providers"
                        :key="provider.id"
                        :provider="provider"
                        :selected="selectedProviders.has(provider.id as string)"
                        @select="handleProviderSelect"
                        @delete="handleDeleteProvider"
                        @edit="handleEditProvider"
                        @view-models="handleViewModels"
                        @toggle-active="handleToggleProviderActive"
                    />
                </div>
            </BdScrollArea>
        </template>

        <!-- Loading state -->
        <div v-else-if="loading" class="flex h-[calc(100vh-13rem)] items-center justify-center">
            <div class="flex items-center gap-3">
                <UIcon name="i-lucide-loader-2" class="text-primary-500 h-6 w-6 animate-spin" />
                <span class="text-accent-foreground">{{ $t("common.loading") }}</span>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="flex h-[calc(100vh-13rem)] flex-col items-center justify-center">
            <UIcon name="i-lucide-building" class="text-muted-foreground mb-4 h-16 w-16" />
            <h3 class="text-secondary-foreground mb-2 text-lg font-medium">
                {{ t("ai-provider.backend.empty.noProviders") }}
            </h3>
            <p class="text-accent-foreground">
                {{ t("ai-provider.backend.empty.noProvidersDescription") }}
            </p>
            <UButton
                class="mt-4"
                icon="i-heroicons-plus"
                color="primary"
                @click="handleAddProvider"
            >
                {{ t("ai-provider.backend.empty.addFirstProvider") }}
            </UButton>
        </div>

        <!-- Bottom statistics -->
        <div
            v-if="providers.length > 0"
            class="bg-background sticky bottom-0 z-10 flex items-center justify-between gap-3 py-4"
        >
            <div class="text-muted text-sm">
                {{ selectedProviders.size }} {{ $t("console-common.selected") }}
            </div>

            <div class="text-muted text-sm">
                {{ t("ai-provider.backend.stats.totalProviders", { count: providers.length }) }}
            </div>
        </div>
    </div>
</template>
