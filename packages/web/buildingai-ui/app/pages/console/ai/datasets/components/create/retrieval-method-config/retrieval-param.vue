<script lang="ts" setup>
import type { RetrievalConfig } from "@buildingai/service/consoleapi/ai-datasets";

const ModelSelect = defineAsyncComponent(() => import("@//components/model-select.vue"));

const props = defineProps<{
    modelValue: RetrievalConfig;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: RetrievalConfig];
}>();

const retrievalConfig = useVModel(props, "modelValue", emit);

// 权重自动联动：只允许调整语义权重，关键词权重自动 = 1 - 语义权重
function handleSemanticChange(val: number) {
    if (retrievalConfig.value.retrievalMode === "hybrid" && retrievalConfig.value.weightConfig) {
        let semantic = Number(val ?? 0);
        if (semantic < 0) semantic = 0;
        if (semantic > 1) semantic = 1;
        retrievalConfig.value.weightConfig.semanticWeight = semantic;
        retrievalConfig.value.weightConfig.keywordWeight = +(1 - semantic).toFixed(2);
    }
}

function handleKeywordChange(val: number) {
    if (retrievalConfig.value.retrievalMode === "hybrid" && retrievalConfig.value.weightConfig) {
        let keyword = Number(val ?? 0);
        if (keyword < 0) keyword = 0;
        if (keyword > 1) keyword = 1;
        retrievalConfig.value.weightConfig.keywordWeight = keyword;
        retrievalConfig.value.weightConfig.semanticWeight = +(1 - keyword).toFixed(2);
    }
}
</script>

<template>
    <div>
        <!-- 向量检索参数 -->
        <div v-if="retrievalConfig.retrievalMode === 'vector'" class="space-y-4">
            <USwitch
                v-model="retrievalConfig.rerankConfig!.enabled"
                :label="$t('ai-datasets.backend.retrieval.rerank')"
            />

            <!-- 重排模型选择（向量检索） -->
            <ModelSelect
                v-if="retrievalConfig.rerankConfig!.enabled"
                :modelValue="retrievalConfig.rerankConfig!.modelId"
                console
                :button-ui="{
                    variant: 'outline',
                    color: 'neutral',
                    ui: { base: 'w-full' },
                    class: 'bg-background',
                }"
                :supportedModelTypes="['rerank']"
                :defaultSelected="false"
                capability="chat"
                placeholder="选择重排模型"
                @change="(e) => (retrievalConfig.rerankConfig!.modelId = e?.id ?? '')"
            />

            <div class="grid grid-cols-2 gap-4">
                <UFormField label="Top K">
                    <BdSlider
                        v-model.number="retrievalConfig.topK"
                        type="number"
                        :max="10"
                        :step="1"
                        :min="1"
                        :placeholder="$t('ai-datasets.backend.retrieval.topKPlaceholder')"
                    />
                </UFormField>
                <UFormField label="">
                    <template #label>
                        <UTooltip
                            :text="$t('ai-datasets.backend.retrieval.scoreThreshold')"
                            :delay-duration="0"
                        >
                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-1">
                                    <span>{{
                                        $t("ai-datasets.backend.retrieval.scoreThreshold")
                                    }}</span>
                                    <UIcon name="i-lucide-circle-help" class="size-4" />
                                </div>
                                <USwitch v-model="retrievalConfig.scoreThresholdEnabled" />
                            </div>
                        </UTooltip>
                    </template>
                    <BdSlider
                        v-model.number="retrievalConfig.scoreThreshold"
                        type="number"
                        :step="0.1"
                        :max="1"
                        :min="0"
                        :disabled="!retrievalConfig.scoreThresholdEnabled"
                        :placeholder="$t('ai-datasets.backend.retrieval.scoreThresholdPlaceholder')"
                    />
                </UFormField>
            </div>
        </div>
        <!-- 全文检索参数 -->
        <div v-if="retrievalConfig.retrievalMode === 'fullText'" class="space-y-4">
            <USwitch
                v-model="retrievalConfig.rerankConfig!.enabled"
                :label="$t('ai-datasets.backend.retrieval.rerank')"
            />

            <!-- 重排模型选择（全文检索） -->
            <ModelSelect
                v-if="retrievalConfig.rerankConfig!.enabled"
                :modelValue="retrievalConfig.rerankConfig!.modelId"
                console
                :button-ui="{
                    variant: 'outline',
                    color: 'neutral',
                    ui: { base: 'w-full' },
                    class: 'bg-background',
                }"
                :supportedModelTypes="['rerank']"
                :defaultSelected="false"
                capability="chat"
                placeholder="选择重排模型"
                @change="(e) => (retrievalConfig.rerankConfig!.modelId = e?.id ?? '')"
            />

            <div class="grid grid-cols-2 gap-4">
                <UFormField label="Top K">
                    <BdSlider
                        v-model.number="retrievalConfig.topK"
                        type="number"
                        :placeholder="$t('ai-datasets.backend.retrieval.topKPlaceholder')"
                        :max="10"
                        :step="1"
                        :min="1"
                    />
                </UFormField>
                <UFormField label="" v-if="retrievalConfig.rerankConfig!.enabled">
                    <template #label>
                        <UTooltip
                            :text="$t('ai-datasets.backend.retrieval.scoreThreshold')"
                            :delay-duration="0"
                        >
                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-1">
                                    <span>{{
                                        $t("ai-datasets.backend.retrieval.scoreThreshold")
                                    }}</span>
                                    <UIcon name="i-lucide-circle-help" class="size-4" />
                                </div>
                                <USwitch v-model="retrievalConfig.scoreThresholdEnabled" />
                            </div>
                        </UTooltip>
                    </template>
                    <BdSlider
                        v-model.number="retrievalConfig.scoreThreshold"
                        type="number"
                        :step="0.1"
                        :max="1"
                        :min="0"
                        :disabled="!retrievalConfig.scoreThresholdEnabled"
                        :placeholder="$t('ai-datasets.backend.retrieval.scoreThresholdPlaceholder')"
                    />
                </UFormField>
            </div>
        </div>
        <!-- 混合检索参数 -->
        <div v-if="retrievalConfig.retrievalMode === 'hybrid'" class="space-y-4">
            <!-- 策略选择 -->
            <div class="flex gap-2">
                <UButton
                    :variant="retrievalConfig.strategy === 'weighted_score' ? 'solid' : 'outline'"
                    size="sm"
                    @click="retrievalConfig.strategy = 'weighted_score'"
                >
                    <UIcon name="i-heroicons-scale" class="mr-1 h-4 w-4" />
                    {{ $t("ai-datasets.backend.retrieval.weightSetting") }}
                </UButton>
                <UButton
                    :variant="retrievalConfig.strategy === 'rerank' ? 'solid' : 'outline'"
                    size="sm"
                    @click="
                        retrievalConfig.strategy = 'rerank';
                        retrievalConfig.rerankConfig!.enabled = true;
                    "
                >
                    <UIcon name="i-heroicons-cpu-chip" class="mr-1 h-4 w-4" />
                    {{ $t("ai-datasets.backend.retrieval.rerank") }}
                </UButton>
            </div>
            <!-- 权重设置 -->
            <div v-if="retrievalConfig.strategy === 'weighted_score'" class="space-y-4">
                <p class="text-muted-foreground text-sm">
                    {{ $t("ai-datasets.backend.retrieval.weightSettingDesc") }}
                </p>
                <div class="grid grid-cols-2 gap-4">
                    <UFormField :label="$t('ai-datasets.backend.retrieval.semantic')">
                        <BdSlider
                            v-model.number="retrievalConfig.weightConfig!.semanticWeight"
                            type="number"
                            :min="0"
                            :max="1"
                            :step="0.1"
                            placeholder="0.5"
                            @update:modelValue="handleSemanticChange"
                        />
                    </UFormField>
                    <UFormField :label="$t('ai-datasets.backend.retrieval.keyword')">
                        <BdSlider
                            v-model.number="retrievalConfig.weightConfig!.keywordWeight"
                            type="number"
                            :min="0"
                            :max="1"
                            :step="0.1"
                            placeholder="0.3"
                            @update:modelValue="handleKeywordChange"
                        />
                    </UFormField>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <UFormField label="Top K">
                        <BdSlider
                            v-model.number="retrievalConfig.topK"
                            type="number"
                            :min="1"
                            :max="10"
                            :step="1"
                            placeholder="3"
                        />
                    </UFormField>
                    <UFormField label="">
                        <template #label>
                            <UTooltip
                                :text="$t('ai-datasets.backend.retrieval.scoreThreshold')"
                                :delay-duration="0"
                            >
                                <div class="flex items-center gap-2">
                                    <div class="flex items-center gap-1">
                                        <span>{{
                                            $t("ai-datasets.backend.retrieval.scoreThreshold")
                                        }}</span>
                                        <UIcon name="i-lucide-circle-help" class="size-4" />
                                    </div>
                                    <USwitch v-model="retrievalConfig.scoreThresholdEnabled" />
                                </div>
                            </UTooltip>
                        </template>
                        <BdSlider
                            v-model.number="retrievalConfig.scoreThreshold"
                            type="number"
                            :step="0.1"
                            :max="1"
                            :min="0"
                            :disabled="!retrievalConfig.scoreThresholdEnabled"
                            :placeholder="
                                $t('ai-datasets.backend.retrieval.scoreThresholdPlaceholder')
                            "
                        />
                    </UFormField>
                </div>
            </div>
            <!-- Rerank 设置 -->
            <div v-if="retrievalConfig.strategy === 'rerank'" class="space-y-4">
                <p class="text-muted-foreground text-sm">
                    {{ $t("ai-datasets.backend.retrieval.rerankDesc") }}
                </p>

                <!-- 重排模型选择（混合检索 - Rerank 策略） -->
                <ModelSelect
                    v-if="retrievalConfig.strategy === 'rerank'"
                    :modelValue="retrievalConfig.rerankConfig!.modelId"
                    console
                    :button-ui="{
                        variant: 'outline',
                        color: 'neutral',
                        ui: { base: 'w-full' },
                        class: 'bg-background',
                    }"
                    :supportedModelTypes="['rerank']"
                    :defaultSelected="false"
                    capability="chat"
                    placeholder="选择重排模型"
                    @change="(e) => (retrievalConfig.rerankConfig!.modelId = e?.id ?? '')"
                />

                <div class="grid grid-cols-2 gap-4">
                    <UFormField label="Top K">
                        <BdSlider
                            v-model.number="retrievalConfig.topK"
                            type="number"
                            :min="1"
                            :step="1"
                            :max="10"
                            placeholder="3"
                        />
                    </UFormField>
                    <UFormField label="">
                        <template #label>
                            <UTooltip text="Score阈值" :delay-duration="0">
                                <div class="flex items-center gap-2">
                                    <div class="flex items-center gap-1">
                                        <span>{{
                                            $t("ai-datasets.backend.retrieval.scoreThreshold")
                                        }}</span>
                                        <UIcon name="i-lucide-circle-help" class="size-4" />
                                    </div>
                                    <USwitch v-model="retrievalConfig.scoreThresholdEnabled" />
                                </div>
                            </UTooltip>
                        </template>
                        <BdSlider
                            v-model.number="retrievalConfig.scoreThreshold"
                            type="number"
                            :step="0.1"
                            :max="1"
                            :min="0"
                            :disabled="!retrievalConfig.scoreThresholdEnabled"
                            :placeholder="
                                $t('ai-datasets.backend.retrieval.scoreThresholdPlaceholder')
                            "
                        />
                    </UFormField>
                </div>
            </div>
        </div>
    </div>
</template>
