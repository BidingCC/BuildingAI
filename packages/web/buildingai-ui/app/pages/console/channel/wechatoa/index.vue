<script setup lang="ts">
import type { UpdateWxOaConfigDto, WxOaConfig } from "@buildingai/service/consoleapi/oaconfig";
import { apiGetWxOaConfig, apiUpdateWxOaConfig } from "@buildingai/service/consoleapi/oaconfig";
import { useClipboard } from "@vueuse/core";
import { object, string } from "yup";

const { t } = useI18n();
const message = useMessage();
const { copy } = useClipboard();

const activeTab = shallowRef("0");
const state = ref<WxOaConfig>({
    appId: "",
    appSecret: "",
    url: "",
    token: "",
    encodingAESKey: "",
    messageEncryptType: "plain",
    domain: "",
    jsApiDomain: "",
    webAuthDomain: "",
});

const tabs = computed<{ name: string; label: string }[]>(() => [
    { name: "info", label: t("channel.wechatOA.tabs.info") },
    { name: "setting", label: t("channel.wechatOA.tabs.setting") },
    { name: "function", label: t("channel.wechatOA.tabs.function") },
]);

async function handleCopy(text: string | undefined, successKey: string) {
    if (!text) return;
    try {
        await copy(text);
        message.success(t(successKey));
    } catch (err) {
        console.error("复制失败:", err);
        message.error(t("console-common.messages.copyFailed"));
    }
}

const copyUrl = () => handleCopy(state.value.url, "channel.wechatOA.actions.copySuccess");
const copyDomain = () =>
    handleCopy(state.value.domain, "channel.wechatOA.actions.copyDomainSuccess");
const copyJsApiDomain = () =>
    handleCopy(state.value.jsApiDomain, "channel.wechatOA.actions.copyJsApiDomainSuccess");
const copyWebAuthDomain = () =>
    handleCopy(state.value.webAuthDomain, "channel.wechatOA.actions.copyWebAuthDomainSuccess");

const messageEncryptType = {
    plain: "plain",
    compatible: "compatible",
    safe: "safe",
} as const;

const messageEncryptTypeOptions = [
    {
        label: t("channel.wechatOA.messageEncryptType.plain"),
        value: messageEncryptType.plain,
    },
    {
        label: t("channel.wechatOA.messageEncryptType.compatible"),
        value: messageEncryptType.compatible,
    },
    {
        label: t("channel.wechatOA.messageEncryptType.safe"),
        value: messageEncryptType.safe,
    },
];

const schema = object({
    appId: string().required(t("channel.wechatOA.validation.appId.required")),
    appSecret: string().required(t("channel.wechatOA.validation.appSecret.required")),
    messageEncryptType: string().required(
        t("channel.wechatOA.validation.messageEncryptType.required"),
    ),
});

const { lockFn: getWxOaConfig, isLock } = useLockFn(async () => {
    const data = await apiGetWxOaConfig();
    state.value = { ...data };
});

const { isLock: isLockSubmit, lockFn: handleSubmit } = useLockFn(async () => {
    try {
        const { appId, appSecret, token, encodingAESKey, messageEncryptType } = state.value;
        const updateData: UpdateWxOaConfigDto = {
            appId,
            appSecret,
            token,
            encodingAESKey,
            messageEncryptType,
        };
        await apiUpdateWxOaConfig(updateData);
        message.success(t("channel.wechatOA.submit.success"));
        getWxOaConfig();
    } catch (error) {
        console.error("Update wechat OA config failed:", error);
        message.error(t("channel.wechatOA.submit.error"));
    }
});

function resetForm() {
    Object.assign(state.value, {
        appId: "",
        appSecret: "",
        token: "",
        encodingAESKey: "",
        messageEncryptType: messageEncryptType.plain,
    });
    message.info(t("channel.wechatOA.form.formReset"));
}

onMounted(getWxOaConfig);
</script>

<template>
    <div class="wechatoa">
        <div class="mb-4 inline-block w-auto">
            <UTabs
                v-model="activeTab"
                size="md"
                :content="false"
                :items="tabs.map((tab) => ({ label: tab.label }))"
            />
        </div>
        <div class="mb-4 w-auto lg:max-w-2xl xl:max-w-4xl">
            <UForm
                :schema="schema"
                :state="state"
                class="space-y-6"
                @submit="handleSubmit"
                ref="formRef"
            >
                <div v-show="activeTab === '0'">
                    <div class="information-container mx-auto mt-4">
                        <div class="mb-4 flex flex-col justify-center">
                            <h2 class="text-xl font-semibold">
                                {{ t("channel.wechatOA.title") }}
                            </h2>
                            <p class="text-muted-foreground mt-1 text-sm">
                                {{ t("channel.wechatOA.description") }}
                            </p>
                        </div>
                    </div>

                    <!-- AppId -->
                    <UFormField
                        :label="t('channel.wechatOA.form.appId.label')"
                        class="mb-6"
                        name="appId"
                        required
                    >
                        <UInput
                            v-model="state.appId"
                            :placeholder="t('channel.wechatOA.form.appId.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                        >
                        </UInput>
                    </UFormField>
                    <!-- AppSecret -->
                    <UFormField
                        :label="t('channel.wechatOA.form.appSecret.label')"
                        name="appSecret"
                        required
                    >
                        <UInput
                            v-model="state.appSecret"
                            :placeholder="t('channel.wechatOA.form.appSecret.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                        >
                        </UInput>
                    </UFormField>
                </div>
                <div v-show="activeTab === '1'">
                    <!-- 服务器配置 -->
                    <div class="information-container mx-auto mt-4">
                        <div class="mb-4 flex flex-col justify-center">
                            <h2 class="text-xl font-semibold">
                                {{ t("channel.wechatOA.sections.serverConfig") }}
                            </h2>
                        </div>
                    </div>

                    <!-- url -->
                    <UFormField
                        :label="t('channel.wechatOA.form.url.label')"
                        name="url"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.url.description')"
                    >
                        <UInput
                            v-model="state.url"
                            :placeholder="t('channel.wechatOA.form.url.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                            disabled
                            variant="subtle"
                        >
                        </UInput>
                        <UButton class="ml-2" variant="soft" @click="copyUrl">{{
                            t("console-common.copy")
                        }}</UButton>
                    </UFormField>
                    <!-- token -->
                    <UFormField
                        :label="t('channel.wechatOA.form.token.label')"
                        name="token"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.token.description')"
                    >
                        <UInput
                            v-model="state.token"
                            :placeholder="t('channel.wechatOA.form.token.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                        >
                        </UInput>
                    </UFormField>

                    <!-- encodingAESKey -->
                    <UFormField
                        :label="t('channel.wechatOA.form.encodingAESKey.label')"
                        name="encodingAESKey"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.encodingAESKey.description')"
                    >
                        <UInput
                            v-model="state.encodingAESKey"
                            :placeholder="t('channel.wechatOA.form.encodingAESKey.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                        >
                        </UInput>
                    </UFormField>
                    <!-- 消息加密方式 -->
                    <UFormField
                        :label="t('channel.wechatOA.form.messageEncryptType.label')"
                        name="messageEncryptType"
                        required
                    >
                        <URadioGroup
                            v-model="state.messageEncryptType"
                            :items="messageEncryptTypeOptions"
                        >
                        </URadioGroup>
                    </UFormField>
                </div>
                <div v-show="activeTab === '2'">
                    <!-- 功能设置 -->
                    <div class="information-container mx-auto mt-4">
                        <div class="mb-4 flex flex-col justify-center">
                            <h2 class="text-xl font-semibold">
                                {{ t("channel.wechatOA.sections.functionSettings") }}
                            </h2>
                        </div>
                    </div>

                    <!-- 业务域名 -->
                    <UFormField
                        :label="t('channel.wechatOA.form.domain.label')"
                        name="domain"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.domain.description')"
                    >
                        <UInput
                            v-model="state.domain"
                            :placeholder="t('channel.wechatOA.form.domain.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                            disabled
                            variant="subtle"
                        ></UInput>
                        <UButton class="ml-2" variant="soft" @click="copyDomain">{{
                            t("console-common.copy")
                        }}</UButton>
                    </UFormField>

                    <!-- js接口安全域名 -->
                    <UFormField
                        :label="t('channel.wechatOA.form.jsApiDomain.label')"
                        name="jsApiDomain"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.jsApiDomain.description')"
                    >
                        <UInput
                            v-model="state.jsApiDomain"
                            :placeholder="t('channel.wechatOA.form.jsApiDomain.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                            disabled
                            variant="subtle"
                        ></UInput>
                        <UButton class="ml-2" variant="soft" @click="copyJsApiDomain">{{
                            t("console-common.copy")
                        }}</UButton>
                    </UFormField>
                    <!-- 网页授权域名 -->
                    <UFormField
                        :label="t('channel.wechatOA.form.webAuthDomain.label')"
                        name="webAuthDomain"
                        class="mb-6"
                        :description="t('channel.wechatOA.form.webAuthDomain.description')"
                    >
                        <UInput
                            v-model="state.webAuthDomain"
                            :placeholder="t('channel.wechatOA.form.webAuthDomain.placeholder')"
                            size="lg"
                            :ui="{ root: 'w-full sm:w-xs' }"
                            disabled
                            variant="subtle"
                        ></UInput>
                        <UButton class="ml-2" variant="soft" @click="copyWebAuthDomain">{{
                            t("console-common.copy")
                        }}</UButton>
                    </UFormField>
                </div>

                <!-- 底部按钮 -->
                <div class="flex space-x-3 pt-4">
                    <UButton
                        type="submit"
                        color="primary"
                        :loading="isLock || isLockSubmit"
                        :disabled="isLock || isLockSubmit"
                    >
                        {{
                            isLock ? t("channel.wechatOA.actions.saving") : t("console-common.save")
                        }}
                    </UButton>
                    <UButton
                        type="reset"
                        :loading="isLock || isLockSubmit"
                        :disabled="isLock || isLockSubmit"
                        color="neutral"
                        variant="outline"
                        @click="resetForm"
                    >
                        {{ t("console-common.reset") }}
                    </UButton>
                </div>
            </UForm>
        </div>
    </div>
</template>
