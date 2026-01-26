<script lang="ts" setup>
import type { AppInfo } from "@buildingai/service/consoleapi/extensions";
import {
    apiGetApplicationByActivationCode,
    apiInstallByActivationCode,
} from "@buildingai/service/consoleapi/extensions";
import { object, string } from "yup";

const emits = defineEmits<{
    (e: "close", success?: boolean): void;
}>();

const toast = useMessage();

const formData = reactive({
    activationCode: "",
});

const { t } = useI18n();
const schema = object({
    activationCode: string().required(
        t("extensions.manage.installActivation.activationCodeRequired"),
    ),
});

// 状态管理：'input' 输入激活码，'preview' 预览应用
const currentStep = shallowRef<"input" | "preview">("input");
const appInfo = shallowRef<AppInfo | null>(null);
const isInstalling = shallowRef(false);

const { isLock, lockFn: handleQuery } = useLockFn(async () => {
    try {
        // 通过激活码获取应用信息
        const result: AppInfo = await apiGetApplicationByActivationCode(formData.activationCode);

        if (!result) {
            toast.error(t("extensions.manage.installActivation.activationCodeInvalid"));
            return;
        }

        // 切换到预览状态
        appInfo.value = result;
        currentStep.value = "preview";
    } catch (error: unknown) {
        console.error(t("extensions.manage.installActivation.queryFailed"), error);
    }
});

const handleBack = () => {
    currentStep.value = "input";
    appInfo.value = null;
};

const handleCancel = () => {
    emits("close", false);
};

const { lockFn: handleConfirmInstall } = useLockFn(async () => {
    if (!appInfo.value) return;

    try {
        isInstalling.value = true;
        await apiInstallByActivationCode(formData.activationCode, appInfo.value.key);
        toast.success(t("extensions.manage.installActivation.installSuccess"));
        emits("close", true);
    } catch (error: unknown) {
        console.error(t("extensions.manage.installActivation.installFailed"), error);
    } finally {
        isInstalling.value = false;
    }
});
</script>

<template>
    <BdModal
        :title="t('extensions.manage.installActivation.title')"
        :ui="{ content: currentStep === 'preview' ? 'max-w-xl' : 'max-w-md' }"
        :disabled-close="isInstalling"
        :close-on-esc="!isInstalling"
        @close="handleCancel"
    >
        <template #title>
            <div class="flex items-center gap-2">
                <UButton
                    v-if="currentStep === 'preview'"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-arrow-left"
                    size="sm"
                    :disabled="isInstalling"
                    @click="handleBack"
                />
                <span>{{ t("extensions.manage.installActivation.title") }}</span>
            </div>
        </template>

        <!-- 输入激活码步骤 -->
        <div v-if="currentStep === 'input'">
            <UForm
                :state="formData"
                :schema="schema"
                class="w-full space-y-4"
                @submit="handleQuery"
            >
                <UFormField
                    :label="t('extensions.manage.installActivation.activationCodeLabel')"
                    name="activationCode"
                    required
                >
                    <!--<template #description>
                        <p class="text-muted-foreground mb-2 text-sm">
                            {{ t("extensions.manage.installActivation.activationCodeDescription") }}
                            <a
                                href="https://buildingai.cc/user/application"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-primary hover:underline"
                            >
                                {{
                                    t(
                                        "extensions.manage.installActivation.activationCodeDescriptionLink",
                                    )
                                }}
                            </a>
                            {{
                                t(
                                    "extensions.manage.installActivation.activationCodeDescriptionSuffix",
                                )
                            }}
                        </p>
                    </template>-->
                    <UInput
                        v-model="formData.activationCode"
                        :placeholder="
                            t('extensions.manage.installActivation.activationCodePlaceholder')
                        "
                        size="lg"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <div class="flex justify-end gap-2 pt-4">
                    <UButton color="neutral" variant="outline" size="lg" @click="handleCancel">
                        {{ t("extensions.manage.installActivation.cancel") }}
                    </UButton>
                    <UButton color="primary" size="lg" :loading="isLock" type="submit">
                        {{ t("extensions.manage.installActivation.query") }}
                    </UButton>
                </div>
            </UForm>
        </div>

        <!-- 预览应用步骤 -->
        <div v-else-if="currentStep === 'preview' && appInfo" class="space-y-4">
            <!-- 1. 封面横幅 -->
            <div
                v-if="appInfo.cover"
                class="border-default bg-muted relative mb-4 flex w-full items-center justify-center overflow-hidden rounded-lg border"
                style="aspect-ratio: 800 / 450"
            >
                <NuxtImg
                    :src="appInfo.cover"
                    :alt="appInfo.name"
                    class="h-full w-full rounded-lg object-contain"
                />
            </div>

            <!-- 2. 图标及名字 -->
            <div class="flex items-center gap-4">
                <!-- 应用图标 -->
                <UAvatar
                    :src="appInfo.icon"
                    :alt="appInfo.name"
                    size="3xl"
                    :ui="{ root: 'rounded-lg flex-shrink-0' }"
                >
                    <template #fallback>
                        <UIcon name="i-lucide-puzzle" class="text-muted-foreground h-12 w-12" />
                    </template>
                </UAvatar>

                <!-- 应用名称 -->
                <div>
                    <h3 class="text-foreground text-lg font-semibold">
                        {{ appInfo.name }}
                    </h3>
                </div>
            </div>

            <!-- 3. 详情 -->
            <div class="space-y-2">
                <!-- 应用描述 -->
                <div v-if="appInfo.describe">
                    <p class="text-muted-foreground text-sm leading-relaxed">
                        {{ appInfo.describe }}
                    </p>
                </div>
            </div>
        </div>

        <template v-if="currentStep === 'preview'" #footer>
            <div class="flex justify-end gap-2">
                <UButton
                    color="neutral"
                    variant="outline"
                    size="lg"
                    :disabled="isInstalling"
                    @click="handleCancel"
                >
                    {{ t("extensions.manage.installActivation.cancel") }}
                </UButton>
                <UButton
                    color="primary"
                    size="lg"
                    :loading="isInstalling"
                    @click="handleConfirmInstall"
                >
                    {{
                        isInstalling
                            ? t("extensions.manage.installActivation.installing")
                            : t("extensions.manage.installActivation.confirmInstall")
                    }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
