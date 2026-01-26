<script setup lang="ts">
import type { FileItem } from "@buildingai/service/models/globals";

const FilePreview = defineAsyncComponent(() => import("../file-preview/index.vue"));
const FileUploader = defineAsyncComponent(() => import("../file-uploader/index.vue"));

const emits = defineEmits<{
    (e: "update:name", v: string): void;
    (e: "update:description", v: string): void;
    (e: "update:fileIds", v: string[]): void;
    (e: "onStepChange"): void;
    (e: "createEmpty"): void;
    (e: "update:embeddingModelId", v: string): void;
}>();

const props = defineProps<{
    disabled?: boolean;
    name: string;
    description: string;
    embeddingModelId: string;
}>();

const { t } = useI18n();

const name = useVModel(props, "name", emits);
const description = useVModel(props, "description", emits);
const embeddingModelId = useVModel(props, "embeddingModelId", emits);

const fileList = shallowRef<FileItem[]>([]);

const selectedSourceId = shallowRef<string>("text");
const DATA_SOURCES = [
    {
        id: "text",
        title: t("ai-datasets.backend.create.dataSources.text.title"),
        description: t("ai-datasets.backend.create.dataSources.text.description"),
        icon: "i-heroicons-document-text",
        disabled: false,
    },
    {
        id: "chat",
        title: t("ai-datasets.backend.create.dataSources.chat.title"),
        description: t("ai-datasets.backend.create.dataSources.chat.description"),
        icon: "i-heroicons-presentation-chart-bar",
        disabled: true,
    },
    {
        id: "web",
        title: t("ai-datasets.backend.create.dataSources.web.title"),
        description: t("ai-datasets.backend.create.dataSources.web.description"),
        icon: "i-heroicons-globe-alt",
        disabled: true,
    },
] as const;

const canProceed = computed(
    () => fileList.value.length > 0 && fileList.value.every((f) => f.status === "success"),
);

const handleFileListUpdate = (files: FileItem[]) => {
    fileList.value = files;
    emits("update:fileIds", files.map((f) => f.id) as string[]);
};

const selectSource = (source: (typeof DATA_SOURCES)[number]) => {
    if (!source.disabled) selectedSourceId.value = source.id;
};
</script>

<template>
    <div class="data-source-selector mx-auto inline-block pt-6">
        <div class="mb-8" v-if="!disabled">
            <h5 class="text-foreground mb-1 text-lg font-medium">
                {{ $t("ai-datasets.backend.create.basicInfo") }}
            </h5>
            <p class="text-muted text-sm">
                {{ $t("ai-datasets.backend.create.basicInfoDesc") }}
            </p>
        </div>

        <div class="space-y-8">
            <div class="flex flex-col space-y-8" v-if="!disabled">
                <UFormField
                    :label="$t('ai-datasets.backend.create.name')"
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex',
                        label: 'text-accent-foreground font-medium width140',
                        container: 'flex-1',
                    }"
                    required
                >
                    <UInput
                        v-model="name"
                        :placeholder="$t('ai-datasets.backend.settings.nameInput')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex  ',
                        labelWrapper: 'items-stretch ',
                        label: 'text-accent-foreground width140 pt-2',
                        container: 'flex-1',
                    }"
                    :label="$t('ai-datasets.backend.create.description')"
                    required
                >
                    <UTextarea
                        v-model="description"
                        :placeholder="$t('ai-datasets.backend.settings.descriptionInput')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <!-- Embedding 模型 -->
                <UFormField
                    class="flex w-full justify-between"
                    :ui="{
                        wrapper: 'flex  ',
                        labelWrapper: 'items-stretch ',
                        label: 'text-accent-foreground width140 pt-2',
                        container: 'flex-1',
                    }"
                    :label="$t('ai-datasets.backend.create.stepTwo.embeddingModel')"
                    required
                >
                    <ModelSelect
                        :model-value="embeddingModelId"
                        console
                        :button-ui="{
                            variant: 'outline',
                            color: 'neutral',
                            ui: { base: 'w-full' },
                            class: 'bg-background',
                        }"
                        :defaultSelected="false"
                        capability="chat"
                        :supportedModelTypes="['text-embedding']"
                        placeholder="选择嵌入模型"
                        :disabled="disabled"
                        @change="(e) => (embeddingModelId = e?.id ?? '')"
                    />
                </UFormField>
            </div>

            <div class="mb-8">
                <h5 class="text-foreground mb-1 text-lg font-medium">
                    {{ $t("ai-datasets.backend.create.selectDataSource") }}
                </h5>
                <p class="text-muted text-sm">
                    {{ $t("ai-datasets.backend.create.selectDataSourceDesc") }}
                </p>
            </div>

            <UFormField
                :label="$t('ai-datasets.backend.create.selectDataSource')"
                class="flex w-full justify-between"
                :ui="{
                    wrapper: 'flex  ',
                    labelWrapper: 'items-stretch ',
                    label: 'text-accent-foreground width140 pt-2',
                    container: 'flex-1',
                }"
                required
            >
                <div class="flex gap-4">
                    <div
                        v-for="source in DATA_SOURCES"
                        :key="source.id"
                        class="relative cursor-pointer rounded-lg border transition-all duration-200"
                        :class="[
                            selectedSourceId === source.id
                                ? 'border-primary'
                                : 'border-default hover:border-primary border-dashed',
                            source.disabled ? 'cursor-not-allowed!' : 'hover:shadow-md',
                        ]"
                        @click="selectSource(source)"
                    >
                        <div class="relative flex items-stretch space-x-3 p-4">
                            <div class="flex-none">
                                <div
                                    class="border-default flex size-8 items-center justify-center rounded-sm border border-dashed"
                                    :class="{ 'border-solid!': selectedSourceId === source.id }"
                                >
                                    <UIcon :name="source.icon" class="size-4" />
                                </div>
                            </div>
                            <div>
                                <h5 class="text-foreground text-sm leading-none">
                                    {{ source.title }}
                                </h5>
                                <p class="text-muted mt-1 w-30 text-xs">
                                    {{ source.description }}
                                </p>
                            </div>
                        </div>
                        <div class="absolute top-[-6px] right-0">
                            <UBadge variant="soft" size="sm" v-if="source.disabled">
                                {{ $t("ai-datasets.backend.create.comingSoon") }}
                            </UBadge>
                        </div>
                    </div>
                </div>
            </UFormField>

            <UFormField
                :label="$t('ai-datasets.backend.create.uploadTextFile')"
                class="flex w-full justify-between"
                :ui="{
                    wrapper: 'flex  ',
                    labelWrapper: 'items-stretch ',
                    label: 'text-accent-foreground width140 pt-2',
                    container: 'flex-1',
                }"
                required
            >
                <FileUploader :file-list="fileList" @update:fileList="handleFileListUpdate" />
            </UFormField>
            <UFormField
                v-if="fileList.length"
                :label="$t('ai-datasets.backend.create.fileList')"
                class="flex w-full justify-between"
                :ui="{
                    wrapper: 'flex  ',
                    labelWrapper: 'items-stretch ',
                    label: 'text-accent-foreground width140 pt-2',
                    container: 'flex-1',
                }"
                required
            >
                <FilePreview :file-list="fileList" @update:fileList="handleFileListUpdate" />
            </UFormField>

            <UFormField
                label=" "
                class="flex w-full justify-between pb-8"
                :ui="{
                    wrapper: 'flex  ',
                    labelWrapper: 'items-stretch ',
                    label: 'text-accent-foreground width140 pt-2',
                    container: 'flex-1 flex gap-4 items-center',
                }"
            >
                <UButton
                    trailing-icon="i-lucide-arrow-right"
                    :label="$t('ai-datasets.backend.create.nextStep')"
                    :disabled="!canProceed"
                    size="lg"
                    @click="emits('onStepChange')"
                />

                <UButton
                    v-if="!disabled"
                    leading-icon="i-lucide-folder"
                    color="primary"
                    variant="link"
                    size="lg"
                    @click="emits('createEmpty')"
                >
                    {{ $t("ai-datasets.backend.create.createEmpty") }}
                </UButton>
            </UFormField>

            <template>
                <USeparator />
            </template>
        </div>
    </div>
</template>
