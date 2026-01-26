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

const UIcon = resolveComponent("UIcon");
const UPopover = resolveComponent("UPopover");

const columns = [
    { accessorKey: "name", header: t("ai-provider.backend.model.batchEdit.name") },
    { accessorKey: "modelType", header: t("ai-provider.backend.model.form.modelType") },
    { accessorKey: "billingRule", header: t("ai-provider.backend.model.batchEdit.billingRule") },
    {
        accessorKey: "membershipLevel",
        header: () =>
            h("div", { class: "flex items-center gap-1" }, [
                h("span", t("ai-provider.backend.model.batchEdit.membershipLevel")),
                h(
                    UPopover,
                    { mode: "hover" },
                    {
                        default: () =>
                            h(UIcon, {
                                name: "i-lucide-circle-help",
                                class: "size-4 cursor-pointer text-muted-foreground",
                            }),
                        content: () =>
                            h(
                                "p",
                                { class: "text-sm py-2 px-4 w-64" },
                                t("ai-provider.backend.model.batchEdit.membershipLevelTip"),
                            ),
                    },
                ),
            ]),
    },
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
            membershipLevel: model.membershipLevel,
        }));

        await apiBatchUpdateAiModel(updateData);
        toast.success("设置成功");
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
                <div class="flex flex-row items-center gap-4">
                    <h3 class="text-lg font-semibold">
                        {{ t("ai-provider.backend.model.batchEdit.dialogTitle") }}
                    </h3>
                    <p class="text-muted-foreground text-sm">
                        {{ t("ai-provider.backend.model.batchEdit.dialogDescription") }}
                    </p>
                </div>
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
                    th: 'py-2 whitespace-nowrap first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r [&:nth-child(4)]:min-w-22',
                    td: 'border-b border-default cursor-pointer [&:nth-child(4)]:min-w-22',
                    tr: '[&:has(>td[colspan])]:hidden',
                }"
            >
                <template #billingRule-cell="{ row }">
                    <div class="flex w-full items-center gap-2">
                        <UFormField :name="`rows.${row.index}.billingRule.power`" class="flex-1">
                            <UInput
                                v-model.number="row.original.billingRule.power"
                                type="number"
                                placeholder=""
                                :min="0"
                                :ui="{ base: 'pr-32' }"
                                @blur="
                                    if (row.original.billingRule.power < 0)
                                        row.original.billingRule.power = 0;
                                "
                                class="w-68"
                            >
                                <template #trailing>
                                    <span class="text-muted-foreground text-sm">
                                        {{ t("ai-provider.backend.model.form.power") }}/ 1K Tokens
                                    </span>
                                </template>
                            </UInput>
                        </UFormField>
                    </div>
                </template>
                <template #membershipLevel-cell="{ row }">
                    <div class="flex w-full items-center gap-2">
                        <UFormField :name="`rows.${row.index}.membershipLevel`" class="flex-1">
                            <MembershipLevelSelect
                                v-model="row.original.membershipLevel"
                                :multiple="true"
                                :placeholder="
                                    t('ai-provider.backend.model.batchEdit.membershipLevelAll')
                                "
                                :button-ui="{
                                    variant: 'outline',
                                    class: 'w-full',
                                }"
                            />
                        </UFormField>
                    </div>
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
