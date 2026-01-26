<script setup lang="ts">
import { apiBatchImportAgentDsl, apiImportAgentDsl } from "@buildingai/service/consoleapi/ai-agent";
import { uploadRemoteFileAdaptive } from "@buildingai/upload";

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const toast = useMessage();

const activeTab = shallowRef("file");
const dslFileURL = shallowRef<string[]>([]);
const url = shallowRef("");

const { t } = useI18n();

const { lockFn: submitImport, isLock } = useLockFn(async () => {
    if (activeTab.value === "file" && (!dslFileURL.value || dslFileURL.value.length === 0)) {
        toast.error(t("ai-agent.backend.dslImport.errors.fileRequired"));
        return;
    }

    if (activeTab.value === "url" && !url.value) {
        toast.error(t("ai-agent.backend.dslImport.errors.urlRequired"));

        return;
    } else if (activeTab.value === "url" && url.value) {
        const result = await uploadRemoteFileAdaptive({
            url: url.value,
            description: `Remote file: ${url.value}`,
        });

        url.value = result.url;
    }

    try {
        if (activeTab.value === "file") {
            // 批量导入多个文件 - 由后端处理
            const result = await apiBatchImportAgentDsl({
                contents: dslFileURL.value,
                format: "yaml",
            });

            if (result.success > 0) {
                if (result.failed > 0) {
                    toast.warning(
                        t("ai-agent.backend.dslImport.partialSuccess", {
                            success: result.success,
                            total: result.total,
                        }),
                    );
                } else {
                    toast.success(
                        t("ai-agent.backend.dslImport.batchSuccess", {
                            count: result.success,
                        }),
                    );
                }
            } else {
                return;
            }
        } else {
            // URL 导入单个文件
            await apiImportAgentDsl({
                content: url.value,
                format: "yaml",
            });

            toast.success(t("ai-agent.backend.dslImport.success"));
        }

        emits("close", true);
    } catch (error) {
        console.error("DSL import error:", error);
    }
});

const removeFile = (index: number) => {
    dslFileURL.value = dslFileURL.value.filter((_, i) => i !== index);
};
</script>

<template>
    <BdModal
        :title="$t('ai-agent.backend.dslImport.title')"
        :description="$t('ai-agent.backend.dslImport.description')"
        :ui="{ content: 'max-w-lg' }"
        @close="emits('close', false)"
    >
        <UTabs
            v-model="activeTab"
            size="md"
            variant="link"
            :content="false"
            :items="[
                { label: $t('ai-agent.backend.dslImport.tabs.file'), value: 'file' },
                { label: $t('ai-agent.backend.dslImport.tabs.url'), value: 'url' },
            ]"
            :ui="{ trigger: 'px-0! mr-5!' }"
            class="w-auto"
        />
        <div class="py-10">
            <BdUploader
                v-if="activeTab === 'file'"
                v-model="dslFileURL"
                accept=".yaml,.yml"
                :multiple="true"
                :single="false"
                icon="i-lucide-cloud-upload"
                :showPreviewButton="false"
                addButtonClassName="flex-row"
                class="bg-muted h-14 w-full border-none! shadow-none! ring-0!"
            >
                <template #file-item="{ item, index }">
                    <div
                        class="hover:bg-accent border-muted group flex h-full w-full items-center gap-2 rounded-md border"
                    >
                        <div class="ml-4 flex size-8 flex-none items-center justify-center gap-2">
                            <UIcon name="bd:yml" class="text-muted-foreground size-6 flex-none" />
                        </div>
                        <div class="flex w-full flex-col justify-center truncate pr-4">
                            <p class="truncate text-sm font-medium">
                                {{ item.name }}
                            </p>
                            <p class="text-muted-foreground text-xs">
                                {{ item.extension?.toUpperCase() }}
                            </p>
                        </div>

                        <div class="absolute right-4 hidden group-hover:block">
                            <UButton
                                color="error"
                                variant="soft"
                                size="sm"
                                icon="i-lucide-trash"
                                @click="removeFile(index)"
                            >
                            </UButton>
                        </div>
                    </div>
                </template>
            </BdUploader>

            <UFormField
                v-if="activeTab === 'url'"
                :label="$t('ai-agent.backend.dslImport.form.urlLabel')"
                name="url"
            >
                <UInput
                    v-model="url"
                    :ui="{ root: 'w-full' }"
                    variant="soft"
                    size="lg"
                    :placeholder="$t('ai-agent.backend.dslImport.form.urlPlaceholder')"
                />
            </UFormField>
        </div>

        <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="soft" size="lg" @click="emits('close', false)">
                {{ $t("console-common.cancel") }}
            </UButton>
            <UButton color="primary" size="lg" :loading="isLock" @click="submitImport">
                {{ $t("console-common.create") }}
            </UButton>
        </div>
    </BdModal>
</template>
