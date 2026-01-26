<script setup lang="ts">
import {
    apiGetStorageConfigDetail,
    apiUpdateStorageConfig,
    type StorageConfigTableData,
    StorageType,
} from "@buildingai/service/consoleapi/storage-config";
import { useStorageStore } from "@buildingai/upload";
import { boolean, object, string } from "yup";

const emit = defineEmits<{ (e: "update"): void }>();
const props = defineProps({
    data: {
        type: Object as PropType<StorageConfigTableData>,
        required: true,
    },
});

const modalOpenRef = ref(false);
const loadingRef = ref(false);

watch(modalOpenRef, (isOpen) => {
    if (isOpen) {
        updateStorageConfig();
    }
});
const updateStorageConfig = async () => {
    const storage = await apiGetStorageConfigDetail<typeof StorageType.LOCAL>(props.data.id);
    state.isActive = storage.isActive;
};

const form = useTemplateRef("form");
const schema = object({
    storageType: string().required(),
    isActive: boolean().required(),
});
const state = reactive({
    ...props.data,
    config: null,
});

async function onSubmit() {
    try {
        loadingRef.value = true;

        await apiUpdateStorageConfig(state);
        if (state.isActive) {
            useStorageStore().updateStorageType(state.storageType);
        }

        modalOpenRef.value = false;
        emit("update");
    } finally {
        loadingRef.value = false;
    }
}
</script>

<template>
    <UModal
        v-model:open="modalOpenRef"
        :title="$t('storage-config.storage.local')"
        :ui="{ footer: 'justify-end' }"
        :dismissible="loadingRef"
    >
        <UButton variant="ghost">{{ $t("storage-config.table.setting") }}</UButton>

        <template #body>
            <UForm ref="form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField
                    name="storageType"
                    :label="$t('storage-config.form.storageType.label')"
                    :ui="{ description: 'py-2' }"
                    :description="$t('storage-config.form.storageType.desc')"
                >
                    <URadioGroup
                        v-model="state.storageType"
                        :items="[{ label: $t('storage-config.storage.local'), value: 'local' }]"
                    />
                </UFormField>

                <UFormField :label="$t('storage-config.form.status')" name="isActive">
                    <USwitch v-model="state.isActive" :disabled="props.data.isActive" />
                </UFormField>
            </UForm>
        </template>

        <template #footer="{ close }">
            <UButton color="neutral" variant="outline" :disabled="loadingRef" @click="close">{{
                $t("storage-config.cancel")
            }}</UButton>
            <UButton color="primary" :loading="loadingRef" @click="() => form?.submit()">{{
                $t("storage-config.confirm")
            }}</UButton>
        </template>
        <template #description></template>
    </UModal>
</template>
