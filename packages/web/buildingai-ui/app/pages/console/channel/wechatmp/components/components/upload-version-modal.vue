<script setup lang="ts">
import { apiUploadMpVersion } from "@buildingai/service/consoleapi/mpversion";
import { useI18n } from "vue-i18n";
import { object, string } from "yup";

const { t } = useI18n();
const message = useMessage();

const emits = defineEmits<{
    (e: "close", v?: boolean): void;
}>();

// 上传表单
const uploadForm = shallowReactive({
    version: "",
    description: "",
});

// 上传表单验证
const uploadSchema = object({
    version: string().required(t("channel.wechatMP.version.validation.version.required")),
});

// 上传版本
const { lockFn: handleUpload, isLock: isUploading } = useLockFn(async () => {
    try {
        await apiUploadMpVersion({
            version: uploadForm.version,
            description: uploadForm.description || undefined,
        });
        message.success(t("channel.wechatMP.version.messages.uploadSuccess"));
        uploadForm.version = "";
        uploadForm.description = "";
        emits("close", true);
    } catch (error) {
        console.error("Upload version failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(errorMessage || t("channel.wechatMP.version.messages.uploadFailed"));
    }
});
</script>

<template>
    <BdModal :ui="{ content: 'max-w-md' }" @close="emits('close', false)">
        <UForm :schema="uploadSchema" :state="uploadForm" class="space-y-4" @submit="handleUpload">
            <UFormField
                :label="t('channel.wechatMP.version.upload.form.version.label')"
                name="version"
                required
            >
                <UInput
                    v-model="uploadForm.version"
                    :placeholder="t('channel.wechatMP.version.upload.form.version.placeholder')"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>
            <UFormField
                :label="t('channel.wechatMP.version.upload.form.description.label')"
                name="description"
            >
                <UTextarea
                    v-model="uploadForm.description"
                    :placeholder="t('channel.wechatMP.version.upload.form.description.placeholder')"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>
            <div class="flex justify-end gap-2 pt-2">
                <UButton color="neutral" variant="soft" @click="emits('close', false)">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton
                    type="submit"
                    color="primary"
                    :loading="isUploading"
                    :disabled="isUploading"
                >
                    {{ t("channel.wechatMP.version.upload.button") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
