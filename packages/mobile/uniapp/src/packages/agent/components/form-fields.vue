<script setup lang="ts">
import type { FormFieldConfig } from "@buildingai/service/consoleapi/ai-agent";
import type { UniForms } from "@uni-helper/uni-types";
import { useVModel } from "@vueuse/core";

// @ts-expect-error - uni-data-select component
import UniDataSelect from "@/async-components/uni-data-select/uni-data-select.vue";

const props = defineProps<{
    formFields: FormFieldConfig[];
    modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: Record<string, unknown>];
}>();

const formFieldsInputs = useVModel(props, "modelValue", emit);
const formRef = ref<UniForms>();

const customRules = computed(() => {
    const rules: Record<string, { rules: Array<Record<string, unknown>> }> = {};

    props.formFields.forEach((field) => {
        const fieldRules: Array<Record<string, unknown>> = [];

        if (field.required) {
            fieldRules.push({
                required: true,
                errorMessage: `${field.label}是必填字段`,
            });
        }

        if (field.maxLength && field.maxLength > 0) {
            fieldRules.push({
                maxLength: field.maxLength,
                errorMessage: `${field.label}长度不能超过${field.maxLength}个字符`,
            });
        }

        if (fieldRules.length > 0) {
            rules[field.name] = { rules: fieldRules };
        }
    });

    return rules;
});

const validate = async (): Promise<void> => {
    const form = formRef.value;
    if (!form) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        form.validate((errors: Array<{ errorMessage?: string }> | null) => {
            if (errors && errors.length > 0) {
                const firstError = errors[0];
                reject(new Error(firstError?.errorMessage || "表单验证失败"));
            } else {
                resolve();
            }
        });
    });
};

defineExpose({
    validate,
});

const getFieldOptions = (field: FormFieldConfig): Array<{ text: string; value: string }> => {
    if (!Array.isArray(field.options)) {
        return [];
    }

    const seen = new Set<string>();
    return field.options
        .map((opt: string | { label: string; value: string }) => {
            if (typeof opt === "string") {
                return { text: opt || "未命名", value: opt || "" };
            }
            return {
                text: opt.label || opt.value || "未命名",
                value: opt.value || "",
            };
        })
        .filter((opt) => {
            // 过滤掉空值或重复的值
            if (!opt.value || seen.has(opt.value)) {
                return false;
            }
            seen.add(opt.value);
            return true;
        });
};
</script>

<template>
    <view class="w-full">
        <uni-forms ref="formRef" :rules="customRules" :modelValue="formFieldsInputs">
            <uni-forms-item
                v-for="field in formFields"
                :key="field.name"
                label=""
                :labelWidth="0"
                :name="field.name"
                customClass="mb-3!"
            >
                <view class="text-accent-foreground text-sm">
                    {{ field.label }}
                    <text v-if="field.required" class="text-error">*</text>
                </view>
                <uni-easyinput
                    v-if="field.type === 'text' || field.type === 'textarea'"
                    v-model="formFieldsInputs[field.name]"
                    :placeholder="`请输入${field.label}`"
                    :type="field.type === 'textarea' ? 'textarea' : 'text'"
                    :maxlength="field.maxLength"
                    :customStyles="{ borderRadius: '8rpx' }"
                />
                <UniDataSelect
                    v-else-if="field.type === 'select'"
                    v-model="formFieldsInputs[field.name]"
                    :localdata="getFieldOptions(field)"
                    :placeholder="`请选择${field.label}`"
                    :clear="true"
                />
            </uni-forms-item>
        </uni-forms>
    </view>
</template>
