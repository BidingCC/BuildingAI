<script setup lang="ts">
import type { StorageConfig } from "@buildingai/service/consoleapi/storage-config";
import { StorageType } from "@buildingai/service/consoleapi/storage-config";
import type { FormSubmitEvent } from "@nuxt/ui";
import { boolean, type InferType, number, object, string } from "yup";

const props = defineProps({
    data: {
        type: Object as PropType<StorageConfig<typeof StorageType.ALIYUN_OSS>>,
        required: true,
    },
});

const { t } = useI18n();
const form = useTemplateRef("form");
const schema = object({
    storageType: number().required(),
    isActive: boolean().required(),
    config: object({
        bucket: string().required(t("storage-config.form.spaceName.placeholder")),
        accessKey: string().required(t("storage-config.form.accessKey.placeholder")),
        secretKey: string().required(t("storage-config.form.secretKey.placeholder")),
        domain: string().required(t("storage-config.form.spaceDomain.placeholder")),
        endpoint: string().optional(),
        arn: string().optional(),
    }),
});
type Schema = InferType<typeof schema>;
const state = reactive<StorageConfig<typeof StorageType.ALIYUN_OSS>>({
    ...props.data,
    config: { ...props.data.config },
});

const toast = useToast();
async function handleSubmit(event: FormSubmitEvent<Schema>) {
    toast.add({ title: "Success", description: "The form has been submitted.", color: "success" });
    console.log(event.data);
}
</script>

<template>
    <UModal :title="$t('storage-config.storage.local')" :ui="{ footer: 'justify-end' }">
        <UButton variant="ghost">{{ $t("storage-config.table.setting") }}</UButton>

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
                    :label="$t('storage-config.form.storageType.label')"
                    :ui="{ description: 'py-2' }"
                    :description="$t('storage-config.form.storageType.desc')"
                >
                    <URadioGroup
                        v-model="state.storageType"
                        :items="[
                            {
                                label: $t('storage-config.storage.aliyun-oss'),
                                value: StorageType.ALIYUN_OSS,
                            },
                        ]"
                    />
                </UFormField>

                <UFormField
                    required
                    :label="$t('storage-config.form.spaceName.label')"
                    name="config.bucket"
                >
                    <UInput
                        class="w-full"
                        v-model="state.config.bucket"
                        :placeholder="$t('storage-config.form.spaceName.placeholder')"
                    />
                </UFormField>

                <UFormField required label="ACCESS_KEY" name="config.accessKey">
                    <UInput
                        class="w-full"
                        v-model="state.config.accessKey"
                        :placeholder="$t('storage-config.form.accessKey.placeholder')"
                    />
                </UFormField>

                <UFormField required label="SECRET_KEY" name="config.secretKey">
                    <UInput
                        class="w-full"
                        v-model="state.config.secretKey"
                        :placeholder="$t('storage-config.form.secretKey.placeholder')"
                    />
                </UFormField>

                <UFormField
                    required
                    :label="$t('storage-config.form.spaceDomain.label')"
                    name="config.domain"
                >
                    <UInput
                        class="w-full"
                        v-model="state.config.domain"
                        :placeholder="$t('storage-config.form.spaceDomain.placeholder')"
                    />
                </UFormField>

                <UFormField
                    label="ENDPOINT"
                    name="config.endpoint"
                    :ui="{ description: 'text-xs' }"
                    :description="$t('storage-config.aliCloud.paramDesc')"
                >
                    <UInput
                        class="w-full"
                        v-model="state.config.endpoint"
                        :placeholder="$t('storage-config.form.endpoint.placeholder')"
                    />
                </UFormField>

                <UFormField
                    label="ARN"
                    name="config.arn"
                    :ui="{ description: 'text-xs' }"
                    :description="$t('storage-config.aliCloud.paramDesc')"
                >
                    <UInput
                        class="w-full"
                        v-model="state.config.arn"
                        :placeholder="$t('storage-config.form.arn.placeholder')"
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
