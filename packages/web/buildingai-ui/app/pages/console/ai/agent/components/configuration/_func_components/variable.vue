<script setup lang="ts">
import type { FormFieldConfig } from "@buildingai/service/consoleapi/ai-agent";
import Draggable from "vuedraggable";
import { boolean, object, string } from "yup";

const props = defineProps<{
    modelValue: FormFieldConfig[];
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: FormFieldConfig[]): void;
}>();

const variable = useVModel(props, "modelValue", emit);

const { t } = useI18n();
const isOpen = shallowRef<boolean>(false);
const isEdit = shallowRef<boolean>(false);
const editingIndex = shallowRef<number>(-1);

const defaultState: FormFieldConfig = {
    name: "",
    label: "",
    type: "text",
    required: false,
    maxLength: undefined,
    options: [],
};

const state = ref<FormFieldConfig & { maxLength?: string }>({
    ...defaultState,
    maxLength: undefined,
});

const formSchema = object({
    name: string()
        .required(t("ai-agent.backend.configuration.formVariableNameEmpty"))
        .matches(/^[a-zA-Z0-9_]+$/, t("ai-agent.backend.configuration.formVariableNameInvalid")),
    label: string().required(t("ai-agent.backend.configuration.formVariableLabelEmpty")),
    type: string()
        .required(t("ai-agent.backend.configuration.formVariableTypeEmpty"))
        .oneOf(["text", "textarea", "select"]),
    required: boolean().optional(),
    maxLength: string()
        .optional()
        .test(
            "is-positive-number",
            t("ai-agent.backend.configuration.formVariableMaxLengthInvalid"),
            (value) => {
                if (!value) return true; // 允许为空
                const num = Number(value);
                return !isNaN(num) && num > 0;
            },
        ),
});

const showOptions = computed(() => state.value.type === "select");

const submitForm = async () => {
    try {
        const existingField = variable.value.find(
            (field, index) => field.name === state.value.name && index !== editingIndex.value,
        );
        if (existingField) {
            useMessage().error(t("ai-agent.backend.configuration.formVariableNameExists"));
            return;
        }

        // 准备提交的数据，转换 maxLength 为数字类型
        const submitData: FormFieldConfig = {
            ...state.value,
            maxLength: state.value.maxLength ? Number(state.value.maxLength) : undefined,
        };

        if (isEdit.value && editingIndex.value >= 0) {
            variable.value[editingIndex.value] = submitData;
        } else {
            variable.value.push(submitData);
        }

        handleClose();
    } catch (error) {
        console.error("operation failed:", error);
    }
};

const addOption = () => {
    if (!state.value.options) {
        state.value.options = [];
    }
    state.value.options.push("");
};

const removeOption = (index: number) => {
    state.value.options?.splice(index, 1);
};

const openModal = () => {
    isEdit.value = false;
    editingIndex.value = -1;
    isOpen.value = true;
};

const openEditModal = (index: number) => {
    isEdit.value = true;
    editingIndex.value = index;
    const field = variable.value[index];
    if (field) {
        state.value = {
            ...JSON.parse(JSON.stringify(field)),
            maxLength: field.maxLength ? String(field.maxLength) : undefined,
        };
        isOpen.value = true;
    }
};

const resetState = () => {
    state.value = {
        ...defaultState,
        maxLength: undefined,
    };
};

const handleClose = () => {
    isOpen.value = false;
    isEdit.value = false;
    resetState();
    editingIndex.value = -1;
};

const removeVariable = (index: number) => {
    variable.value.splice(index, 1);
};
</script>

<template>
    <div>
        <div class="bg-muted rounded-lg p-3">
            <div class="flex items-center justify-between">
                <div class="text-foreground flex items-center gap-1 text-sm font-medium">
                    {{ $t("ai-agent.backend.configuration.formVariable") }}
                    <UTooltip :delay-duration="0" :ui="{ content: 'w-xs h-auto' }">
                        <UIcon name="i-lucide-circle-help" />

                        <template #content>
                            <div class="text-background text-xs">
                                {{ $t("ai-agent.backend.configuration.formVariableDesc") }}
                                <br />
                                {{ $t("ai-agent.backend.configuration.formVariableDesc2") }}
                            </div>
                        </template>
                    </UTooltip>
                </div>

                <UButton
                    size="sm"
                    color="primary"
                    variant="ghost"
                    class="flex items-center"
                    @click="openModal"
                >
                    <UIcon name="i-lucide-plus" />
                    <span>{{ $t("console-common.add") }}</span>
                </UButton>
            </div>

            <div class="space-y-3">
                <Draggable
                    v-model="variable"
                    class="draggable"
                    animation="300"
                    handle=".drag-handle"
                    itemKey="name"
                >
                    <template #item="{ element: item, index }">
                        <div
                            class="group bg-background mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
                        >
                            <UIcon
                                name="i-lucide-grip-vertical"
                                class="drag-handle text-muted-foreground cursor-move"
                            />
                            <div class="flex flex-1 items-center gap-2">
                                <span class="text-foreground text-sm font-medium">{{
                                    item.label
                                }}</span>
                                <span class="text-muted-foreground font-mono text-xs">{{
                                    item.name
                                }}</span>
                            </div>

                            <div class="block group-hover:hidden">
                                <UBadge
                                    v-if="item.required"
                                    color="error"
                                    variant="outline"
                                    size="sm"
                                >
                                    {{ $t("ai-agent.backend.configuration.required") }}
                                </UBadge>
                                <UBadge color="neutral" variant="outline" size="sm" class="ml-1">
                                    {{ item.type }}
                                </UBadge>
                            </div>
                            <div class="hidden items-center group-hover:flex">
                                <UButton
                                    size="xs"
                                    color="primary"
                                    variant="ghost"
                                    icon="i-lucide-edit"
                                    @click="openEditModal(index)"
                                />
                                <UButton
                                    size="xs"
                                    color="error"
                                    variant="ghost"
                                    icon="i-lucide-trash"
                                    @click="removeVariable(index)"
                                />
                            </div>
                        </div>
                    </template>
                </Draggable>
            </div>
        </div>

        <!-- 添加变量弹窗 -->
        <BdModal
            v-model:open="isOpen"
            :title="
                isEdit
                    ? $t('ai-agent.backend.configuration.formVariableEditTitle')
                    : $t('ai-agent.backend.configuration.formVariableAddTitle')
            "
            :description="t('ai-agent.backend.configuration.formVariableTitleDesc')"
            :ui="{ content: 'max-w-md' }"
            @close="handleClose"
        >
            <UForm :state="state" :schema="formSchema" class="space-y-4" @submit="submitForm">
                <UFormField
                    :label="t('ai-agent.backend.configuration.formVariableType')"
                    name="type"
                    required
                >
                    <div class="flex items-center gap-2">
                        <UCheckbox
                            :model-value="state.type === 'text'"
                            indicator="end"
                            variant="card"
                            default-value
                            :label="t('ai-agent.backend.configuration.formVariableTypeText')"
                            :ui="{ root: 'w-full' }"
                            @update:model-value="state.type = 'text'"
                        />
                        <UCheckbox
                            :model-value="state.type === 'textarea'"
                            indicator="end"
                            variant="card"
                            default-value
                            :label="t('ai-agent.backend.configuration.formVariableTypeTextarea')"
                            :ui="{ root: 'w-full' }"
                            @update:model-value="state.type = 'textarea'"
                        />
                        <UCheckbox
                            :model-value="state.type === 'select'"
                            indicator="end"
                            variant="card"
                            default-value
                            :label="t('ai-agent.backend.configuration.formVariableTypeSelect')"
                            :ui="{ root: 'w-full' }"
                            @update:model-value="state.type = 'select'"
                        />
                    </div>
                </UFormField>

                <UFormField
                    :label="t('ai-agent.backend.configuration.formVariableName')"
                    name="name"
                    required
                >
                    <UInput
                        v-model="state.name"
                        :placeholder="
                            t('ai-agent.backend.configuration.formVariableNamePlaceholder')
                        "
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField
                    :label="t('ai-agent.backend.configuration.formVariableLabel')"
                    name="label"
                    required
                >
                    <UInput
                        v-model="state.label"
                        :placeholder="
                            t('ai-agent.backend.configuration.formVariableLabelPlaceholder')
                        "
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField
                    :label="t('ai-agent.backend.configuration.formVariableMaxLength')"
                    name="maxLength"
                >
                    <UInput
                        v-model="state.maxLength"
                        type="number"
                        :placeholder="
                            t('ai-agent.backend.configuration.formVariableMaxLengthPlaceholder')
                        "
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <!-- 选项配置（仅当类型为select时显示） -->
                <div v-if="showOptions" class="space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium">{{
                            $t("ai-agent.backend.configuration.formVariableOptions")
                        }}</label>
                        <UButton size="xs" color="primary" variant="ghost" @click="addOption">
                            <UIcon name="i-lucide-plus" />
                            {{ $t("ai-agent.backend.configuration.formVariableOptionsAdd") }}
                        </UButton>
                    </div>

                    <div class="space-y-2" v-if="state.options?.length">
                        <Draggable
                            class="draggable cursor-move"
                            v-model="state.options"
                            animation="300"
                            handle=".drag-move"
                            itemKey="id"
                        >
                            <template v-slot:item="{ index }">
                                <div class="mt-2 flex items-center gap-2">
                                    <UInput
                                        icon="i-lucide-grip-vertical"
                                        v-model="state.options[index]"
                                        :placeholder="
                                            t(
                                                'ai-agent.backend.configuration.formVariableOptionsLabel',
                                            )
                                        "
                                        :ui="{ root: 'flex-1', leadingIcon: 'drag-move' }"
                                    />
                                    <UButton
                                        size="xs"
                                        color="error"
                                        variant="ghost"
                                        icon="i-lucide-trash"
                                        @click="removeOption(index)"
                                    />
                                </div>
                            </template>
                        </Draggable>
                    </div>
                </div>

                <UFormField label=" " name="required">
                    <UCheckbox
                        v-model="state.required"
                        :label="t('ai-agent.backend.configuration.required')"
                    />
                </UFormField>

                <div class="mt-6 flex justify-end gap-2">
                    <UButton color="neutral" variant="soft" size="lg" @click="handleClose">
                        {{ $t("console-common.cancel") }}
                    </UButton>
                    <UButton color="primary" size="lg" type="submit">
                        {{ $t("console-common.save") }}
                    </UButton>
                </div>
            </UForm>
        </BdModal>
    </div>
</template>
