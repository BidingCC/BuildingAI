<script setup lang="ts">
import { object, string } from "yup";

import type {
    CreateCategoryParams,
    UpdateCategoryParams,
} from "../../../services/console/category";
import {
    apiCreateCategory,
    apiGetCategory,
    apiUpdateCategory,
} from "../../../services/console/category";

const props = defineProps<{ id: string | null }>();

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const { t } = useI18n();

const columnSchema = object({
    name: string().required(t("column.edit.form.name.required")),
});

const formData = ref<CreateCategoryParams | UpdateCategoryParams>({
    name: "",
    description: "",
    sort: 0,
});

const { lockFn: getDetails, isLock: loading } = useLockFn(async () => {
    if (!props.id) return;
    try {
        const data = await apiGetCategory(props.id);
        formData.value = {
            name: data.name,
            description: data.description || "",
            sort: data.sort || 0,
        };
    } catch (error) {
        console.error("获取详情失败:", error);
    }
});

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        if (props.id) {
            await apiUpdateCategory(props.id, formData.value as UpdateCategoryParams);
        } else {
            await apiCreateCategory(formData.value as CreateCategoryParams);
        }
        useMessage().success(
            props.id
                ? t("column.edit.messages.updateSuccess")
                : t("column.edit.messages.createSuccess"),
        );
        emits("close", true);
    } catch (error) {
        console.error("提交失败:", error);
        useMessage().error(
            props.id
                ? t("column.edit.messages.updateFailed")
                : t("column.edit.messages.createFailed"),
        );
    }
});

onMounted(() => {
    getDetails();
});
</script>

<template>
    <BdModal
        :title="id ? t('column.edit.title.edit') : t('column.edit.title.create')"
        :description="id ? t('column.edit.description.edit') : t('column.edit.description.create')"
        :ui="{ content: 'w-md' }"
        @close="emits('close')"
    >
        <div v-if="loading" class="flex items-center justify-center" style="padding: 100px 0">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <UForm
            v-else
            :state="formData"
            :schema="columnSchema"
            class="space-y-2"
            @submit="submitForm"
        >
            <div class="space-y-4">
                <UFormField :label="t('column.edit.form.name.label')" name="name" required>
                    <UInput
                        v-model="formData.name"
                        :placeholder="t('column.edit.form.name.placeholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField :label="t('column.edit.form.description.label')" name="description">
                    <UTextarea
                        :model-value="formData.description || ''"
                        @update:model-value="formData.description = $event || undefined"
                        :placeholder="t('column.edit.form.description.placeholder')"
                        :rows="3"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField :label="t('column.edit.form.sort.label')" name="sort">
                    <UInput
                        v-model="formData.sort"
                        type="number"
                        :placeholder="t('column.edit.form.sort.placeholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
            </div>

            <div class="mt-6 flex justify-end gap-3">
                <UButton
                    color="neutral"
                    variant="outline"
                    :label="t('column.edit.buttons.cancel')"
                    @click="emits('close')"
                />
                <UButton
                    type="submit"
                    color="primary"
                    :loading="isLock"
                    :label="
                        isLock ? t('column.edit.buttons.saving') : t('column.edit.buttons.save')
                    "
                />
            </div>
        </UForm>
    </BdModal>
</template>
