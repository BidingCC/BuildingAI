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
    name: string().required("小程序名称不能为空"),
    appId: string().required("AppId不能为空"),
    appSecret: string().required("AppSecret不能为空"),
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
                <h2 class="text-xl font-semibold">基本信息</h2>
                <p class="text-muted-foreground mt-1 text-sm">
                    填写小程序基本信息，用于小程序的识别和展示
                </p>
            </div>
        </div>
        <UFormField label="小程序名称" class="mb-6" name="name" required>
            <UInput
                v-model="state.name"
                placeholder="请输入小程序名称"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField label="原始ID" class="mb-6" name="originalId">
            <UInput
                v-model="state.originalId"
                placeholder="请输入原始ID"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField
            label="小程序码"
            class="mb-6"
            name="qrCode"
            description="建议尺寸：400*400像素，支持jpg，jpeg，png格式"
        >
            <div class="flex items-start gap-4">
                <BdUploader
                    v-model="state.qrCode"
                    class="h-24 w-24"
                    text="上传小程序码"
                    icon="i-lucide-upload"
                    accept=".jpg,.png,.jpeg"
                    :maxCount="1"
                    :single="true"
                />
            </div>
        </UFormField>
        <div class="information-container mx-auto mt-4">
            <div class="mb-4 flex flex-col justify-center">
                <h2 class="text-xl font-semibold">开发者配置</h2>
                <p class="text-muted-foreground mt-1 text-sm">
                    填写小程序开发者配置，用于小程序的开发和维护
                </p>
            </div>
        </div>
        <UFormField label="AppId" class="mb-6" name="appId" required>
            <UInput
                v-model="state.appId"
                placeholder="请输入AppId"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField label="AppSecret" class="mb-6" name="appSecret" required>
            <UInput
                v-model="state.appSecret"
                placeholder="请输入AppSecret"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UInput>
        </UFormField>
        <UFormField label="上传密钥" class="mb-6" name="uploadKey">
            <UTextarea
                v-model="state.uploadKey"
                placeholder="请输入上传密钥"
                size="lg"
                :ui="{ root: 'w-full sm:w-xs' }"
            >
            </UTextarea>
        </UFormField>
        <div class="flex space-x-3 pt-4">
            <UButton type="submit" color="primary" :loading="isLock" :disabled="isLock">
                {{ isLock ? "保存中..." : "保存更改" }}
            </UButton>
            <UButton
                type="reset"
                color="neutral"
                variant="outline"
                :loading="isLock"
                :disabled="isLock"
                @click="resetForm"
            >
                {{ isLock ? "重置中..." : "重置配置" }}
            </UButton>
        </div>
    </UForm>
</template>
