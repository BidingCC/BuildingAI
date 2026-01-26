<script setup lang="ts">
import type { AppsDecorateConfig } from "@buildingai/service/consoleapi/decorate";
import {
    apiConsoleGetAppsDecorate,
    apiConsoleSetAppsDecorate,
} from "@buildingai/service/consoleapi/decorate";

const emit = defineEmits<{
    (e: "close"): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const formData = shallowReactive<AppsDecorateConfig>({
    enabled: false,
    title: "",
    link: {
        name: "",
        path: "",
        query: {},
    },
    heroImageUrl: "",
});

const getData = async () => {
    try {
        const data = await apiConsoleGetAppsDecorate();
        useFormData(formData, data);
    } catch (err) {
        console.error("获取装修设置失败:", err);
    }
};

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        await apiConsoleSetAppsDecorate(formData);
        emit("close");
        toast.success(t("console-common.messages.success"));
    } catch {
        toast.error(t("console-common.messages.failed"));
    }
});

onMounted(() => getData());
</script>

<template>
    <BdModal :title="t('decorate.apps.modalTitle')" @close="emit('close')">
        <div class="grid grid-cols-1 gap-4">
            <UFormField :label="t('console-common.enabled')" required>
                <USwitch v-model="formData.enabled" />
            </UFormField>

            <UFormField :label="t('console-common.title')">
                <UInput
                    v-model="formData.title"
                    :ui="{ root: 'w-full' }"
                    :placeholder="t('console-common.placeholder.title')"
                />
            </UFormField>

            <UFormField :label="t('console-common.link')">
                <div class="w-full">
                    <LinkPicker v-model="formData.link" size="md" :ui="{ root: 'w-full' }" />
                </div>
            </UFormField>

            <UFormField :label="t('decorate.apps.heroImage')" required>
                <BdUploader
                    v-model="formData.heroImageUrl"
                    class="h-24 w-24"
                    icon="i-lucide-upload"
                    accept=".jpg,.png,.jpeg,.gif,.webp"
                    :maxCount="1"
                    :single="true"
                    :multiple="false"
                />
                <template #help>
                    <span class="text-xs">
                        {{ t("extensions.develop.form.bannerRecommendation") }}
                    </span>
                </template>
            </UFormField>
        </div>

        <div class="flex w-full items-center justify-end gap-2">
            <UButton :disabled="isLock" variant="ghost" @click="emit('close')">
                {{ t("console-common.cancel") }}
            </UButton>
            <UButton :loading="isLock" color="primary" @click="submitForm">
                {{ t("console-common.save") }}
            </UButton>
        </div>
    </BdModal>
</template>
