<script lang="ts" setup>
import type { WebsiteAgreement } from "@buildingai/service/common";
import type { UpdateWebsiteRequest, WebsiteConfig } from "@buildingai/service/consoleapi/website";
import {
    apiGetWebsiteConfig,
    apiUpdateWebsiteConfig,
} from "@buildingai/service/consoleapi/website";

import type { TabsItem } from "#ui/types";

const { t } = useI18n();
const message = useMessage();

/** 当前选中的标签页 */
const activeTab = shallowRef("0");

/** 标签选项配置 */
const items = shallowRef<TabsItem[]>([
    { label: t("system.website.agreement.privacy") },
    { label: t("system.website.agreement.service") },
    { label: t("system.website.agreement.payment") },
]);

/** 表单状态 */
const state = shallowReactive<WebsiteAgreement>({
    privacyTitle: "",
    privacyContent: "",
    serviceTitle: "",
    serviceContent: "",
    paymentTitle: "",
    paymentContent: "",
});

/** 完整的网站配置数据 */
const websiteConfig = shallowRef<WebsiteConfig | null>(null);

/** 获取网站配置 */
const { lockFn: getWebsiteConfig, isLock: isLoadingConfig } = useLockFn(async () => {
    try {
        const config = await apiGetWebsiteConfig();
        websiteConfig.value = config;

        // 更新表单状态
        state.privacyTitle = config.agreement.privacyTitle || t("system.website.agreement.privacy");
        state.privacyContent = config.agreement.privacyContent || "";
        state.serviceTitle = config.agreement.serviceTitle || t("system.website.agreement.service");
        state.serviceContent = config.agreement.serviceContent || "";
        state.paymentTitle = config.agreement.paymentTitle || t("system.website.agreement.payment");
        state.paymentContent = config.agreement.paymentContent || "";
    } catch (error) {
        console.error("Get website config failed:", error);
        message.error(t("system.website.messages.loadFailed"));
    }
});

/** 保存协议配置 */
const { lockFn: onSubmit, isLock } = useLockFn(async () => {
    try {
        // 构建更新数据，只传递协议部分
        const updateData: UpdateWebsiteRequest = {
            agreement: {
                privacyTitle: state.privacyTitle,
                privacyContent: state.privacyContent,
                serviceTitle: state.serviceTitle,
                serviceContent: state.serviceContent,
                paymentTitle: state.paymentTitle,
                paymentContent: state.paymentContent,
            },
        };

        await apiUpdateWebsiteConfig(updateData);
        message.success(t("system.website.messages.saveSuccess"));

        // 重新获取配置以确保数据同步
        await getWebsiteConfig();
    } catch (error) {
        console.error("Save failed:", error);
        message.error(t("system.website.messages.saveFailed"));
    }
});

/** 重置表单 */
const resetForm = () => {
    if (websiteConfig.value) {
        state.privacyTitle =
            websiteConfig.value.agreement.privacyTitle || t("system.website.agreement.privacy");
        state.privacyContent = websiteConfig.value.agreement.privacyContent || "";
        state.serviceTitle =
            websiteConfig.value.agreement.serviceTitle || t("system.website.agreement.service");
        state.serviceContent = websiteConfig.value.agreement.serviceContent || "";
        state.paymentTitle =
            websiteConfig.value.agreement.paymentTitle || t("system.website.agreement.payment");
        state.paymentContent = websiteConfig.value.agreement.paymentContent || "";
        message.info(t("system.website.messages.resetSuccess"));
    } else {
        state.privacyTitle = t("system.website.agreement.privacy");
        state.privacyContent = "";
        state.serviceTitle = t("system.website.agreement.service");
        state.serviceContent = "";
        state.paymentTitle = t("system.website.agreement.payment");
        state.paymentContent = "";
        message.info(t("system.website.messages.resetEmpty"));
    }
};

// 组件挂载时获取配置
onMounted(() => getWebsiteConfig());
</script>

<template>
    <div class="agreement-container relative">
        <!-- 表单 -->
        <div class="mb-4 inline-block w-auto">
            <UTabs v-model="activeTab" :items="items" />
        </div>

        <UForm :state="state" @submit="onSubmit">
            <template v-if="activeTab === '0'">
                <UFormField
                    name="privacyTitle"
                    :label="t('system.website.agreement.titleLabel')"
                    required
                >
                    <UInput v-model="state.privacyTitle" size="xl" :ui="{ root: 'w-full' }" />
                </UFormField>

                <UFormField
                    name="privacyContent"
                    :label="t('system.website.agreement.contentLabel')"
                    class="mt-4"
                >
                    <BdEditor v-model="state.privacyContent" />
                </UFormField>
            </template>

            <template v-else-if="activeTab === '1'">
                <UFormField
                    name="serviceTitle"
                    :label="t('system.website.agreement.titleLabel')"
                    required
                >
                    <UInput v-model="state.serviceTitle" size="xl" :ui="{ root: 'w-full' }" />
                </UFormField>

                <UFormField
                    name="serviceContent"
                    :label="t('system.website.agreement.contentLabel')"
                    class="mt-4"
                >
                    <BdEditor v-model="state.serviceContent" />
                </UFormField>
            </template>

            <template v-else-if="activeTab === '2'">
                <UFormField
                    name="paymentTitle"
                    :label="t('system.website.agreement.titleLabel')"
                    required
                >
                    <UInput v-model="state.paymentTitle" size="xl" :ui="{ root: 'w-full' }" />
                </UFormField>

                <UFormField
                    name="paymentContent"
                    :label="t('system.website.agreement.contentLabel')"
                    class="mt-4"
                >
                    <BdEditor v-model="state.paymentContent" />
                </UFormField>
            </template>

            <div class="flex space-x-3 pt-4">
                <AccessControl :codes="['system-website:setConfig']">
                    <UButton
                        type="submit"
                        color="primary"
                        :loading="isLock"
                        :disabled="isLock || isLoadingConfig"
                    >
                        {{
                            isLock
                                ? t("system.website.actions.saving")
                                : t("system.website.actions.saveChanges")
                        }}
                    </UButton>
                </AccessControl>
                <UButton
                    type="reset"
                    color="neutral"
                    variant="outline"
                    :disabled="isLock || isLoadingConfig"
                    @click="resetForm"
                >
                    {{ t("system.website.actions.reset") }}
                </UButton>
            </div>
        </UForm>
    </div>
</template>
