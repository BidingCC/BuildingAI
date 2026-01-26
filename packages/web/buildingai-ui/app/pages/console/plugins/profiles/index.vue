<script setup lang="ts">
import {
    apiGetPlatformSecret,
    apiSetPlatformSecret,
    type PlatformSecretResponse,
} from "@buildingai/service/consoleapi/extensions";
import { object, string } from "yup";

const { t } = useI18n();
const message = useMessage();

const formData = reactive<PlatformSecretResponse>({
    platformSecret: "",
    platformInfo: {},
});

const isEditingSecret = ref(false);
const editingSecretValue = ref("");

const schema = object({
    platformSecret: string(),
});

const formFieldUi = { root: "flex items-center gap-4", label: "min-w-20 flex-shrink-0" };

const hasValidPlatformInfo = computed(() => {
    return formData.platformInfo && Object.keys(formData.platformInfo).length > 0;
});

const { isLock: detailLoading, lockFn: getPlatformInfo } = useLockFn(async () => {
    try {
        const response = await apiGetPlatformSecret();
        formData.platformInfo = response.platformInfo || {};
        formData.platformSecret = response.platformSecret || "";
        isEditingSecret.value = false;
        editingSecretValue.value = "";
    } catch (error) {
        console.error("Get platform info failed:", error);
    }
});

const saveSecretValue = async (secret: string) => {
    await apiSetPlatformSecret({ platformSecret: secret });
    message.success(t("extensions.profiles.setSecretSuccess"));
    await getPlatformInfo();
};

const { isLock: isSubmitting, lockFn: submitForm } = useLockFn(async () => {
    try {
        await saveSecretValue(formData.platformSecret);
    } catch (error) {
        console.error("Failed to set platform secret:", error);
    }
});

const startEditSecret = () => {
    editingSecretValue.value = "";
    isEditingSecret.value = true;
};

const cancelEditSecret = () => {
    isEditingSecret.value = false;
    editingSecretValue.value = "";
};

const { isLock: isSavingSecret, lockFn: saveSecret } = useLockFn(async () => {
    try {
        await saveSecretValue(editingSecretValue.value);
    } catch (error) {
        console.error("Failed to save secret:", error);
    }
});

onMounted(() => getPlatformInfo());
</script>

<template>
    <div class="extension-profiles-container pb-8">
        <div v-if="detailLoading" class="flex h-60 items-center justify-center">
            <UIcon name="i-ph-spinner-gap-bold" class="text-primary size-8 animate-spin" />
        </div>
        <template v-else-if="hasValidPlatformInfo">
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">
                    {{ t("extensions.profiles.platformInfo") }}
                </h3>

                <div class="bg-muted space-y-4 rounded-lg p-4">
                    <UFormField :label="t('extensions.profiles.platformIcon')" :ui="formFieldUi">
                        <UAvatar :src="formData.platformInfo?.websiteIcon" class="size-10" />
                    </UFormField>

                    <UFormField :label="t('extensions.profiles.platformName')" :ui="formFieldUi">
                        <div class="text-sm font-medium">
                            {{ formData.platformInfo?.websiteName }}
                        </div>
                    </UFormField>

                    <UFormField :label="t('extensions.profiles.appCount')" :ui="formFieldUi">
                        <div class="text-muted-foreground text-sm">
                            {{ formData.platformInfo?.appCount }}
                        </div>
                    </UFormField>

                    <UFormField
                        :label="t('extensions.profiles.platformSecret')"
                        :ui="{ root: 'flex items-baseline gap-4', label: 'min-w-20 flex-shrink-0' }"
                    >
                        <div
                            v-if="!isEditingSecret"
                            class="flex flex-1 items-center justify-between gap-4"
                        >
                            <div class="font-mono text-sm">
                                {{
                                    formData.platformSecret || t("extensions.profiles.emptySecret")
                                }}
                            </div>
                            <UButton
                                variant="outline"
                                :disabled="isSavingSecret || detailLoading"
                                @click="startEditSecret"
                            >
                                {{
                                    formData.platformSecret
                                        ? t("extensions.profiles.editSecret")
                                        : t("extensions.profiles.setSecret")
                                }}
                            </UButton>
                        </div>

                        <div v-else class="flex flex-1 flex-col items-start gap-4">
                            <UInput
                                v-model="editingSecretValue"
                                :placeholder="t('extensions.profiles.platformSecretPlaceholder')"
                                class="w-90 flex-1"
                            />
                            <div class="flex gap-3">
                                <UButton
                                    color="primary"
                                    :loading="isSavingSecret"
                                    :disabled="detailLoading"
                                    @click="saveSecret"
                                >
                                    {{ t("extensions.profiles.saveSecret") }}
                                </UButton>
                                <UButton
                                    variant="outline"
                                    :disabled="isSavingSecret || detailLoading"
                                    @click="cancelEditSecret"
                                >
                                    {{ t("extensions.profiles.cancelEdit") }}
                                </UButton>
                            </div>
                        </div>
                    </UFormField>
                </div>
            </div>
        </template>

        <UForm v-else :schema="schema" :state="formData" class="space-y-6" @submit="submitForm">
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">
                    {{ t("extensions.profiles.platformSecret") }}
                </h3>

                <UFormField
                    :label="t('extensions.profiles.platformSecret')"
                    name="platformSecret"
                    :error="
                        formData.platformSecret && !formData.platformInfo
                            ? t('extensions.profiles.secretError')
                            : false
                    "
                >
                    <UInput
                        v-model="formData.platformSecret"
                        :placeholder="t('extensions.profiles.platformSecretPlaceholder')"
                        size="lg"
                        class="w-sm"
                    />
                    <template #help>
                        <div class="space-y-1">
                            <div>
                                {{ t("extensions.profiles.help") }}
                                <a
                                    href="https://www.buildingai.cc"
                                    target="_blank"
                                    class="text-primary hover:underline"
                                >
                                    {{ t("extensions.profiles.howToGetSecret") }}
                                </a>
                            </div>
                        </div>
                    </template>
                </UFormField>
            </div>

            <div class="flex gap-3 pt-4">
                <UButton
                    color="primary"
                    size="lg"
                    type="submit"
                    :loading="isSubmitting"
                    :disabled="detailLoading"
                >
                    {{ t("console-common.save") }}
                </UButton>
                <UButton
                    variant="outline"
                    size="lg"
                    :disabled="isSubmitting || detailLoading"
                    @click="formData.platformSecret = ''"
                >
                    {{ t("console-common.reset") }}
                </UButton>
            </div>
        </UForm>
    </div>
</template>
