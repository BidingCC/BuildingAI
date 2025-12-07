<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { boolean, type InferType, object, string } from "yup";

const { t } = useI18n();
const form = useTemplateRef("form");
const schema = object({
    storageType: string().required(),
    isActive: boolean().required(),
    spaceName: string().required(t("oss-config.form.spaceName.placeholder")),
    accessKey: string().required(t("oss-config.form.accessKey.placeholder")),
    secretKey: string().required(t("oss-config.form.secretKey.placeholder")),
    spaceDomain: string().required(t("oss-config.form.spaceDomain.placeholder")),
    endpoint: string().optional(),
    arn: string().optional(),
});
type Schema = InferType<typeof schema>;
const state = reactive({
    storageType: "local",
    isActive: true,
    spaceName: "",
    accessKey: "",
    secretKey: "",
    spaceDomain: "",
    endpoint: "",
    arn: "",
});

const toast = useToast();
async function handleSubmit(event: FormSubmitEvent<Schema>) {
    toast.add({ title: "Success", description: "The form has been submitted.", color: "success" });
    console.log(event.data);
}
</script>

<template>
    <UModal :title="$t('oss-config.storage.local')" :ui="{ footer: 'justify-end' }">
        <UButton variant="ghost">{{ $t("oss-config.table.setting") }}</UButton>

        <template #body>
            <UForm
                ref="form"
                :schema="schema"
                :state="state"
                class="space-y-6"
                @submit="(event) => handleSubmit(event)"
            >
                <UFormField
                    name="storageType"
                    :label="$t('oss-config.form.storageType.label')"
                    :ui="{ description: 'py-2' }"
                    :description="$t('oss-config.form.storageType.desc')"
                >
                    <URadioGroup
                        v-model="state.storageType"
                        :items="[{ label: $t('oss-config.storage.local'), value: 'local' }]"
                    />
                </UFormField>

                <UFormField
                    required
                    :label="$t('oss-config.form.spaceName.label')"
                    name="spaceName"
                >
                    <UInput
                        class="w-full"
                        v-model="state.spaceName"
                        :placeholder="$t('oss-config.form.spaceName.placeholder')"
                    />
                </UFormField>

                <UFormField required label="ACCESS_KEY" name="accessKey">
                    <UInput
                        class="w-full"
                        v-model="state.accessKey"
                        :placeholder="$t('oss-config.form.accessKey.placeholder')"
                    />
                </UFormField>

                <UFormField required label="SECRET_KEY" name="secretKey">
                    <UInput
                        class="w-full"
                        v-model="state.secretKey"
                        :placeholder="$t('oss-config.form.secretKey.placeholder')"
                    />
                </UFormField>

                <UFormField
                    required
                    :label="$t('oss-config.form.spaceDomain.label')"
                    name="spaceDomain"
                >
                    <UInput
                        class="w-full"
                        v-model="state.spaceDomain"
                        :placeholder="$t('oss-config.form.spaceDomain.placeholder')"
                    />
                </UFormField>

                <UFormField
                    label="ENDPOINT"
                    name="endpoint"
                    :ui="{ description: 'text-xs' }"
                    :description="$t('oss-config.aliCloud.paramDesc')"
                >
                    <UInput
                        class="w-full"
                        v-model="state.endpoint"
                        :placeholder="$t('oss-config.form.endpoint.placeholder')"
                    />
                </UFormField>

                <UFormField
                    label="ARN"
                    name="arn"
                    :ui="{ description: 'text-xs' }"
                    :description="$t('oss-config.aliCloud.paramDesc')"
                >
                    <UInput
                        class="w-full"
                        v-model="state.arn"
                        :placeholder="$t('oss-config.form.arn.placeholder')"
                    />
                </UFormField>

                <UFormField :label="$t('oss-config.form.status')" name="isActive">
                    <USwitch v-model="state.isActive" />
                </UFormField>
            </UForm>
        </template>

        <template #footer="{ close }">
            <UButton color="neutral" variant="outline" @click="close">{{
                $t("oss-config.cancel")
            }}</UButton>
            <UButton color="primary" @click="() => form?.submit()">{{
                $t("oss-config.confirm")
            }}</UButton>
        </template>
        <template #description></template>
    </UModal>
</template>
