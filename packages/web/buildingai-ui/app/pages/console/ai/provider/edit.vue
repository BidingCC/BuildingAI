<script setup lang="ts">
import type {
    AiProviderInfo,
    CreateAiProviderRequest,
    ModelType,
} from "@buildingai/service/consoleapi/ai-provider";
import {
    apiCreateAiProvider,
    apiGetAiProviderDetail,
    apiGetAiProviderModelTypes,
    apiUpdateAiProvider,
} from "@buildingai/service/consoleapi/ai-provider";
import { array, object, string } from "yup";

const props = defineProps<{
    id?: string | null;
}>();
const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const providerId = computed(() => props.id || (route.query.id as string) || null);

const { t } = useI18n();
const toast = useMessage();
const route = useRoute();
const router = useRouter();

const modelTypes = shallowRef<string[]>([]);
const allModelTypes = shallowRef<ModelType[]>([]);

const detail = ref<AiProviderInfo | null>(null);

const formRef = useTemplateRef<{ validate: () => Promise<boolean> } | null>("formRef");
const formData = shallowReactive<CreateAiProviderRequest>({
    provider: "",
    name: "",
    bindSecretId: "",
    websiteUrl: "",
    iconUrl: "",
    description: "",
    isActive: true,
    sortOrder: 0,
    supportedModelTypes: [],
});

// 表单验证规则
const providerSchema = object({
    provider: string().required(t("ai-provider.backend.form.providerRequired")),
    name: string().required(t("ai-provider.backend.form.nameRequired")),
    bindSecretId: string().required(t("ai-provider.backend.form.apiKeyRequired")),
    supportedModelTypes: array().min(1, t("ai-provider.backend.form.supportedModelTypesRequired")),
});

//获取所有模型类型
const { data: modelTypesData } = await useAsyncData("model-types", () =>
    apiGetAiProviderModelTypes(),
);
allModelTypes.value = modelTypesData.value || [];

// 获取供应商详情
const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        const data: AiProviderInfo = await apiGetAiProviderDetail(providerId.value as string);
        detail.value = data;

        modelTypes.value = data.supportedModelTypes;
        useFormData(formData, data);
    } catch (error) {
        console.error("获取供应商详情失败:", error);
    }
});

const isActiveString = computed({
    get: () => String(formData.isActive),
    set: (value: string) => {
        formData.isActive = value === "true";
    },
});

function goToApiKeyManage() {
    router.push({
        path: useRoutePath("secret:list"),
    });
    emits("close");
}

/**
 * 选择密钥池后触发表单整体验证
 * 解决首次选择值后错误提示没有及时消失的问题
 */
function onKeyPoolChange() {
    // 这里整体校验，保持与其他表单使用方式一致
    formRef.value?.validate?.();
}

// 提交表单
const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        if (providerId.value) {
            await apiUpdateAiProvider(providerId.value, formData);
            toast.success(t("console-common.messages.success"));
        } else {
            await apiCreateAiProvider(formData);
            toast.success(t("console-common.messages.success"));
        }
        emits("close", true);
    } catch (error) {
        console.error("提交失败:", error);
    }
});

onMounted(async () => providerId.value && (await fetchDetail()));
</script>

<template>
    <BdModal
        :title="providerId ? t('ai-provider.backend.editTitle') : t('ai-provider.backend.addTitle')"
        :description="
            providerId
                ? t('ai-provider.backend.form.editDescription')
                : t('ai-provider.backend.form.addDescription')
        "
        :ui="{
            content: 'max-w-2xl',
        }"
        @close="emits('close')"
    >
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 400px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <UForm v-else ref="formRef" :state="formData" :schema="providerSchema" @submit="submitForm">
            <!-- 基本信息 -->
            <div class="pb-2">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <UFormField
                        :label="t('ai-provider.backend.form.provider')"
                        name="provider"
                        required
                    >
                        <UInput
                            :disabled="detail?.isBuiltIn"
                            v-model="formData.provider"
                            :placeholder="t('ai-provider.backend.form.providerPlaceholder')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>

                    <UFormField :label="t('ai-provider.backend.form.name')" name="name" required>
                        <UInput
                            v-model="formData.name"
                            :placeholder="t('ai-provider.backend.form.namePlaceholder')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>

                    <UFormField :label="t('ai-provider.backend.form.iconUrl')" name="iconUrl">
                        <BdUploader
                            v-model="formData.iconUrl"
                            class="h-24 w-24"
                            :text="t('console-common.uploadIcon')"
                            icon="i-lucide-upload"
                            accept=".jpg,.png,.svg,.ico"
                            :maxCount="1"
                            :single="true"
                            :multiple="false"
                        />
                    </UFormField>

                    <div class="space-y-4">
                        <UFormField
                            :label="t('ai-provider.backend.form.websiteUrl')"
                            name="websiteUrl"
                        >
                            <UInput
                                v-model="formData.websiteUrl"
                                :placeholder="t('ai-provider.backend.form.websiteUrlPlaceholder')"
                                :ui="{ root: 'w-full' }"
                            />
                        </UFormField>

                        <UFormField
                            :label="t('ai-provider.backend.form.sortOrder')"
                            name="sortOrder"
                        >
                            <UInput
                                v-model="formData.sortOrder"
                                type="number"
                                :placeholder="t('ai-provider.backend.form.sortOrderPlaceholder')"
                                :ui="{ root: 'w-full' }"
                            />
                        </UFormField>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2">
                <div class="space-y-4">
                    <!-- API 配置 -->
                    <UFormField label="API 配置" name="bindSecretId" required>
                        <template #hint>
                            <UButton
                                variant="link"
                                class="cursor-pointer gap-0"
                                trailing-icon="i-lucide-arrow-right"
                                :ui="{ trailingIcon: 'size-4', base: 'p-0' }"
                                @click="goToApiKeyManage()"
                            >
                                {{ t("ai-provider.backend.form.goToApiKeyManage") }}
                            </UButton>
                        </template>
                        <KeyPoolSelect
                            v-model="formData.bindSecretId"
                            :button-ui="{
                                variant: 'outline',
                                color: 'neutral',
                                ui: { base: 'w-full' },
                                class: 'bg-background',
                            }"
                            @change="onKeyPoolChange"
                        />
                    </UFormField>
                </div>
                <UFormField :label="t('ai-provider.backend.form.isActive')" name="isActive">
                    <div class="flex h-8 items-center">
                        <URadioGroup
                            class="my-2"
                            v-model="isActiveString"
                            :items="[
                                {
                                    label: t('ai-provider.backend.form.isActiveEnabled'),
                                    value: 'true',
                                },
                                {
                                    label: t('ai-provider.backend.form.isActiveDisabled'),
                                    value: 'false',
                                },
                            ]"
                            orientation="horizontal"
                            color="primary"
                        />
                    </div>
                </UFormField>
            </div>

            <!-- 模型类型 -->
            <UFormField
                :label="t('ai-provider.backend.form.modelType')"
                name="supportedModelTypes"
                required
            >
                <UInputMenu
                    :disabled="detail?.isBuiltIn"
                    v-model="formData.supportedModelTypes"
                    open-on-click
                    multiple
                    value-key="value"
                    :items="allModelTypes"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <!-- 描述 -->
            <div class="pb-2">
                <UFormField :label="t('ai-provider.backend.form.description')" name="description">
                    <UTextarea
                        v-model="formData.description"
                        :placeholder="t('ai-provider.backend.form.descriptionPlaceholder')"
                        :rows="3"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
            </div>

            <!-- 操作按钮 -->
            <div class="bottom-0 z-10 flex justify-end gap-2 pt-4">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close')">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" type="submit" :loading="isLock">
                    {{ providerId ? t("console-common.update") : t("console-common.create") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
