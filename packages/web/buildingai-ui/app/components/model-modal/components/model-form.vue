<script lang="ts" setup>
import { apiGetParentModelTypeLimit } from "@buildingai/service/consoleapi/ai-model";
import type {
    CreateAiModelRequest,
    UpdateAiModelRequest,
} from "@buildingai/service/consoleapi/ai-provider";
import { array, boolean, number, object, string } from "yup";

interface ModelConfigItemType {
    /** 参数字段名 */
    field: string;
    /** 参数标题 */
    title: string;
    /** 参数描述 */
    description: string;
    /** 参数值 */
    value: number | null;
    /** 是否启用 */
    enable: boolean;
}

const props = withDefaults(
    defineProps<{
        isEdit?: boolean;
        id?: string;
        initialData?: Record<string, unknown>;
    }>(),
    {
        isEdit: false,
        id: "",
        initialData: () => ({}),
    },
);

const emit = defineEmits<{
    (e: "submit-success", data: CreateAiModelRequest | UpdateAiModelRequest): void;
    (e: "cancel"): void;
}>();

const { query: URLQueryParams } = useRoute();
const { t } = useI18n();

const getDefaultmodelConfig = (): ModelConfigItemType[] => [
    {
        field: "temperature",
        title: t("ai-provider.backend.modelConfig.temperature.title"),
        description: t("ai-provider.backend.modelConfig.temperature.description"),
        value: 1,
        enable: true,
    },
    {
        field: "top_p",
        title: t("ai-provider.backend.modelConfig.top_p.title"),
        description: t("ai-provider.backend.modelConfig.top_p.description"),
        value: 1,
        enable: true,
    },
    {
        field: "max_tokens",
        title: t("ai-provider.backend.modelConfig.max_tokens.title"),
        description: t("ai-provider.backend.modelConfig.max_tokens.description"),
        value: 4096,
        enable: true,
    },
    {
        field: "top_k",
        title: t("ai-provider.backend.modelConfig.top_k.title"),
        description: t("ai-provider.backend.modelConfig.top_k.description"),
        value: 50,
        enable: true,
    },
    {
        field: "frequency_penalty",
        title: t("ai-provider.backend.modelConfig.frequency_penalty.title"),
        description: t("ai-provider.backend.modelConfig.frequency_penalty.description"),
        value: 0,
        enable: true,
    },
    {
        field: "presence_penalty",
        title: t("ai-provider.backend.modelConfig.presence_penalty.title"),
        description: t("ai-provider.backend.modelConfig.presence_penalty.description"),
        value: 0,
        enable: true,
    },
    {
        field: "stop",
        title: t("ai-provider.backend.modelConfig.stop.title"),
        description: t("ai-provider.backend.modelConfig.stop.description"),
        value: null,
        enable: false,
    },
];

const parameterRanges: Record<string, { min: number; max: number; step: number }> = {
    temperature: { min: 0, max: 2, step: 0.1 },
    top_p: { min: 0, max: 1, step: 0.1 },
    max_tokens: { min: 1, max: 2048, step: 1 },
    top_k: { min: 1, max: 100, step: 1 },
    frequency_penalty: { min: 0, max: 2, step: 0.1 },
    presence_penalty: { min: 0, max: 2, step: 0.1 },
};

const formData = reactive({
    name: "",
    providerId: "",
    model: "",
    maxContext: 3 as number,
    modelConfig: getDefaultmodelConfig(),
    isActive: true,
    isDefault: false,
    features: [],
    description: "",
    sortOrder: 0,
    modelType: undefined,
    membershipLevel: [] as string[],
    billingRule: {
        power: 0,
        tokens: 1000,
    },
});
const modelTypes = shallowRef<string[]>([]);

const schema = object({
    name: string()
        .required(t("ai-provider.backend.model.validation.nameRequired"))
        .max(100, t("ai-provider.backend.model.validation.nameMaxLength")),
    model: string()
        .required(t("ai-provider.backend.model.validation.modelRequired"))
        .max(100, t("ai-provider.backend.model.validation.modelMaxLength")),
    maxTokens: number().min(1, t("ai-provider.backend.model.validation.maxTokensMin")).nullable(),
    maxContext: number().min(1, t("ai-provider.backend.model.validation.maxContextMin")).nullable(),
    features: array(),
    description: string()
        .max(500, t("ai-provider.backend.model.validation.descriptionMaxLength"))
        .nullable(),
    isActive: boolean(),
    isDefault: boolean(),
    sortOrder: number().nullable(),
    modelType: string().required(t("ai-provider.backend.model.validation.modelTypeRequired")),
});

const getParentModelTypeLimit = async () => {
    const response = await apiGetParentModelTypeLimit({
        providerId: URLQueryParams.providerId as string,
    });
    modelTypes.value = response;
};

watch(
    () => props.initialData,
    (newData) => {
        if (newData && Object.keys(newData).length > 0) {
            Object.assign(formData, {
                name: newData.name || "",
                providerId: newData.providerId || "",
                model: newData.model || "",
                maxContext: newData.maxContext,
                maxTokens: newData.maxTokens,
                modelConfig: newData.modelConfig,
                isActive: newData.isActive ?? true,
                features: newData.features || [],
                isDefault: newData.isDefault ?? false,
                description: newData.description || "",
                sortOrder: newData.sortOrder || 0,
                modelType: newData.modelType || "",
                membershipLevel: (newData.membershipLevel as string[]) || [],
                billingRule: {
                    power: ((newData.billingRule as Record<string, unknown>)?.power as number) || 0,
                    tokens:
                        ((newData.billingRule as Record<string, unknown>)?.tokens as number) || 0,
                },
            });
        }
    },
    { immediate: true, deep: true },
);

const { isLock: isSubmitting, lockFn: submitForm } = useLockFn(async () => {
    try {
        const submitData: Record<string, unknown> = { ...formData };

        emit("submit-success", submitData as CreateAiModelRequest | UpdateAiModelRequest);
    } catch (error) {
        console.error("Form validation failed:", error);
    }
});

const handleCancel = () => {
    emit("cancel");
};

const isFieldDuplicate = (field: string, currentIndex: number) => {
    if (!formData.modelConfig) return false;
    return formData.modelConfig.some(
        (config: ModelConfigItemType, index: number) =>
            index !== currentIndex && config.field === field && field.trim() !== "",
    );
};

const removeParameter = (index: number) => {
    formData.modelConfig?.splice(index, 1);
};

const addCustomParameter = () => {
    const newParam = {
        field: "",
        title: "",
        description: "",
        value: null,
        enable: true,
    };
    formData.modelConfig?.push(newParam);
};

const featureOptions = computed(() => [
    { label: t("common.ai.audio"), value: "audio" },
    { label: t("common.ai.video"), value: "video" },
    { label: t("common.ai.vision"), value: "vision" },
    { label: t("common.ai.agentThought"), value: "agent-thought", disabled: true },
    { label: t("common.ai.document"), value: "document", disabled: true },
    { label: t("common.ai.multiToolCall"), value: "multi-tool-call", disabled: true },
    { label: t("common.ai.streamToolCall"), value: "stream-tool-call", disabled: true },
    { label: t("common.ai.structuredOutput"), value: "structured-output", disabled: true },
    { label: t("common.ai.toolCall"), value: "tool-call", disabled: true },
]);

onMounted(() => {
    getParentModelTypeLimit();
});
</script>

<template>
    <UForm ref="formRef" :state="formData" :schema="schema" class="space-y-8" @submit="submitForm">
        <BdScrollArea :shadow="false">
            <div class="space-y-4 rounded-lg lg:col-span-2">
                <!-- 默认模型 -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-secondary-foreground text-sm font-medium">
                            {{ t("ai-provider.backend.model.form.isDefault") }}
                        </h4>
                        <p class="text-muted-foreground mt-1 text-xs">
                            {{ t("ai-provider.backend.model.form.setAsDefault") }}
                        </p>
                    </div>
                    <USwitch
                        v-model="formData.isDefault"
                        unchecked-icon="i-lucide-star-off"
                        checked-icon="i-lucide-star"
                        color="warning"
                    />
                </div>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <!-- 模型名称 -->
                    <UFormField
                        :label="t('ai-provider.backend.model.form.name')"
                        name="name"
                        required
                    >
                        <UInput
                            v-model="formData.name"
                            :placeholder="t('ai-provider.backend.model.form.namePlaceholder')"
                            :maxlength="100"
                            class="w-full"
                        />
                        <template #hint>
                            <span class="text-muted-foreground text-xs">
                                {{ t("ai-provider.backend.model.form.nameHelp") }}
                            </span>
                        </template>
                    </UFormField>

                    <!-- 模型标识符 -->
                    <UFormField
                        :label="t('ai-provider.backend.model.form.model')"
                        name="model"
                        required
                    >
                        <UInput
                            v-model="formData.model"
                            :placeholder="t('ai-provider.backend.model.form.modelPlaceholder')"
                            :maxlength="100"
                            class="w-full"
                        />
                    </UFormField>
                </div>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <UFormField
                        :label="t('ai-provider.backend.model.form.maxContext')"
                        name="maxContext"
                    >
                        <UInput
                            v-model.number="formData.maxContext"
                            type="number"
                            :placeholder="t('ai-provider.backend.model.form.maxContextPlaceholder')"
                            :min="1"
                            :ui="{ root: 'w-full', base: 'pr-15' }"
                        >
                            <template #trailing>
                                <span class="text-muted-foreground text-sm">{{
                                    t("ai-provider.backend.model.form.maxContextUnit")
                                }}</span>
                            </template>
                        </UInput>
                        <template #hint>
                            <span class="text-muted-foreground text-xs">
                                {{ t("ai-provider.backend.model.form.maxContextHelp") }}
                            </span>
                        </template>
                    </UFormField>
                    <!-- 模型类型 -->
                    <UFormField
                        :label="t('ai-provider.backend.model.form.modelType')"
                        name="modelType"
                        required
                    >
                        <USelect
                            v-model="formData.modelType"
                            :items="modelTypes"
                            :placeholder="t('ai-provider.backend.model.form.modelTypePlaceholder')"
                            class="w-full"
                        />
                    </UFormField>
                </div>

                <UFormField :label="t('ai-provider.backend.model.form.multimodal')" name="features">
                    <USelectMenu
                        v-model="formData.features"
                        open-on-click
                        multiple
                        :items="featureOptions"
                        value-key="value"
                        :placeholder="t('ai-provider.backend.model.form.multimodalPlaceholder')"
                        class="w-full"
                    />
                </UFormField>

                <!-- 模型描述 -->
                <UFormField
                    :label="t('ai-provider.backend.model.form.description')"
                    name="description"
                >
                    <UTextarea
                        v-model="formData.description"
                        :placeholder="t('ai-provider.backend.model.form.descriptionPlaceholder')"
                        :maxlength="500"
                        :rows="4"
                        class="w-full"
                    />
                </UFormField>

                <div>
                    <h1 class="pb-3 text-[16px] font-bold">
                        {{ t("ai-provider.backend.model.form.billing") }}
                    </h1>
                    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <!-- 计费规则 -->
                        <UFormField
                            :label="t('ai-provider.backend.model.form.billing')"
                            name="billing"
                        >
                            <div class="flex w-full items-center gap-2">
                                <UInput
                                    v-model.number="formData.billingRule.power"
                                    type="number"
                                    placeholder=""
                                    :min="0"
                                    :ui="{ base: 'pr-30' }"
                                    @blur="
                                        if (formData.billingRule.power < 0)
                                            formData.billingRule.power = 0;
                                    "
                                    class="w-full"
                                >
                                    <template #trailing>
                                        <span class="text-muted-foreground text-sm">
                                            {{ t("ai-provider.backend.model.form.power") }}/ 1K
                                            Tokens
                                        </span>
                                    </template>
                                </UInput>
                            </div>
                            <template #hint>
                                <span class="text-muted-foreground text-xs">
                                    {{ t("ai-provider.backend.model.form.billingHelp") }}
                                </span>
                            </template>
                        </UFormField>
                        <UFormField name="membershipLevel" class="flex-1">
                            <template #label>
                                <div class="flex items-center gap-1">
                                    <span>{{
                                        t("ai-provider.backend.model.batchEdit.membershipLevel")
                                    }}</span>
                                    <UPopover mode="hover" :content="{ side: 'top' }">
                                        <UIcon
                                            name="i-lucide-circle-help"
                                            class="text-muted-foreground size-4 cursor-pointer"
                                        />
                                        <template #content>
                                            <p class="w-64 px-4 py-2 text-sm">
                                                {{
                                                    t(
                                                        "ai-provider.backend.model.batchEdit.membershipLevelTip",
                                                    )
                                                }}
                                            </p>
                                        </template>
                                    </UPopover>
                                </div>
                            </template>
                            <MembershipLevelSelect
                                v-model="formData.membershipLevel"
                                :multiple="true"
                                :placeholder="
                                    t('ai-provider.backend.model.batchEdit.membershipLevelAll')
                                "
                                :button-ui="{
                                    variant: 'outline',
                                    class: 'w-full',
                                }"
                            />
                        </UFormField>
                    </div>
                </div>

                <div class="space-y-4">
                    <UAccordion
                        :items="[{}]"
                        :ui="{
                            header: 'px-0 ',
                            label: 'text-[16px] font-semibold',
                            content: 'px-0',
                            body: 'flex flex-col gap-2',
                            trigger: ' !shadow-none',
                        }"
                    >
                        {{ t("ai-provider.backend.modelConfig.title") }}
                        <template #body>
                            <template
                                v-for="(config, index) in formData.modelConfig"
                                :key="`${config.field}-${index}`"
                            >
                                <div class="bg-muted rounded-lg p-4">
                                    <!-- 参数标题和控制 -->
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0 flex-1">
                                            <!-- 预设参数显示 -->
                                            <div v-if="parameterRanges[config.field]">
                                                <h4 class="text-sm font-medium">
                                                    {{ config.title }}
                                                </h4>
                                                <p class="text-muted-foreground mt-1 text-xs">
                                                    {{ config.description }}
                                                </p>
                                            </div>
                                            <!-- 自定义参数编辑 -->
                                            <div v-else class="space-y-2">
                                                <div class="grid grid-cols-1 gap-2">
                                                    <UInput
                                                        v-model="config.field"
                                                        :placeholder="
                                                            t(
                                                                'ai-provider.backend.modelConfig.custom.fieldPlaceholder',
                                                            )
                                                        "
                                                        :class="
                                                            isFieldDuplicate(
                                                                config.field,
                                                                Number(index),
                                                            )
                                                                ? 'border-red-500'
                                                                : ''
                                                        "
                                                        :ui="{ root: 'w-full' }"
                                                    />
                                                    <UInput
                                                        v-model="config.value"
                                                        :placeholder="
                                                            t(
                                                                'ai-provider.backend.modelConfig.custom.valuePlaceholder',
                                                            )
                                                        "
                                                        class="w-full"
                                                    />
                                                </div>

                                                <!-- 重复字段错误提示 -->
                                                <p
                                                    v-if="
                                                        isFieldDuplicate(
                                                            config.field,
                                                            Number(index),
                                                        )
                                                    "
                                                    class="text-xs text-red-500"
                                                >
                                                    {{
                                                        t(
                                                            "ai-provider.backend.modelConfig.validation.duplicateField",
                                                        )
                                                    }}
                                                </p>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2">
                                            <USwitch v-model="config.enable" size="sm" />
                                            <UButton
                                                v-if="!parameterRanges[config.field]"
                                                color="error"
                                                variant="ghost"
                                                size="xs"
                                                icon="i-lucide-trash-2"
                                                @click="removeParameter(Number(index))"
                                            />
                                        </div>
                                    </div>

                                    <div
                                        v-if="config.enable && parameterRanges[config.field]"
                                        class="pt-2"
                                    >
                                        <!-- 预设参数 -->
                                        <!-- 字符串类型参数：stop sequences -->
                                        <UInput
                                            v-if="config.field === 'stop'"
                                            v-model="config.value"
                                            :placeholder="
                                                t(
                                                    'ai-provider.backend.modelConfig.stop.placeholder',
                                                )
                                            "
                                            size="sm"
                                            class="w-full"
                                        />

                                        <UInput
                                            v-else
                                            v-model="config.value"
                                            :placeholder="
                                                t(
                                                    'ai-provider.backend.modelConfig.stop.placeholder',
                                                )
                                            "
                                            size="sm"
                                            class="w-full"
                                            type="number"
                                        />
                                    </div>
                                </div>
                            </template>

                            <!-- 添加参数按钮 -->
                            <div class="flex justify-center pt-4">
                                <UButton
                                    color="primary"
                                    variant="soft"
                                    size="sm"
                                    icon="i-lucide-plus"
                                    @click="addCustomParameter"
                                >
                                    {{ t("ai-provider.backend.modelConfig.addParameter") }}
                                </UButton>
                            </div>
                        </template>
                    </UAccordion>
                </div>
            </div>
        </BdScrollArea>

        <!-- 底部操作按钮 -->
        <div class="bg-background sticky bottom-0 z-10 flex justify-end gap-4 py-3">
            <UButton color="neutral" variant="outline" @click="handleCancel" class="px-8">
                {{ t("console-common.cancel") }}
            </UButton>
            <UButton color="primary" :loading="isSubmitting" type="submit" class="px-8">
                {{ props.isEdit ? t("console-common.update") : t("console-common.create") }}
            </UButton>
        </div>
    </UForm>
</template>
