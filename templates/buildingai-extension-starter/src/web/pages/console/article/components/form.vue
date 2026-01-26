<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { number, object, string } from "yup";

import type {
    Article,
    CreateArticleParams,
    UpdateArticleParams,
} from "../../../../services/console/article";
import { ArticleStatus } from "../../../../services/console/article";
import { apiGetCategoryList } from "../../../../services/console/category";

const props = withDefaults(
    defineProps<{
        /** 编辑的ID */
        id?: string | number | null;
        /** 初始数据 */
        initialData?: Partial<Article>;
    }>(),
    {
        id: null,
        initialData: () => ({
            status: ArticleStatus.DRAFT,
        }),
    },
);

const emit = defineEmits<{
    (e: "submit", data: CreateArticleParams | UpdateArticleParams): void;
    (e: "cancel"): void;
}>();

const { t } = useI18n();
const message = useMessage();
const formRef = useTemplateRef("formRef");

const formData = reactive<Partial<Article>>(props.initialData || {});
const categoryOptions = ref<{ label: string; value: string }[]>([]);

const schema = object({
    title: string().required(t("article.form.title.required")),
    content: string().required(t("article.form.content.required")),
    summary: string().nullable(),
    status: string().required(t("article.form.status.required")),
    sort: number().nullable(),
    categoryId: string().nullable(),
    cover: string().nullable(),
});

const statusOptions = computed(() => [
    { label: t("article.form.status.draft"), value: ArticleStatus.DRAFT },
    { label: t("article.form.status.published"), value: ArticleStatus.PUBLISHED },
]);

const fetchCategoryOptions = async () => {
    try {
        const result = await apiGetCategoryList();
        categoryOptions.value = result.map((category) => ({
            label: category.name,
            value: category.id,
        }));
    } catch (error) {
        console.error("获取分类列表失败:", error);
        message.error(t("article.messages.fetchCategoriesFailed"));
    }
};

const { isLock, lockFn: submitForm } = useLockFn(async () => {
    if (!formRef.value) return;

    try {
        await formRef.value.validate();

        emit("submit", formData as CreateArticleParams | UpdateArticleParams);
    } catch (error) {
        console.error("表单验证失败:", error);
        message.error(t("article.messages.validationFailed"));
    }
});

onMounted(() => {
    fetchCategoryOptions();
});
</script>

<template>
    <UForm
        ref="formRef"
        :state="formData"
        :schema="schema"
        class="max-w-5xl space-y-6"
        @submit="submitForm"
    >
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div class="space-y-4 lg:col-span-3">
                <h3 class="text-lg font-semibold">
                    {{ t("article.form.sections.articleSettings") }}
                </h3>

                <UFormField :label="t('article.form.title.label')" name="title" required>
                    <UInput
                        v-model="formData.title"
                        :placeholder="t('article.form.title.placeholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField :label="t('article.form.summary.label')" name="summary">
                    <UTextarea
                        :model-value="formData.summary || ''"
                        @update:model-value="formData.summary = $event || undefined"
                        :placeholder="t('article.form.summary.placeholder')"
                        :rows="3"
                        :ui="{ root: 'w-full' }"
                    />
                    <template #help>
                        <span class="text-xs">{{ t("article.form.summary.help") }}</span>
                    </template>
                </UFormField>

                <UFormField :label="t('article.form.content.label')" name="content" required>
                    <BdEditor
                        output-format="markdown"
                        :model-value="(formData.content ?? '') as string"
                        :placeholder="t('article.form.content.placeholder')"
                        @update:model-value="formData.content = $event as string"
                    />
                    <template #help>
                        <span class="text-xs">{{ t("article.form.content.help") }}</span>
                    </template>
                </UFormField>
            </div>

            <div class="space-y-6">
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">
                        {{ t("article.form.sections.publishSettings") }}
                    </h3>

                    <UFormField :label="t('article.form.status.label')" name="status" required>
                        <USelectMenu
                            v-model="formData.status"
                            :items="statusOptions"
                            value-key="value"
                            :placeholder="t('article.form.status.placeholder')"
                            :ui="{ base: 'w-full' }"
                        />
                    </UFormField>

                    <UFormField :label="t('article.form.sort.label')" name="sort">
                        <UInput
                            v-model="formData.sort"
                            type="number"
                            :placeholder="t('article.form.sort.placeholder')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                </div>

                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">
                        {{ t("article.form.sections.category") }}
                    </h3>

                    <UFormField :label="t('article.form.categoryId.label')" name="categoryId">
                        <USelectMenu
                            v-model="formData.categoryId"
                            :items="categoryOptions"
                            value-key="value"
                            :placeholder="t('article.form.categoryId.placeholder')"
                            :ui="{ base: 'w-full' }"
                        />
                    </UFormField>
                </div>

                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">
                        {{ t("article.form.sections.coverImage") }}
                    </h3>

                    <UFormField :label="t('article.form.coverImage.label')" name="cover">
                        <BdUploader
                            v-model="formData.cover"
                            class="h-32 w-full"
                            :text="t('article.form.coverImage.upload')"
                            icon="i-lucide-upload"
                            accept=".jpg,.png,.jpeg,.webp"
                            :maxCount="1"
                            :single="true"
                        />
                        <template #help>
                            <span class="text-xs">{{ t("article.form.coverImage.help") }}</span>
                        </template>
                    </UFormField>
                </div>
            </div>
        </div>

        <div class="bg-background sticky bottom-0 flex justify-end gap-4 py-8">
            <UButton color="primary" size="lg" :loading="isLock" type="submit">
                {{ id ? t("article.buttons.update") : t("article.buttons.create") }}
            </UButton>
            <UButton color="neutral" variant="outline" size="lg" @click="emit('cancel')">
                {{ t("article.buttons.cancel") }}
            </UButton>
        </div>
    </UForm>
</template>
