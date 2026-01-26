<script setup lang="ts">
import type {
    Dataset,
    RetrievalConfig,
    UpdateDatasetParams,
} from "@buildingai/service/consoleapi/ai-datasets";
import { apiUpdateDataset } from "@buildingai/service/consoleapi/ai-datasets";
import { refreshNuxtData } from "nuxt/app";

const RetrievalMethodConfig = defineAsyncComponent(
    () => import("../components/create/retrieval-method-config/index.vue"),
);

const { params: URLQueryParams } = useRoute();
const toast = useMessage();
const { t } = useI18n();
const datasetId = computed(() => (URLQueryParams as Record<string, string>).id);

const datasets = inject<Dataset>("datasets");

const formData = reactive<UpdateDatasetParams>({
    name: "",
    description: "",
    retrievalConfig: {
        retrievalMode: "hybrid",
        strategy: "weighted_score",
        topK: 3,
        scoreThreshold: 0.5,
        scoreThresholdEnabled: false,
        weightConfig: {
            semanticWeight: 0.5,
            keywordWeight: 0.5,
        },
        rerankConfig: {
            enabled: false,
            modelId: "",
        },
    },
    embeddingModelId: "",
});

const { lockFn: handleSubmit, isLock } = useLockFn(async () => {
    try {
        await apiUpdateDataset(datasetId.value as string, formData);
        refreshNuxtData(`dataset-detail-${datasetId.value}`);
        toast.success(`${t("console-common.messages.saveSuccess")}`);
    } catch (error) {
        console.error(error);
    }
});

onMounted(() => {
    (Reflect.ownKeys(formData) as Array<keyof UpdateDatasetParams>).forEach((key) => {
        if (unref(datasets) && Object.prototype.hasOwnProperty.call(unref(datasets), key)) {
            const value =
                JSON.parse(JSON.stringify(unref(datasets)?.[key] as never)) ?? formData[key];
            formData[key] = value;
        }
    });
});

definePageMeta({ layout: "full-screen" });
</script>

<template>
    <div class="h-full w-full overflow-auto">
        <div class="inline-block px-6 py-4">
            <div class="mb-8">
                <h5 class="text-foreground mb-1 text-lg font-medium">
                    {{ $t("ai-datasets.backend.settings.name") }}
                </h5>
                <p class="text-muted text-sm">
                    {{ $t("ai-datasets.backend.settings.description") }}
                </p>
            </div>

            <div class="space-y-8">
                <div class="flex flex-col space-y-8">
                    <UFormField
                        :label="$t('ai-datasets.backend.common.name')"
                        class="flex w-full justify-between"
                        :ui="{
                            wrapper: 'flex',
                            label: 'text-accent-foreground font-medium width180',
                            container: 'flex-1',
                        }"
                        required
                    >
                        <UInput
                            v-model="formData.name"
                            :placeholder="$t('ai-datasets.backend.settings.nameInput')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>

                    <UFormField
                        class="flex w-full justify-between"
                        :ui="{
                            wrapper: 'flex  ',
                            labelWrapper: 'items-stretch ',
                            label: 'text-accent-foreground width180 pt-2',
                            container: 'flex-1',
                        }"
                        :label="$t('ai-datasets.backend.common.description')"
                        required
                    >
                        <UTextarea
                            v-model="formData.description"
                            :placeholder="$t('ai-datasets.backend.settings.descriptionInput')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                </div>

                <UFormField
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex  ',
                        labelWrapper: 'items-stretch ',
                        label: 'text-accent-foreground width180 pt-2',
                        container: 'flex-1',
                    }"
                    :label="$t('ai-datasets.backend.create.stepTwo.embeddingModel')"
                    required
                >
                    <div class="space-y-3">
                        <ModelSelect
                            :modelValue="formData.embeddingModelId"
                            console
                            :button-ui="{
                                variant: 'outline',
                                color: 'neutral',
                                ui: { base: 'w-full' },
                                class: 'bg-background',
                            }"
                            :supportedModelTypes="['text-embedding']"
                            :defaultSelected="false"
                            capability="chat"
                            placeholder="选择嵌入模型"
                            @change="(e) => (formData.embeddingModelId = e?.id ?? '')"
                        />
                        <UAlert
                            color="warning"
                            variant="soft"
                            :title="$t('ai-datasets.backend.settings.embeddingModelWarning.title')"
                            :description="
                                $t('ai-datasets.backend.settings.embeddingModelWarning.description')
                            "
                            :icon="'i-lucide-alert-triangle'"
                        />
                    </div>
                </UFormField>

                <USeparator />

                <UFormField
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex  ',
                        labelWrapper: 'items-stretch ',
                        label: 'text-accent-foreground width180 pt-2',
                        container: 'flex-1',
                    }"
                    :label="$t('ai-datasets.backend.settings.retrievalMethod')"
                    required
                >
                    <RetrievalMethodConfig
                        v-model="formData.retrievalConfig as unknown as RetrievalConfig"
                    />
                </UFormField>

                <USeparator />

                <UFormField
                    label=" "
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex  ',
                        labelWrapper: 'items-stretch ',
                        label: 'text-accent-foreground width180 pt-2',
                        container: 'flex-1 flex gap-4 items-center',
                    }"
                >
                    <UButton
                        trailing-icon="i-lucide-arrow-right"
                        :label="$t('console-common.save')"
                        size="lg"
                        :loading="isLock"
                        @click="handleSubmit"
                    />
                </UFormField>
            </div>
        </div>
    </div>
</template>
