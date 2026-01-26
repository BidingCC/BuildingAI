<script lang="ts" setup>
import {
    ExtensionSupportTerminal,
    type ExtensionSupportTerminalType,
} from "@buildingai/constants/shared";
import type {
    ExtensionCreateRequest,
    ExtensionUpdateRequest,
} from "@buildingai/service/consoleapi/extensions";
import {
    apiCheckExtensionIdentifier,
    apiCreateExtension,
    apiUpdateExtension,
} from "@buildingai/service/consoleapi/extensions";
import { object, string } from "yup";

interface ExtensionCreateParams {
    name: string;
    icon: string;
    packName: string;
    description: string;
    version: string;
    type: number;
    supportTerminal: ExtensionSupportTerminalType[];
    author?: {
        avatar?: string;
        name?: string;
        homepage?: string;
    };
}

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const props = withDefaults(
    defineProps<{
        /** 是否编辑模式 */
        isEdit?: boolean;
        /** 编辑的ID */
        id?: string | number | null;
        /** 初始数据 */
        initialData?: Partial<ExtensionCreateParams>;
    }>(),
    {
        isEdit: false,
        id: null,
        initialData: () => ({}),
    },
);

const { t } = useI18n();
const message = useMessage();

const packNameError = shallowRef<boolean | string>(false);
const formData = reactive<ExtensionCreateParams>({
    name: "",
    icon: "",
    packName: "",
    description: "",
    version: "",
    type: 1,
    supportTerminal: [],
    author: {
        avatar: "",
        name: "",
        homepage: "",
    },
    ...props.initialData,
});

const schema = object({
    name: string().required(t("extensions.develop.form.nameRequired")),
    packName: string()
        .required(t("extensions.develop.form.keyRequired"))
        .matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, t("extensions.develop.form.keyFormat")),
    description: string().required(t("extensions.develop.form.descriptionRequired")),
    version: string()
        .required(t("extensions.develop.form.versionRequired"))
        .matches(/^\d+\.\d+\.\d+$/, t("extensions.develop.form.versionFormat")),
});

const resetForm = () => {
    Object.keys(formData).forEach((key) => {
        const formKey = key as keyof ExtensionCreateParams;
        if (typeof formData[formKey] === "string") {
            (formData[formKey] as string) = "";
        }
    });
    // Reset specific fields
    formData.type = 1;
    formData.supportTerminal = [ExtensionSupportTerminal.WEB];
    message.info(t("extensions.develop.messages.formReset"));
};

/**
 * Check if the extension identifier is unique
 * Debounced to avoid excessive API calls during user input
 */
const checkIdentifierUniqueness = useDebounceFn(async (identifier: string) => {
    if (!identifier) {
        packNameError.value = false;
        return true;
    }

    try {
        const { exists } = await apiCheckExtensionIdentifier(
            identifier,
            props.isEdit ? props.id?.toString() : undefined,
        );
        if (exists) {
            message.error(t("extensions.develop.form.keyExists"));
            packNameError.value = t("extensions.develop.form.keyExists");
            return false;
        }
        packNameError.value = false;
        return true;
    } catch (error) {
        console.error("Failed to check identifier uniqueness:", error);
        message.error(t("extensions.develop.messages.checkIdentifierError"));
        return false;
    }
}, 500);

const { isLock, lockFn: submitForm } = useLockFn(async () => {
    try {
        const baseData = {
            name: formData.name,
            identifier: formData.packName,
            description: formData.description,
            version: formData.version,
            icon: formData.icon,
            author: formData.author || {
                avatar: "",
                name: "",
                homepage: "",
            },
            type: formData.type,
            status: 1,
            supportTerminal: formData.supportTerminal.map((terminal) => Number(terminal)),
        };

        if (props.isEdit && props.id) {
            // Update existing extension
            await apiUpdateExtension(props.id.toString(), baseData as ExtensionUpdateRequest);
            message.success(t("extensions.develop.messages.updateSuccess"));
        } else {
            // Create new extension
            await apiCreateExtension(baseData as ExtensionCreateRequest);
            message.success(t("extensions.develop.messages.createSuccess"));
        }

        emits("close", true);

        return true;
    } catch (error) {
        console.error("Failed to submit form:", error);
        message.error(t("extensions.develop.messages.submitError"));
        return false;
    }
});
</script>

<template>
    <BdModal
        :title="$t('extensions.modal.addExtension')"
        :description="$t('extensions.modal.addExtensionDescription')"
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close', false)"
    >
        <UForm
            ref="formRef"
            :state="formData"
            :schema="schema"
            class="w-full space-y-2"
            @submit="submitForm"
        >
            <UFormField :label="t('extensions.develop.form.name')" required name="name">
                <UInput
                    v-model="formData.name"
                    :placeholder="t('extensions.develop.form.nameInput')"
                    size="lg"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <UFormField :label="t('extensions.develop.form.icon')" required name="icon">
                <BdUploader
                    v-model="formData.icon"
                    class="size-20"
                    :text="t('extensions.develop.form.addIcon')"
                    icon="i-lucide-upload"
                    accept=".jpg,.png,.jpeg,.gif"
                    :maxCount="1"
                    :single="true"
                />
                <template #help>
                    <span class="text-xs">
                        {{ t("extensions.develop.form.iconRecommendation") }}
                    </span>
                </template>
            </UFormField>

            <UFormField
                :label="t('extensions.develop.form.packName')"
                required
                name="packName"
                :error="packNameError"
            >
                <UInput
                    v-if="props.isEdit"
                    v-model="formData.packName"
                    :placeholder="t('extensions.develop.form.packNameInput')"
                    size="lg"
                    :disabled="props.isEdit"
                    :ui="{ root: 'w-full' }"
                >
                </UInput>
                <UInput
                    v-else
                    v-model="formData.packName"
                    :placeholder="t('extensions.develop.form.packNameInput')"
                    size="lg"
                    :disabled="props.isEdit"
                    :ui="{ root: 'w-full', base: 'pl-22' }"
                    @update:model-value="checkIdentifierUniqueness(formData.packName)"
                >
                    <template #leading>
                        <span class="text-muted-foreground pl-1 text-sm"> buildingai- </span>
                    </template>
                </UInput>
                <template #help>
                    <span class="text-xs">{{ t("extensions.develop.form.packNameHelp") }}</span>
                </template>
            </UFormField>

            <UFormField
                :label="t('extensions.develop.form.description')"
                required
                name="description"
            >
                <UTextarea
                    v-model="formData.description"
                    :placeholder="t('extensions.develop.form.descriptionInput')"
                    size="lg"
                    :rows="2"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <UFormField :label="t('extensions.develop.form.type')" required name="type">
                <URadioGroup
                    v-model="formData.type"
                    :items="[
                        {
                            label: $t('extensions.modal.extensionTypes.application'),
                            value: 1,
                        },
                        { label: $t('extensions.modal.extensionTypes.function'), value: 2 },
                    ]"
                    :ui="{ fieldset: 'flex flex-row gap-2' }"
                />
                <template #help>
                    <span class="text-xs">{{ t("extensions.develop.form.typeHelp") }}</span>
                </template>
            </UFormField>

            <UFormField
                :label="t('extensions.develop.form.supportTerminal')"
                required
                name="supportTerminal"
            >
                <UCheckboxGroup
                    v-model="formData.supportTerminal"
                    :items="[
                        {
                            label: $t('extensions.modal.terminalTypes.web'),
                            value: ExtensionSupportTerminal.WEB.toString(),
                        },
                        {
                            label: $t('extensions.modal.terminalTypes.weixin'),
                            value: ExtensionSupportTerminal.WEIXIN.toString(),
                            disabled: true,
                        },
                        {
                            label: $t('extensions.modal.terminalTypes.h5'),
                            value: ExtensionSupportTerminal.H5.toString(),
                            disabled: true,
                        },
                        {
                            label: $t('extensions.modal.terminalTypes.mp'),
                            value: ExtensionSupportTerminal.MP.toString(),
                            disabled: true,
                        },
                        {
                            label: $t('extensions.modal.terminalTypes.api'),
                            value: ExtensionSupportTerminal.API.toString(),
                        },
                    ]"
                    :ui="{ fieldset: 'flex flex-row gap-2' }"
                />
                <template #help>
                    <span class="text-xs">
                        {{ t("extensions.develop.form.supportTerminalHelp") }}
                    </span>
                </template>
            </UFormField>

            <UFormField :label="t('extensions.develop.form.version')" required name="version">
                <div class="flex items-center gap-2">
                    <UInput
                        v-model="formData.version"
                        placeholder="0"
                        length="3"
                        :ui="{ root: 'w-full', base: 'pl-18' }"
                    >
                        <template #leading>
                            <span class="text-muted-foreground pl-1 text-sm"> Version </span>
                        </template>
                    </UInput>
                </div>
                <template #help>
                    <span class="text-xs">
                        {{ t("extensions.develop.form.versionHelp") }}
                    </span>
                </template>
            </UFormField>

            <UFormField :label="t('extensions.develop.form.authorName')" name="author.name">
                <UInput
                    v-model="formData.author!.name"
                    :placeholder="t('extensions.develop.form.authorNameInput')"
                    size="lg"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <div class="flex justify-end gap-4 pt-8">
                <UButton color="neutral" variant="outline" size="lg" @click="emits('close', false)">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="neutral" size="lg" @click="resetForm">
                    {{ t("console-common.reset") }}
                </UButton>
                <UButton color="primary" size="lg" :loading="isLock" type="submit">
                    {{ props.isEdit ? t("console-common.update") : t("console-common.create") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
