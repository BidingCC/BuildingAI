<script lang="ts" setup>
import {
    ExtensionSupportTerminal,
    type ExtensionSupportTerminalType,
} from "@buildingai/constants/shared";
import type {
    ExtensionCreateRequest,
    ExtensionUpdateRequest,
} from "@buildingai/service/consoleapi/extensions";
import { apiCreateExtension, apiUpdateExtension } from "@buildingai/service/consoleapi/extensions";
import { object, string } from "yup";

interface ExtensionCreateParams {
    name: string;
    icon: string;
    packName: string;
    description: string;
    version: string;
    type: number;
    alias?: string;
    aliasDescription?: string;
    aliasIcon?: string;
    aliasShow?: boolean;
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

const formData = reactive<ExtensionCreateParams>({
    name: "",
    icon: "",
    packName: "",
    description: "",
    version: "",
    type: 1,
    alias: "",
    aliasDescription: "",
    aliasIcon: "",
    aliasShow: true,
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
            alias: formData.alias,
            aliasDescription: formData.aliasDescription,
            aliasIcon: formData.aliasIcon,
            aliasShow: formData.aliasShow,
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
        return false;
    }
});

onMounted(() => {
    console.log(props.initialData);
    if (!formData.alias) formData.alias = formData.name;
    if (!formData.aliasDescription) formData.aliasDescription = formData.description;
    if (!formData.aliasIcon) formData.aliasIcon = formData.icon;
});
</script>

<template>
    <BdModal
        :title="$t('extensions.modal.editExtension')"
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
                    variant="subtle"
                    :disabled="true"
                    :placeholder="t('extensions.develop.form.nameInput')"
                    size="lg"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <UFormField :label="t('decorate.apps.extensionEdit.displayName')" name="alias">
                <UInput
                    v-model="formData.alias"
                    :placeholder="t('decorate.apps.extensionEdit.displayNamePlaceholder')"
                    size="lg"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <UFormField
                :label="t('extensions.develop.form.description')"
                required
                name="description"
            >
                <UTextarea
                    v-model="formData.aliasDescription"
                    :placeholder="t('extensions.develop.form.descriptionInput')"
                    size="lg"
                    :rows="2"
                    :ui="{ root: 'w-full' }"
                />
            </UFormField>

            <UFormField :label="t('extensions.develop.form.icon')" required name="icon">
                <BdUploader
                    v-model="formData.aliasIcon"
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
                :label="t('decorate.apps.extensionEdit.aliasShowLabel')"
                required
                name="aliasShow"
            >
                <USwitch
                    v-model="formData.aliasShow"
                    :description="t('decorate.apps.extensionEdit.aliasShowDescription')"
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
