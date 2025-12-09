<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { boolean, object, string } from "yup";

const props = defineProps({
    isActive: {
        type: Boolean,
        required: true,
    },
});

const form = useTemplateRef("form");
const schema = object({
    storageType: string().required(),
    isActive: boolean().required(),
});
const state = reactive({
    storageType: "local",
    isActive: props.isActive,
});

const toast = useToast();
function onSubmit(event: FormSubmitEvent<typeof state>) {
    toast.add({ title: "Success", description: "The form has been submitted.", color: "success" });
    console.log(event.data);
}
</script>

<template>
    <UModal :title="$t('storage-config.storage.local')" :ui="{ footer: 'justify-end' }">
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
                    <USwitch v-model="state.isActive" :disabled="state.isActive" />
                </UFormField>
            </UForm>
        </template>

        <template #footer="{ close }">
            <UButton color="neutral" variant="outline" @click="close">{{
                $t("storage-config.cancel")
            }}</UButton>
            <UButton color="primary" @click="() => form?.submit()">{{
                $t("storage-config.confirm")
            }}</UButton>
        </template>
        <template #description></template>
    </UModal>
</template>
