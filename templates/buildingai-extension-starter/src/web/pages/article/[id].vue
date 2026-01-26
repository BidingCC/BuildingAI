<script setup lang="ts">
import type { Article } from "~/services/web/article";
import { apiGetArticle } from "~/services/web/article";

definePageMeta({ auth: false });

const route = useRoute();
const { t } = useI18n();

const article = ref<Article | null>(null);
const articleId = computed(() => route.params.id as string);

const { lockFn: getArticleDetail, isLock: loading } = useLockFn(async () => {
    if (!articleId.value) return;
    try {
        article.value = await apiGetArticle(articleId.value);
    } catch (error) {
        console.error("获取文章详情失败:", error);
    }
});

watch(articleId, getArticleDetail, { immediate: true });
</script>

<template>
    <div class="bg-background min-h-screen py-12">
        <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div v-if="loading" class="flex items-center justify-center py-20">
                <UIcon name="i-lucide-loader-2" class="text-muted-foreground size-8 animate-spin" />
            </div>

            <div v-else-if="!article" class="flex items-center justify-center py-20">
                <p class="text-muted-foreground text-lg">{{ t("article.detail.notFound") }}</p>
            </div>

            <article v-else class="space-y-6">
                <h1 class="text-foreground text-4xl leading-tight font-bold">
                    {{ article.title }}
                </h1>

                <div
                    class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                >
                    <span>{{
                        article.author?.nickname || article.author?.username || "未知作者"
                    }}</span>
                    <span class="text-muted-foreground/50">|</span>

                    <TimeDisplay :datetime="article.publishedAt || article.createdAt" mode="date" />
                    <span class="text-muted-foreground/50">|</span>

                    <template v-if="article.category?.name">
                        <span>{{ article.category.name }}</span>
                        <span class="text-muted-foreground/50">|</span>
                    </template>

                    <span>{{ article.viewCount || 0 }}{{ t("article.list.views") }}</span>
                </div>

                <div v-if="article.cover" class="h-96 overflow-hidden rounded-lg">
                    <img
                        :src="article.cover"
                        :alt="article.title"
                        class="h-full w-full object-cover"
                    />
                </div>

                <p
                    v-if="article.summary"
                    class="bg-muted text-muted-foreground rounded-lg p-2 text-base leading-relaxed"
                >
                    {{ article.summary }}
                </p>

                <div class="prose prose-lg dark:prose-invert max-w-none pb-10">
                    <!-- <div v-html="article.content" class="prose dark:prose-invert" /> -->
                    <BdMarkdown :content="article.content" />
                </div>
            </article>
        </div>
    </div>
</template>
