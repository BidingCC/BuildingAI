<script setup lang="ts">
import type { WxMpConfig } from "@buildingai/service/consoleapi/mpconfig";
import { apiGetWxMpConfig, apiUpdateWxMpConfig } from "@buildingai/service/consoleapi/mpconfig";
import { useI18n } from "vue-i18n";
import { object, string } from "yup";
const { t } = useI18n();
const message = useMessage();
const wxMpConfig = shallowRef<WxMpConfig | null>(null);

const state = shallowReactive<WxMpConfig>({
    name: "",
    appId: "",
    appSecret: "",
    qrCode: "",
    originalId: "",
    uploadKey: "",
});
const { lockFn: getWxMpConfig } = useLockFn(async () => {
    const data = await apiGetWxMpConfig();
    wxMpConfig.value = data;
    useFormData(state, data);
});

const schema = object({
    name: string().required(t("channel.wechatMP.validation.name.required")),
    appId: string().required(t("channel.wechatMP.validation.appId.required")),
    appSecret: string().required(t("channel.wechatMP.validation.appSecret.required")),
});
const { lockFn: handleSubmit, isLock } = useLockFn(async () => {
    try {
        await apiUpdateWxMpConfig(state);
        message.success(t("system.website.messages.saveSuccess"));
        await getWxMpConfig();
    } catch (error) {
        console.error("Update wechat MP config failed:", error);
        message.error(t("system.website.messages.saveFailed"));
    }
});
const resetForm = () => {
    if (wxMpConfig.value) {
        state.name = wxMpConfig.value.name || "";
        state.originalId = wxMpConfig.value.originalId || "";
        state.qrCode = wxMpConfig.value.qrCode || "";
        state.appId = wxMpConfig.value.appId || "";
        state.appSecret = wxMpConfig.value.appSecret || "";
        state.uploadKey = wxMpConfig.value.uploadKey || "";
        message.info(t("system.website.messages.resetSuccess"));
    } else {
        state.name = "";
        state.originalId = "";
        state.qrCode = "";
        state.appId = "";
        state.appSecret = "";
        state.uploadKey = "";
        message.info(t("system.website.messages.resetEmpty"));
    }
};
onMounted(() => getWxMpConfig());
</script>

<template>
    <UForm :schema="schema" :state="state" class="space-y-6" @submit="handleSubmit" ref="formRef">
        <div class="information-container mx-auto mt-4">
            <div class="mb-4 flex flex-col justify-center">
                <h2 class="text-xl font-semibold">
                    {{ t("channel.wechatMP.sections.basicInfo.title") }}
                </h2>
                <p class="text-muted-foreground mt-1 text-sm">
                    {{ t("channel.wechatMP.sections.basicInfo.description") }}
                </p>
            </div>
        </div>
        <UFormField
            :label="t('channel.wechatMP.form.name.label')"
            class="mb-6"
            name="name"
            required
        >
            <UInput
                v-model="state.name"
                :placeholder="t('channel.wechatMP.form.name.placeholder')"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField
            :label="t('channel.wechatMP.form.originalId.label')"
            class="mb-6"
            name="originalId"
        >
            <UInput
                v-model="state.originalId"
                :placeholder="t('channel.wechatMP.form.originalId.placeholder')"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField
            :label="t('channel.wechatMP.form.qrCode.label')"
            class="mb-6"
            name="qrCode"
            :description="t('channel.wechatMP.form.qrCode.description')"
        >
            <div class="flex items-start gap-4">
                <BdUploader
                    v-model="state.qrCode"
                    class="h-24 w-24"
                    :text="t('channel.wechatMP.form.qrCode.uploadText')"
                    icon="i-lucide-upload"
                    accept=".jpg,.png,.jpeg"
                    :maxCount="1"
                    :single="true"
                />
            </div>
        </UFormField>
        <div class="information-container mx-auto mt-4">
            <div class="mb-4 flex flex-col justify-center">
                <h2 class="text-xl font-semibold">
                    {{ t("channel.wechatMP.sections.developerConfig.title") }}
                </h2>
                <p class="text-muted-foreground mt-1 text-sm">
                    {{ t("channel.wechatMP.sections.developerConfig.description") }}
                </p>
            </div>
        </div>
        <UFormField
            :label="t('channel.wechatMP.form.appId.label')"
            class="mb-6"
            name="appId"
            required
        >
            <UInput
                v-model="state.appId"
                :placeholder="t('channel.wechatMP.form.appId.placeholder')"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField
            :label="t('channel.wechatMP.form.appSecret.label')"
            class="mb-6"
            name="appSecret"
            required
        >
            <UInput
                v-model="state.appSecret"
                :placeholder="t('channel.wechatMP.form.appSecret.placeholder')"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField
            :label="t('channel.wechatMP.form.uploadKey.label')"
            class="mb-6"
            name="uploadKey"
        >
            <UTextarea
                v-model="state.uploadKey"
                :placeholder="t('channel.wechatMP.form.uploadKey.placeholder')"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UTextarea>
        </UFormField>
        <div class="flex space-x-3 pt-4">
            <UButton type="submit" color="primary" :loading="isLock" :disabled="isLock">
                {{ isLock ? t("channel.wechatMP.actions.saving") : t("console-common.save") }}
            </UButton>
            <UButton
                type="reset"
                color="neutral"
                variant="outline"
                :loading="isLock"
                :disabled="isLock"
                @click="resetForm"
            >
                {{ isLock ? t("channel.wechatMP.actions.resetting") : t("console-common.reset") }}
            </UButton>
        </div>
    </UForm>
</template>
