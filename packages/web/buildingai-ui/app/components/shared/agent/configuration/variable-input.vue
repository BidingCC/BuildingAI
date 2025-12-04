<script lang="ts" setup>
import type { FormFieldConfig } from "@buildingai/service/consoleapi/ai-agent";
import { object, Schema, string } from "yup";

const props = defineProps<{
    formFields: FormFieldConfig[];
    /** 表单字段输入 */
    inputs: Record<string, unknown>;
    /** 表单容器类名 */
    formClass?: string;
}>();
const emit = defineEmits<{
    (e: "update:inputs", value: Record<string, unknown>): void;
}>();

const inputs = useVModel(props, "inputs", emit);
const { t } = useI18n();

const getFieldValue = (fieldName: string): string | undefined => {
    const value = inputs.value[fieldName];
    return typeof value === "string" ? value : undefined;
};

const setFieldValue = (fieldName: string, value: string | undefined) => {
    inputs.value[fieldName] = value;
};

const formSchema = computed(() => {
    const schema: Record<string, Schema> = {};

    props.formFields.forEach((field) => {
        let fieldSchema = string();

        if (field.required) {
            fieldSchema = fieldSchema.required(
                `${field.label}${t("ai-agent.backend.configuration.notEmpty")}`,
            );
        }

        if (field.maxLength && field.maxLength > 0) {
            fieldSchema = fieldSchema.max(
                field.maxLength,
                `${field.label}${t("ai-agent.backend.configuration.maxLengthExceeded", { max: field.maxLength })}`,
            );
        }

        schema[field.name] = fieldSchema;
    });

    return object(schema);
});
</script>

<template>
    <div class="bg-background rounded-lg p-4">
        <UForm :state="inputs" :schema="formSchema" class="space-y-4">
            <!-- 动态渲染表单字段 -->
            <template v-for="field in formFields" :key="field.name">
                <!-- 文本输入 -->
                <UFormField
                    v-if="field.type === 'text'"
                    :name="field.name"
                    :required="field.required"
                >
                    <template #label>
                        <span>{{ field.label }}</span>
                        <span v-if="!field.required" class="text-muted-foreground text-xs">
                            ({{ t("ai-agent.backend.configuration.optional") }})
                        </span>
                    </template>
                    <UInput
                        :model-value="getFieldValue(field.name)"
                        @update:model-value="setFieldValue(field.name, $event)"
                        :placeholder="`${t('console-common.required', { label: field.label })}`"
                        :maxlength="field.maxLength"
                        variant="soft"
                        :ui="{ root: 'w-full', base: formClass }"
                    />
                </UFormField>

                <!-- 多行文本 -->
                <UFormField
                    v-else-if="field.type === 'textarea'"
                    :name="field.name"
                    :required="field.required"
                >
                    <template #label>
                        <span>{{ field.label }}</span>
                        <span v-if="!field.required" class="text-muted-foreground text-xs">
                            ({{ t("ai-agent.backend.configuration.optional") }})
                        </span>
                    </template>
                    <UTextarea
                        :model-value="getFieldValue(field.name)"
                        @update:model-value="setFieldValue(field.name, $event)"
                        :placeholder="`${t('console-common.required', { label: field.label })}`"
                        :maxlength="field.maxLength"
                        :ui="{
                            root: 'w-full bg-muted hover:bg-muted',
                            base: formClass,
                        }"
                        variant="soft"
                        :rows="4"
                    />
                </UFormField>

                <!-- 下拉选择 -->
                <UFormField
                    v-else-if="field.type === 'select'"
                    :name="field.name"
                    :required="field.required"
                >
                    <template #label>
                        <span>{{ field.label }}</span>
                        <span v-if="!field.required" class="text-muted-foreground text-xs">
                            ({{ t("ai-agent.backend.configuration.optional") }})
                        </span>
                    </template>
                    <USelect
                        :model-value="getFieldValue(field.name)"
                        @update:model-value="setFieldValue(field.name, $event)"
                        :items="field.options"
                        :placeholder="`${t('console-common.requiredSelect', { label: field.label })}`"
                        :ui="{ base: `w-full ${formClass}` }"
                        variant="soft"
                    />
                </UFormField>
            </template>
        </UForm>
    </div>
</template>
