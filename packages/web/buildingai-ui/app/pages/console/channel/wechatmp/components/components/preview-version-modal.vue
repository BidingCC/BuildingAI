<script setup lang="ts">
import { apiPreviewMpVersion } from "@buildingai/service/consoleapi/mpversion";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const message = useMessage();

const emits = defineEmits<{
    (e: "close", v?: boolean): void;
}>();

// 预览表单
const previewForm = shallowReactive({
    description: "",
});

// 预览版本
const { lockFn: handlePreview, isLock: isPreviewing } = useLockFn(async () => {
    try {
        const result = await apiPreviewMpVersion({
            description: previewForm.description || undefined,
        });
        message.success(t("channel.wechatMP.version.messages.previewSuccess"));
        previewForm.description = "";
        emits("close", true);
        // 显示预览二维码
        if (result.qrcodeUrl) {
            // 可以在这里打开一个模态框显示二维码
            console.log("Preview QR code:", result.qrcodeUrl);
        }
    } catch (error) {
        console.error("Preview version failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(errorMessage || t("channel.wechatMP.version.messages.previewFailed"));
    }
});
</script>

<template>
    <BdModal :ui="{ content: 'max-w-md' }" @close="emits('close', false)">
        <UForm :state="previewForm" class="space-y-4" @submit="handlePreview">
            <UFormField
                :label="t('channel.wechatMP.version.preview.form.description.label')"
                name="description"
            >
                <UTextarea
                    v-model="previewForm.description"
                    :placeholder="t('channel.wechatMP.version.preview.form.description.placeholder')"
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
                    :loading="isPreviewing"
                    :disabled="isPreviewing"
                >
                    {{ t("channel.wechatMP.version.preview.button") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
