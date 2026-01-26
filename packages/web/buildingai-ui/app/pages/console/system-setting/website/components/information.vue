<script setup lang="ts">
import type { WebsiteInfo } from "@buildingai/service/common";
import type { UpdateWebsiteRequest, WebsiteConfig } from "@buildingai/service/consoleapi/website";
import {
    apiGetWebsiteConfig,
    apiUpdateWebsiteConfig,
} from "@buildingai/service/consoleapi/website";
import { useI18n } from "vue-i18n";
import { object, string } from "yup";

const { t } = useI18n();
const message = useMessage();
const appStore = useAppStore();

const schema = object({
    name: string().required(t("system.website.information.name.required")),
    description: string().optional(),
});

const state = shallowReactive<WebsiteInfo>({
    name: "",
    description: "",
    icon: "",
    logo: "",
    spaLoadingIcon: "",
});

const websiteConfig = shallowRef<WebsiteConfig | null>(null);

const { lockFn: getWebsiteConfig, isLock: isLoadingConfig } = useLockFn(async () => {
    try {
        const config = await apiGetWebsiteConfig();
        websiteConfig.value = config;

        useFormData(state, config.webinfo);
    } catch (error) {
        console.error("Get website config failed:", error);
        message.error(t("system.website.messages.loadFailed"));
    }
});

const { lockFn: handleSubmit, isLock } = useLockFn(async () => {
    try {
        const updateData: UpdateWebsiteRequest = {
            webinfo: {
                name: state.name,
                description: state.description,
                icon: state.icon || "",
                logo: state.logo || "",
                spaLoadingIcon: state.spaLoadingIcon || "",
            },
        };

        await apiUpdateWebsiteConfig(updateData);
        message.success(t("system.website.messages.saveSuccess"));

        // 重新获取配置以确保数据同步
        await appStore.getConfig();

        useHead({
            title: state.name,
            link: [
                { rel: "icon", href: appStore.siteConfig?.webinfo?.icon || "/favicon.ico" },
                {
                    rel: "apple-touch-icon",
                    href: appStore.siteConfig?.webinfo?.logo || "/favicon.ico",
                },
            ],
        });
    } catch (error) {
        console.error("Save failed:", error);
    }
});

const resetForm = () => {
    if (websiteConfig.value) {
        useFormData(state, websiteConfig.value.webinfo);
        message.info(t("system.website.messages.resetSuccess"));
    } else {
        state.name = "";
        state.description = "";
        state.icon = "";
        state.logo = "";
        state.spaLoadingIcon = "";
        message.info(t("system.website.messages.resetEmpty"));
    }
};

onMounted(() => getWebsiteConfig());
</script>

<template>
    <div class="information-container py-8">
        <!-- 表单 -->
        <UForm :schema="schema" :state="state" class="space-y-6" @submit="handleSubmit">
            <!-- 网站名称 -->
            <UFormField
                :label="t('system.website.information.name.label')"
                name="name"
                :description="t('system.website.information.name.description')"
                required
            >
                <UInput
                    v-model="state.name"
                    :placeholder="t('system.website.information.name.placeholder')"
                    size="lg"
                    :ui="{ root: 'w-full sm:w-xs' }"
                >
                    <template #leading>
                        <UIcon name="i-heroicons-globe-alt" />
                    </template>
                </UInput>
            </UFormField>

            <!-- 网站描述 -->
            <UFormField
                :label="t('system.website.information.description.label')"
                name="description"
                :description="t('system.website.information.description.description')"
            >
                <UTextarea
                    v-model="state.description"
                    :placeholder="t('system.website.information.description.placeholder')"
                    :rows="3"
                    size="lg"
                    :ui="{ root: 'w-full sm:w-xs' }"
                />
            </UFormField>

            <!-- 网站图标 -->
            <UFormField
                :label="t('system.website.information.icon.label')"
                name="icon"
                :description="t('system.website.information.icon.description')"
            >
                <div class="flex items-start gap-4">
                    <BdUploader
                        v-model="state.icon"
                        class="h-24 w-24"
                        :text="t('system.website.information.icon.upload')"
                        icon="i-lucide-upload"
                        accept=".jpg,.png,.jpeg,.ico"
                        :maxCount="1"
                        :single="true"
                    />
                </div>
            </UFormField>

            <!-- 网站Logo -->
            <UFormField
                :label="t('system.website.information.logo.label')"
                name="logo"
                :description="t('system.website.information.logo.description')"
            >
                <div class="flex items-start gap-4">
                    <BdUploader
                        v-model="state.logo"
                        class="h-24 w-24"
                        :text="t('system.website.information.logo.upload')"
                        icon="i-lucide-upload"
                        accept=".jpg,.png,.jpeg"
                        :maxCount="1"
                        :single="true"
                    />
                </div>
            </UFormField>

            <!-- SPA加载图标 -->
            <UFormField
                :label="t('system.website.information.spaLoadingIcon.label')"
                name="spaLoadingIcon"
                :description="t('system.website.information.spaLoadingIcon.description')"
            >
                <div class="flex items-start gap-4">
                    <BdUploader
                        v-model="state.spaLoadingIcon"
                        class="h-24 w-24"
                        :text="t('system.website.information.spaLoadingIcon.upload')"
                        icon="i-lucide-upload"
                        accept=".jpg,.png,.jpeg"
                        :maxCount="1"
                        :single="true"
                    />
                </div>
            </UFormField>

            <div class="bg-background sticky bottom-0 flex space-x-3 py-4">
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
                                : t("system.website.actions.save")
                        }}
                    </UButton>
                </AccessControl>
                <UButton
                    type="reset"
                    :loading="isLock"
                    :disabled="isLock || isLoadingConfig"
                    color="neutral"
                    variant="outline"
                    @click="resetForm"
                >
                    {{ t("system.website.actions.reset") }}
                </UButton>
            </div>
        </UForm>
    </div>
</template>
