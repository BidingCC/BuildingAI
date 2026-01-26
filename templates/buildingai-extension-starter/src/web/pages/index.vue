<script setup lang="ts">
import type { Article } from "~/services/web/article";
import { apiGetPublishedArticles } from "~/services/web/article";
import type { Category } from "~/services/web/category";
import { apiGetCategoryList } from "~/services/web/category";

definePageMeta({ auth: false, name: "首页", inLinkSelector: true });

const { t } = useI18n();

const articles = ref<Article[]>([]);
const categories = ref<Category[]>([]);
const selectedCategoryId = ref<string | undefined>(undefined);

const getCategoryList = async () => {
    try {
        categories.value = (await apiGetCategoryList()) || [];
    } catch (error) {
        console.error("获取分类列表失败:", error);
    }
};

const { lockFn: getLists, isLock: loading } = useLockFn(async () => {
    try {
        articles.value = (await apiGetPublishedArticles(selectedCategoryId.value)) || [];
    } catch (error) {
        console.error("获取文章列表失败:", error);
    }
});

const selectCategory = (categoryId?: string) => {
    selectedCategoryId.value = categoryId;
    getLists();
};

onMounted(() => {
    Promise.all([getCategoryList(), getLists()]);
});
</script>

<template>
    <div class="bg-background min-h-screen py-12">
        <div class="mx-auto flex max-w-6xl gap-40 px-4 sm:px-6 lg:px-8">
            <div class="flex-1">
                <div class="mb-8 lg:hidden">
                    <div class="flex flex-wrap items-center gap-2">
                        <UButton
                            :variant="selectedCategoryId === undefined ? 'solid' : 'outline'"
                            :color="selectedCategoryId === undefined ? 'primary' : 'neutral'"
                            size="sm"
                            @click="selectCategory(undefined)"
                        >
                            {{ t("article.list.categories.all") }}
                        </UButton>
                        <UButton
                            v-for="category in categories"
                            :key="category.id"
                            :variant="selectedCategoryId === category.id ? 'solid' : 'outline'"
                            :color="selectedCategoryId === category.id ? 'primary' : 'neutral'"
                            size="sm"
                            @click="selectCategory(category.id)"
                        >
                            {{ category.name }}
                            <span v-if="category.articleCount > 0" class="ml-1 text-xs opacity-70">
                                ({{ category.articleCount }})
                            </span>
                        </UButton>
                    </div>
                </div>

                <div v-if="loading" class="flex items-center justify-center py-20">
                    <UIcon
                        name="i-lucide-loader-2"
                        class="text-muted-foreground size-8 animate-spin"
                    />
                </div>

                <div
                    v-else-if="articles.length === 0"
                    class="flex items-center justify-center py-20"
                >
                    <p class="text-muted-foreground text-lg">{{ t("article.list.empty") }}</p>
                </div>

                <div v-else class="space-y-8">
                    <article
                        v-for="article in articles"
                        :key="article.id"
                        class="group flex cursor-pointer gap-6 pb-10 transition-all"
                        @click="navigateTo(`/article/${article.id}`)"
                    >
                        <!-- <div v-if="article.cover" class="w-20 shrink-0 overflow-hidden rounded-lg">
                            <img
                                :src="article.cover"
                                :alt="article.title"
                                class="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                        </div> -->

                        <div class="flex-1">
                            <h2
                                class="text-foreground group-hover:text-primary mb-3 text-xl leading-tight font-bold transition-colors"
                            >
                                {{ article.title }}
                            </h2>

                            <p
                                v-if="article.summary"
                                class="text-muted-foreground line-clamp-1 text-base leading-relaxed"
                            >
                                {{ article.summary }}
                            </p>

                            <div
                                class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                            >
                                <span>
                                    {{
                                        article.author?.nickname ||
                                        article.author?.username ||
                                        "未知作者"
                                    }}
                                </span>
                                <span class="text-muted-foreground/50">|</span>

                                <TimeDisplay
                                    :datetime="article.publishedAt || article.createdAt"
                                    mode="date"
                                />
                                <span class="text-muted-foreground/50">|</span>

                                <template v-if="article.category?.name">
                                    <span>{{ article.category.name }}</span>
                                    <span class="text-muted-foreground/50">|</span>
                                </template>

                                <span
                                    >{{ article.viewCount || 0 }}{{ t("article.list.views") }}</span
                                >
                            </div>
                        </div>
                    </article>
                </div>
            </div>

            <aside class="sticky top-12 hidden h-fit w-48 shrink-0 lg:block">
                <div class="space-y-1">
                    <h3 class="text-foreground mb-4 text-sm font-medium">
                        {{ t("article.list.categories.title") }}
                    </h3>
                    <UButton
                        :variant="selectedCategoryId === undefined ? 'solid' : 'ghost'"
                        :color="selectedCategoryId === undefined ? 'primary' : 'neutral'"
                        size="sm"
                        class="w-full justify-start"
                        @click="selectCategory(undefined)"
                    >
                        {{ t("article.list.categories.all") }}
                    </UButton>
                    <UButton
                        v-for="category in categories"
                        :key="category.id"
                        :variant="selectedCategoryId === category.id ? 'solid' : 'ghost'"
                        :color="selectedCategoryId === category.id ? 'primary' : 'neutral'"
                        size="sm"
                        class="w-full justify-start"
                        @click="selectCategory(category.id)"
                    >
                        <div class="flex w-full items-center justify-between">
                            <span>{{ category.name }}</span>
                            <span
                                v-if="category.articleCount > 0"
                                class="text-muted-foreground/60 text-xs"
                            >
                                {{ category.articleCount }}
                            </span>
                        </div>
                    </UButton>
                </div>
            </aside>
        </div>
    </div>
</template>
