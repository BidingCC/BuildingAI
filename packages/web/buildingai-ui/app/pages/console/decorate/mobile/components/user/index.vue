<script setup lang="ts">
import { apiGetPagesConfig, apiSetPagesConfig } from "@buildingai/service/consoleapi/decorate";

import type { LinkItem } from "~/components/console/page-link-picker/layout";

const { t } = useI18n();
const message = useMessage();

interface BannerItem {
    link: LinkItem | null;
    image: string;
}

interface ServiceItem {
    link: LinkItem | null;
    image: string;
    title: string;
}

interface UserConfig {
    "user-banner": {
        enabled: number;
        data: BannerItem[];
    };
    "user-service": {
        enabled: number;
        style: number;
        title: string;
        data: ServiceItem[];
    };
}

const formData = reactive<UserConfig>({
    "user-banner": {
        enabled: 1,
        data: [
            {
                link: null,
                image: "",
            },
        ],
    },
    "user-service": {
        enabled: 1,
        style: 1,
        title: "",
        data: [
            {
                link: null,
                image: "",
                title: "",
            },
        ],
    },
});

const bannerEnabled = computed({
    get: () => formData["user-banner"].enabled === 1,
    set: (value: boolean) => {
        formData["user-banner"].enabled = value ? 1 : 0;
    },
});

const serviceEnabled = computed({
    get: () => formData["user-service"].enabled === 1,
    set: (value: boolean) => {
        formData["user-service"].enabled = value ? 1 : 0;
    },
});

const { lockFn: getConfig, isLock: detailLoading } = useLockFn(async () => {
    try {
        const response = await apiGetPagesConfig("user");
        if (response) {
            // 合并响应数据到表单
            if (response["user-banner"]) {
                Object.assign(formData["user-banner"], response["user-banner"]);
            }
            if (response["user-service"]) {
                Object.assign(formData["user-service"], response["user-service"]);
            }
        }
    } catch (error) {
        console.error("Get user config failed:", error);
        message.error("获取配置失败");
    }
});

const addBannerItem = () => {
    formData["user-banner"].data.push({
        link: null,
        image: "",
    });
};

const removeBannerItem = (index: number) => {
    if (formData["user-banner"].data.length <= 1) {
        message.warning("至少保留一项");
        return;
    }
    formData["user-banner"].data.splice(index, 1);
};

const addServiceItem = () => {
    formData["user-service"].data.push({
        link: null,
        image: "",
        title: "",
    });
};

const removeServiceItem = (index: number) => {
    if (formData["user-service"].data.length <= 1) {
        message.warning("至少保留一项");
        return;
    }
    formData["user-service"].data.splice(index, 1);
};

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        await apiSetPagesConfig("user", formData);
        await getConfig();
    } catch (error) {
        console.error("Update user config failed:", error);
    }
});

onMounted(() => getConfig());
</script>

<template>
    <div class="user-config-container pb-8">
        <UForm :state="formData" class="w-sm space-y-6" @submit="submitForm">
            <!-- User Banner 配置 -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">用户 Banner 配置</h3>
                    <UFormField label="启用" class="flex items-center gap-2">
                        <USwitch v-model="bannerEnabled" size="sm" class="mb-1" />
                    </UFormField>
                </div>

                <div v-if="formData['user-banner'].enabled" class="w-sm space-y-2">
                    <div
                        v-for="(item, index) in formData['user-banner'].data"
                        :key="index"
                        class="bg-muted/50 space-y-2 rounded-lg p-4"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium">Banner {{ index + 1 }}</span>
                            <UButton
                                variant="soft"
                                color="error"
                                size="sm"
                                @click="removeBannerItem(index)"
                                :disabled="formData['user-banner'].data.length <= 1"
                            >
                                <UIcon name="i-lucide-trash-2" class="size-4" />
                            </UButton>
                        </div>

                        <UFormField
                            label="图片"
                            name="banner-image"
                            class="flex w-full justify-between"
                            :ui="{
                                wrapper: 'flex',
                                label: 'text-muted flex-none w-14',
                                container: 'w-full',
                            }"
                        >
                            <BdUploader
                                v-model="item.image"
                                class="size-20"
                                text=" "
                                icon="i-lucide-upload"
                                accept=".jpg,.png,.jpeg,.webp"
                                :maxCount="1"
                                :single="true"
                            />
                        </UFormField>

                        <UFormField
                            label="链接"
                            name="banner-link"
                            class="flex w-full justify-between"
                            :ui="{
                                wrapper: 'flex',
                                label: 'text-muted flex-none w-14',
                                container: 'w-full',
                            }"
                        >
                            <LinkPicker
                                v-model="item.link"
                                placeholder="选择链接"
                                size="md"
                                mode="mobile"
                                :ui="{ root: 'w-full' }"
                            />
                        </UFormField>
                    </div>

                    <UButton
                        variant="soft"
                        size="sm"
                        @click="addBannerItem"
                        :disabled="!formData['user-banner'].enabled"
                    >
                        <UIcon name="i-lucide-plus" class="mr-1 size-4" />
                        添加 Banner
                    </UButton>
                </div>
            </div>

            <!-- User Service 配置 -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">用户服务配置</h3>
                    <UFormField label="启用" class="flex items-center gap-2">
                        <USwitch v-model="serviceEnabled" size="sm" class="mb-1" />
                    </UFormField>
                </div>

                <div v-if="formData['user-service'].enabled" class="w-sm space-y-2">
                    <UFormField label="标题" name="service-title">
                        <UInput
                            v-model="formData['user-service'].title"
                            placeholder="请输入标题"
                            size="lg"
                            class="w-full"
                        />
                    </UFormField>

                    <UFormField label="布局方式" name="service-style">
                        <USelect
                            v-model="formData['user-service'].style"
                            :items="[
                                { label: '横排', value: 1 },
                                { label: '竖排', value: 2 },
                            ]"
                            value-key="value"
                            label-key="label"
                            placeholder="选择布局方式"
                            class="w-full"
                        />
                    </UFormField>

                    <div
                        v-for="(item, index) in formData['user-service'].data"
                        :key="index"
                        class="bg-muted/50 space-y-2 rounded-lg p-4"
                    >
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium">服务 {{ index + 1 }}</span>
                            <UButton
                                variant="soft"
                                color="error"
                                size="sm"
                                @click="removeServiceItem(index)"
                                :disabled="formData['user-service'].data.length <= 1"
                            >
                                <UIcon name="i-lucide-trash-2" class="size-4" />
                            </UButton>
                        </div>

                        <UFormField
                            label="标题"
                            name="service-title"
                            required
                            class="flex w-full justify-between"
                            :ui="{
                                wrapper: 'flex',
                                label: 'text-muted flex-none w-14',
                                container: 'w-full',
                            }"
                        >
                            <UInput
                                v-model="item.title"
                                placeholder="请输入标题"
                                size="lg"
                                class="w-full"
                            />
                        </UFormField>

                        <UFormField
                            label="图片"
                            name="service-image"
                            class="flex w-full justify-between"
                            :ui="{
                                wrapper: 'flex',
                                label: 'text-muted flex-none w-14',
                                container: 'w-full',
                            }"
                        >
                            <BdUploader
                                v-model="item.image"
                                class="size-20"
                                text=" "
                                icon="i-lucide-upload"
                                accept=".jpg,.png,.jpeg,.webp"
                                :maxCount="1"
                                :single="true"
                            />
                        </UFormField>

                        <UFormField
                            label="链接"
                            name="service-link"
                            class="flex w-full justify-between"
                            :ui="{
                                wrapper: 'flex',
                                label: 'text-muted flex-none w-14',
                                container: 'w-full',
                            }"
                        >
                            <LinkPicker
                                v-model="item.link"
                                placeholder="选择链接"
                                size="md"
                                mode="mobile"
                                :ui="{ root: 'w-full' }"
                            />
                        </UFormField>
                    </div>

                    <UButton
                        variant="soft"
                        size="sm"
                        @click="addServiceItem"
                        :disabled="!formData['user-service'].enabled"
                    >
                        <UIcon name="i-lucide-plus" class="mr-1 size-4" />
                        添加服务
                    </UButton>
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="bg-background sticky bottom-0 flex gap-3 py-4">
                <UButton
                    color="primary"
                    size="lg"
                    type="submit"
                    :loading="isLock"
                    :disabled="detailLoading"
                >
                    {{ t("console-common.save") }}
                </UButton>
            </div>
        </UForm>
    </div>
</template>
