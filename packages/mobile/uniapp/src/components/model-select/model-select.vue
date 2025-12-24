<script setup lang="ts">
import type { ModelType } from "@buildingai/service/models/globals";

import type { AiModel, AiProvider } from "@/service/ai-conversation";
import { apiGetAiModel, apiGetAiProviders, apiGetDefaultAiModel } from "@/service/ai-conversation";

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        supportedModelTypes?: ModelType[];
        openLocalStorage?: boolean;
    }>(),
    {
        modelValue: "",
        supportedModelTypes: () => [],
        openLocalStorage: false,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
    (e: "change", value: AiModel | null): void;
    (e: "slide-progress", progress: number): void;
    (e: "open"): void;
    (e: "close"): void;
}>();

const show = shallowRef(false);
const loading = shallowRef(false);
const search = shallowRef("");
const providers = shallowRef<AiProvider[]>([]);
const selectedModelId = shallowRef<string>(props.modelValue || "");
const expandedProviders = ref<Record<string, boolean>>({});

const { t } = useI18n();
const modelIdCookie = useCookie<string>("modelId", { default: "" });

const allModels = computed(() => providers.value.flatMap((p) => p.models ?? []));

const filteredProviders = computed(() => {
    const query = search.value.trim().toLowerCase();
    if (!query) return providers.value;

    return providers.value
        .map((p) => ({
            ...p,
            models: p.models?.filter((m) =>
                [m.name, m.model, p.name, p.provider].some((s) => s?.toLowerCase().includes(query)),
            ),
        }))
        .filter((p) => p.models?.length);
});

const selectedModel = computed(() => {
    return allModels.value.find((m) => m.id === selectedModelId.value) || null;
});

const getInitialModelId = (): string => {
    if (props.openLocalStorage) {
        return modelIdCookie.value || "";
    }
    return props.modelValue || "";
};

const findDefaultModel = async (): Promise<string | null> => {
    try {
        const defaultModel = await apiGetDefaultAiModel();
        if (defaultModel) return defaultModel.id;
    } catch (error) {
        console.error("Failed to get default model:", error);
    }

    const defaultFromList = allModels.value.find((m) => m.isDefault) || allModels.value[0];
    return defaultFromList?.id || null;
};

const initializeSelectedModel = async () => {
    const initialId = getInitialModelId();
    if (initialId) {
        selectedModelId.value = initialId;
        emit("update:modelValue", initialId);
        return;
    }

    if (allModels.value.length > 0) {
        const defaultId = await findDefaultModel();
        if (defaultId) {
            selectedModelId.value = defaultId;
            emit("update:modelValue", defaultId);
        }
    }
};

const expandProviderForSelectedModel = () => {
    if (!selectedModel.value) return;

    const provider = providers.value.find((p) =>
        p.models?.some((m) => m.id === selectedModelId.value),
    );
    if (provider) {
        expandedProviders.value[provider.id] = true;
    }
};

const loadModels = async () => {
    if (loading.value) return;
    loading.value = true;

    try {
        providers.value = await apiGetAiProviders({
            supportedModelTypes: props.supportedModelTypes,
        });

        providers.value.forEach((provider) => {
            if (!(provider.id in expandedProviders.value)) {
                expandedProviders.value[provider.id] = false;
            }
        });

        await initializeSelectedModel();
        expandProviderForSelectedModel();
    } catch (error) {
        console.error("Failed to load models:", error);
        useToast().error("加载模型列表失败");
    } finally {
        loading.value = false;
    }
};

const emitModelChange = async () => {
    await nextTick();
    if (selectedModel.value) {
        emit("change", selectedModel.value);
        return;
    }

    if (selectedModelId.value) {
        try {
            const model = await apiGetAiModel(selectedModelId.value);
            if (model) {
                emit("change", model);
            }
        } catch (error) {
            console.error("Failed to get model:", error);
        }
    }
};

const selectModel = (model: AiModel) => {
    selectedModelId.value = model.id;
    emit("update:modelValue", model.id);
    emit("change", model);

    if (props.openLocalStorage) {
        modelIdCookie.value = model.id;
    }

    setTimeout(() => {
        show.value = false;
        search.value = "";
        emit("close");
    }, 100);
};

const toggleProvider = (providerId: string) => {
    expandedProviders.value[providerId] = !expandedProviders.value[providerId];
};

const open = () => {
    show.value = true;
    emit("open");
    if (providers.value.length === 0) {
        loadModels();
    }
};

const close = () => {
    show.value = false;
    search.value = "";
    emit("close");
};

watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue && newValue !== selectedModelId.value) {
            selectedModelId.value = newValue;
        }
    },
);

onMounted(async () => {
    if (props.openLocalStorage || props.modelValue) {
        await loadModels();
        await emitModelChange();
    }
});

defineExpose({
    open,
    close,
});
</script>

<template>
    <half-popup
        v-model="show"
        :z-index="999999"
        height="90vh"
        :close-btn="false"
        :full-screen="false"
        bg-color="var(--background)"
        @close="close"
        @open="emit('open')"
        @slide-progress="emit('slide-progress', $event)"
    >
        <view flex="~ justify-between items-center" class="relative px-3 py-4">
            <view i-lucide-arrow-left text="lg" @click="close" />
            <view position="absolute" left="50%" class="translate-x-[-50%]"> 选择AI模型 </view>
            <view class="w-8" />
        </view>

        <view class="px-3 pb-4">
            <view class="bg-background flex items-center gap-2 rounded-lg">
                <uni-easyinput
                    v-model="search"
                    placeholder="搜索模型..."
                    :styles="{
                        color: 'var(--foreground)',
                        backgroundColor: 'var(--background-soft)',
                        disableColor: 'var(--border)',
                        borderColor: 'var(--background-soft)',
                    }"
                    type="text"
                />
            </view>
        </view>

        <view class="h-full min-h-0 flex-1 overflow-hidden">
            <scroll-view class="h-full pb-8" scroll-y>
                <view v-if="loading" class="flex items-center justify-center py-8">
                    <text class="i-lucide-loader-2 text-muted-foreground animate-spin text-2xl" />
                </view>

                <view
                    v-else-if="filteredProviders.length === 0"
                    class="flex items-center justify-center py-8"
                >
                    <text class="text-muted-foreground">暂无可用模型</text>
                </view>

                <view v-else class="px-3 pb-4">
                    <view
                        v-for="provider in filteredProviders"
                        :key="provider.id"
                        class="bg-background hover:bg-background-soft mb-1 overflow-hidden rounded-lg"
                    >
                        <view
                            class="flex items-center justify-between py-2 pr-2 pl-2"
                            @click="toggleProvider(provider.id)"
                        >
                            <view class="flex items-center gap-2">
                                <text
                                    :class="[
                                        'i-lucide-chevron-right text-muted-foreground transition-transform',
                                        expandedProviders[provider.id] ? 'rotate-90' : '',
                                    ]"
                                />
                                <image
                                    v-if="provider.iconUrl"
                                    :src="provider.iconUrl"
                                    class="size-6 rounded-lg"
                                    mode="aspectFit"
                                />
                                <view
                                    v-else
                                    class="bg-muted flex size-6 items-center justify-center rounded-lg"
                                >
                                    <text class="i-lucide-brain text-muted-foreground text-sm" />
                                </view>
                                <text class="text-foreground text-sm">
                                    {{ provider.name }}
                                </text>
                            </view>

                            <text
                                class="text-foreground bg-muted rounded-sm px-2 py-0.5 text-[12px]"
                            >
                                {{ provider.models?.length || 0 }}
                                {{ t("common.unit.general.item") }}{{ t("common.ai.model") }}
                            </text>
                        </view>

                        <view v-if="expandedProviders[provider.id]" class="pl-6">
                            <view
                                v-for="(model, index) in provider.models"
                                :key="model.id"
                                :class="[
                                    'active:bg-muted/30 flex items-center justify-between px-2 py-2 transition-colors',
                                    index !== (provider.models?.length || 0) - 1
                                        ? 'border-muted/20 border-b'
                                        : '',
                                    selectedModelId === model.id ? 'bg-primary-50 rounded-lg' : '',
                                ]"
                                @click="selectModel(model)"
                            >
                                <view class="flex flex-1 flex-col gap-1.5">
                                    <text
                                        :class="[
                                            selectedModelId === model.id
                                                ? 'text-primary'
                                                : 'text-muted-foreground',
                                        ]"
                                        class="font-mono text-xs"
                                    >
                                        {{ model.model }}
                                    </text>
                                    <text
                                        v-if="model.description"
                                        class="text-muted-foreground line-clamp-2 text-xs leading-relaxed"
                                    >
                                        {{ model.description }}
                                    </text>
                                </view>

                                <text
                                    v-if="model.billingRule.power === 0"
                                    class="text-foreground bg-muted rounded-sm px-2 py-0.5 text-[12px]"
                                >
                                    {{ t("common.free") }}
                                </text>
                                <text
                                    v-else
                                    class="text-inverted flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                    :class="
                                        selectedModelId === model.id
                                            ? 'bg-primary dark:bg-primary-800'
                                            : 'bg-primary/10 text-primary'
                                    "
                                >
                                    <text>
                                        {{ model.billingRule.power }}{{ t("common.unit.points") }}
                                    </text>
                                    <text>/</text>
                                    <text>{{ model.billingRule.tokens }}Tokens</text>
                                </text>
                            </view>
                        </view>
                    </view>
                </view>
            </scroll-view>
        </view>
    </half-popup>
</template>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
