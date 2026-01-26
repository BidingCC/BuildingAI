<script lang="ts" setup>
import { useRouter } from "vue-router";

import type { CreateArticleParams, UpdateArticleParams } from "../../../services/console/article";
import { apiCreateArticle } from "../../../services/console/article";

const ArticleForm = defineAsyncComponent(() => import("./components/form.vue"));

const router = useRouter();
const message = useMessage();
const { t } = useI18n();

const handleSubmit = async (formData: CreateArticleParams | UpdateArticleParams) => {
    try {
        await apiCreateArticle(formData as CreateArticleParams);
        message.success(t("article.add.messages.createSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("创建失败:", error);
        message.error(t("article.add.messages.createFailed"));
    }
};

const handleCancel = () => {
    router.back();
};
</script>

<template>
    <div class="article-add-container">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ t("article.add.navigation.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">{{ t("article.add.title") }}</h1>
        </div>

        <ArticleForm @submit="handleSubmit" @cancel="handleCancel" />
    </div>
</template>
