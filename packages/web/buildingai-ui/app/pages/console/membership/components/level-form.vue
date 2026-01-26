<!-- eslint-disable @typescript-eslint/no-unused-vars -->

<script lang="ts" setup>
import type { Benefit, LevelCreateRequest } from "@buildingai/service/consoleapi/membership-level";
import { number, object, string } from "yup";

const props = defineProps<{
    /** 等级 ID，编辑时传入 */
    id?: string | null;
    /** 初始表单数据 */
    initialData?: Partial<LevelCreateRequest>;
}>();

const emit = defineEmits<{
    "submit-success": [data: LevelCreateRequest];
}>();

/** 是否为编辑模式 */
const isEditMode = computed(() => !!props.id);

/** 默认表单数据 */
const defaultFormData: Partial<LevelCreateRequest> = {
    name: "",
    level: undefined,
    icon: "",
    givePower: undefined,
    description: "",
    benefits: [],
};

/** 表单数据 */
const formData = ref<Partial<LevelCreateRequest>>({ ...defaultFormData });

/**
 * 监听初始数据变化，用于编辑模式下填充表单
 */
watch(
    () => props.initialData,
    (newData) => {
        if (newData && Object.keys(newData).length > 0) {
            formData.value = { ...defaultFormData, ...newData };
        }
    },
    { immediate: true, deep: true },
);

/**
 * 添加一条会员权益
 */
const addBenefit = () => {
    if (!formData.value.benefits) {
        formData.value.benefits = [];
    }
    formData.value.benefits = [...formData.value.benefits, { icon: "", content: "" }];
};

/**
 * 删除一条会员权益
 * @param index 要删除的权益索引
 */
const removeBenefit = (index: number) => {
    formData.value.benefits = formData.value.benefits?.filter((_, i) => i !== index);
};

/**
 * 表单验证规则
 */
const schema = object({
    name: string().required($t("membership.console-membership.level.form.nameRequired")),
    level: number().required($t("membership.console-membership.level.form.levelRequired")),
    icon: string().required($t("membership.console-membership.level.form.iconRequired")),
});

const itemSchema = object({
    content: string().required(
        $t("membership.console-membership.level.form.benefit.contentRequired"),
    ),
});

/**
 * 更新指定索引的权益项
 * @param index 权益索引
 * @param field 要更新的字段
 * @param value 新值
 */
const updateBenefit = (index: number, field: keyof Benefit, value: string | string[]) => {
    if (!formData.value.benefits) return;
    const newBenefits = [...formData.value.benefits];
    const newValue = Array.isArray(value) ? value[0] || "" : value;
    newBenefits[index] = {
        icon: newBenefits[index]?.icon || "",
        content: newBenefits[index]?.content || "",
        [field]: newValue,
    };
    formData.value.benefits = newBenefits;
};

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        emit("submit-success", formData.value as LevelCreateRequest);
    } catch (error) {
        console.error("Update level failed:", error);
    }
});
</script>

<template>
    <div class="flex-1">
        <UForm
            :state="formData"
            :schema="schema"
            class="flex h-full flex-col space-y-4 sm:w-sm"
            @submit="submitForm"
        >
            <UFormField
                :label="$t('membership.console-membership.level.form.labelName')"
                name="name"
                required
            >
                <UInput
                    class="w-full"
                    v-model="formData.name"
                    :placeholder="
                        $t('membership.console-membership.level.form.labelNamePlaceholder')
                    "
                />
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.level.form.labelLevel')"
                name="level"
                required
            >
                <template #hint>
                    <div class="text-xs">
                        {{ $t("membership.console-membership.level.form.levelHint") }}
                    </div>
                </template>
                <UInput
                    class="w-full"
                    type="number"
                    :min="1"
                    v-model="formData.level"
                    :placeholder="
                        $t('membership.console-membership.level.form.labelLevelPlaceholder')
                    "
                >
                    <template #trailing>
                        <span class="text-muted-foreground text-sm"> 级 </span>
                    </template>
                </UInput>
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.level.form.labelIcon')"
                name="icon"
                required
            >
                <BdUploader
                    v-model="formData.icon"
                    class="h-24 w-24"
                    :text="$t('membership.console-membership.level.form.uploadIcon')"
                    icon="i-lucide-upload"
                    accept=".jpg,.png,.ico"
                    :maxCount="1"
                    :single="true"
                />
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.level.form.labelGivePower')"
                name="givePower"
            >
                <UInput
                    class="w-full"
                    type="number"
                    v-model="formData.givePower"
                    :placeholder="
                        $t('membership.console-membership.level.form.labelGivePowerPlaceholder')
                    "
                />
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.level.form.labelDescription')"
                name="description"
            >
                <UTextarea
                    class="w-full"
                    v-model="formData.description"
                    autoresize
                    :maxrows="10"
                    :placeholder="
                        $t('membership.console-membership.level.form.labelDescriptionPlaceholder')
                    "
                />
            </UFormField>

            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">
                        {{ $t("membership.console-membership.level.form.labelBenefits") }}
                    </h3>
                    <UButton
                        icon="i-lucide-plus"
                        variant="soft"
                        color="primary"
                        size="sm"
                        @click="addBenefit"
                    >
                        {{ $t("console-common.add") }}
                    </UButton>
                </div>
            </div>

            <div class="space-y-4">
                <UForm
                    v-for="(benefit, index) in formData.benefits"
                    :key="index"
                    :state="benefit"
                    :schema="itemSchema"
                    attach
                    class="flex items-start gap-3"
                >
                    <UFormField name="icon">
                        <BdUploader
                            :model-value="benefit.icon"
                            @update:model-value="(val) => updateBenefit(index, 'icon', val)"
                            class="h-8 w-8"
                            :text="$t('membership.console-membership.level.form.benefit.icon')"
                            icon=" "
                            accept=".jpg,.png,.ico"
                            :maxCount="1"
                            :single="true"
                            :showPreviewButton="false"
                            :showRemoveButton="false"
                        >
                            <template #trailing>
                                <UIcon name="i-lucide-upload" class="size-5 cursor-pointer" />
                            </template>
                            <template #file-item="{ item }">
                                <div class="group relative size-full">
                                    <img
                                        :src="item.url"
                                        :alt="item.name"
                                        class="size-full rounded object-cover"
                                    />
                                    <div
                                        class="absolute -top-1 -right-1 z-10 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-600"
                                        @click.stop="updateBenefit(index, 'icon', '')"
                                    >
                                        <UIcon name="i-lucide-x" class="size-3" />
                                    </div>
                                </div>
                            </template>
                        </BdUploader>
                    </UFormField>
                    <UFormField name="content" class="w-full">
                        <UInput
                            :model-value="benefit.content"
                            @update:model-value="(val) => updateBenefit(index, 'content', val)"
                            :placeholder="
                                $t('membership.console-membership.level.form.benefit.content')
                            "
                            class="w-full"
                        />
                    </UFormField>
                    <UButton
                        variant="soft"
                        color="error"
                        size="sm"
                        class="mt-1"
                        @click="removeBenefit(index)"
                    >
                        <UIcon name="i-lucide-trash-2" class="size-4" />
                    </UButton>
                </UForm>
            </div>

            <!-- 操作按钮 -->
            <div class="bg-background sticky bottom-0 flex gap-3 py-4">
                <AccessControl :codes="isEditMode ? ['levels:update'] : ['levels:create']">
                    <UButton color="primary" size="lg" type="submit" :loading="isLock">
                        {{ isEditMode ? $t("console-common.save") : $t("console-common.create") }}
                    </UButton>
                </AccessControl>
            </div>
        </UForm>
    </div>
</template>
