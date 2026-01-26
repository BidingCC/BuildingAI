<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";

import type { Article, UpdateArticleParams } from "../../../services/console/article";
import { apiGetArticle, apiUpdateArticle, ArticleStatus } from "../../../services/console/article";

const ArticleForm = defineAsyncComponent(() => import("./components/form.vue"));

const { query: URLQueryParams } = useRoute();
const router = useRouter();
const message = useMessage();
const { t } = useI18n();

const formData = reactive<Partial<Article>>({
    title: "",
    content: "",
    summary: "",
    cover: "",
    status: ArticleStatus.DRAFT,
    sort: 0,
    categoryId: undefined,
});

const id = URLQueryParams.id as unknown as string;

const { lockFn: fetchDetail, isLock } = useLockFn(async () => {
    if (!URLQueryParams.id) return;
    try {
        const data = await apiGetArticle(id);
        useFormData<Partial<Article>, Article>(formData, data);
    } catch (error) {
        console.error("获取详情失败:", error);
        message.error(t("article.edit.messages.fetchDetailFailed"));
    }
});

const { lockFn: handleSubmit } = useLockFn(async (formData: UpdateArticleParams) => {
    try {
        await apiUpdateArticle(id, formData);
        message.success(t("article.edit.messages.updateSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("更新失败:", error);
        message.error(t("article.edit.messages.updateFailed"));
    }
});

onMounted(() => fetchDetail());
</script>

<template>
    <div class="article-edit-container relative">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ t("article.edit.navigation.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">{{ t("article.edit.title") }}</h1>
        </div>

        <div v-if="isLock" class="flex items-center justify-center py-10">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <ArticleForm
            v-else
            :id="id"
            :initial-data="formData"
            @submit="handleSubmit"
            @cancel="router.back()"
        />
    </div>
</template>
