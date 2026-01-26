<script setup lang="ts">
import { apiBatchUpdateAiModel } from "@buildingai/service/consoleapi/ai-model";
import type { AiModelInfo } from "@buildingai/service/consoleapi/ai-provider";

const props = defineProps<{
    models: Set<AiModelInfo>;
    provider?: {
        id?: string;
        name?: string;
        iconUrl?: string;
    };
}>();

const emits = defineEmits<{
    (e: "close", v?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const columns = [
    { accessorKey: "name", header: t("ai-provider.backend.model.batchEdit.name") },
    { accessorKey: "model", header: t("ai-provider.backend.model.batchEdit.model") },
    { accessorKey: "maxContext", header: t("ai-provider.backend.model.batchEdit.maxContext") },
    { accessorKey: "isActive", header: t("ai-provider.backend.model.batchEdit.isActive") },
];

const models = computed(() => {
    if (props.models.size === 0) return [];
    return JSON.parse(JSON.stringify([...props.models])) as AiModelInfo[];
});

const { lockFn: handleSubmit, isLock } = useLockFn(async () => {
    try {
        const updateData = models.value.map((model) => ({
            id: model.id,
            name: model.name,
            model: model.model,
            maxContext: model.maxContext,
            isActive: model.isActive,
            billingRule: model.billingRule,
        }));

        await apiBatchUpdateAiModel(updateData);
        toast.success(t("console-common.batchEditSuccess"));
        emits("close", true);
    } catch (error) {
        console.error("批量编辑失败:", error);
    }
});
</script>
<template>
    <BdModal
        :ui="{
            content: 'max-w-4xl overflow-y-auto h-fit',
        }"
        @close="emits('close', false)"
    >
        <template #title>
            <div>
                <h3 class="text-lg font-semibold">
                    {{ t("ai-provider.backend.model.batchEditTitle") }}
                </h3>
                <div class="text-muted-foreground flex items-center gap-2 text-sm">
                    <div v-if="provider?.iconUrl" class="flex-none">
                        <NuxtImg
                            :src="provider.iconUrl"
                            :alt="provider.name"
                            class="h-4 w-4 rounded object-cover"
                        />
                    </div>
                    <div v-else class="flex-none">
                        <UIcon name="i-lucide-building-office" class="h-4 w-4" />
                    </div>
                    <span>{{ provider?.name }}</span>
                </div>
            </div>
        </template>
        <UForm :state="models" @submit="handleSubmit">
            <UTable
                :columns="columns"
                :data="models"
                sticky
                class="h-120"
                :ui="{
                    base: 'table-fixed border-separate border-spacing-0',
                    thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                    tbody: '[&>tr]:last:[&>td]:border-b-0',
                    th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r [&:nth-child(4)]:min-w-22',
                    td: 'border-b border-default cursor-pointer [&:nth-child(4)]:min-w-22',
                    tr: '[&:has(>td[colspan])]:hidden',
                }"
            >
                <template #name-cell="{ row }">
                    <UFormField :name="`rows.${row.index}.name`">
                        <UInput v-model="row.original.name" />
                    </UFormField>
                </template>
                <template #model-cell="{ row }">
                    <UFormField :name="`rows.${row.index}.model`">
                        <UInput v-model="row.original.model" />
                    </UFormField>
                </template>
                <template #maxContext-cell="{ row }">
                    <UFormField :name="`rows.${row.index}.maxContext`">
                        <UInput
                            v-model="row.original.maxContext"
                            :ui="{ base: 'w-18' }"
                            type="number"
                        />
                    </UFormField>
                </template>
                <template #isActive-cell="{ row }">
                    <UFormField :name="`rows.${row.index}.isActive`">
                        <USwitch v-model="row.original.isActive" />
                    </UFormField>
                </template>
            </UTable>
            <div class="flex w-full justify-end gap-2 pt-3.5">
                <UButton color="neutral" variant="soft" @click="emits('close', false)">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" type="submit" :loading="isLock">
                    {{ t("console-common.save") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
