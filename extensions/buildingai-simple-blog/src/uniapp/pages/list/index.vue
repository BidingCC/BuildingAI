<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

/**
 * 文章类型定义
 */
interface Article {
    id: number;
    titleKey: string;
    summaryKey: string;
    categoryKey: string;
    date: string;
}

/**
 * 响应式状态
 */
const articles = ref<Article[]>([]);
const loading = ref(false);

/**
 * 加载文章列表
 */
const loadArticles = async () => {
    loading.value = true;
    try {
        // TODO: 调用 API 获取文章列表
        // 这里使用模拟数据
        await new Promise((resolve) => setTimeout(resolve, 1000));
        articles.value = [
            {
                id: 1,
                titleKey: "blog.welcome",
                summaryKey: "blog.welcomeDesc",
                categoryKey: "blog.tutorial",
                date: "2025-11-26",
            },
            {
                id: 2,
                titleKey: "blog.howToCreate",
                summaryKey: "blog.howToCreateDesc",
                categoryKey: "blog.development",
                date: "2025-11-25",
            },
        ];
    } catch (error) {
        console.error("加载文章列表失败:", error);
        uni.showToast({
            title: t("blog.loadFailed"),
            icon: "none",
        });
    } finally {
        loading.value = false;
    }
};

/**
 * 跳转到文章详情
 */
const goToDetail = (id: number) => {
    uni.navigateTo({
        url: `/simple-blog/pages/detail/index?id=${id}`,
    });
};

/**
 * 下拉刷新
 */
const onPullDownRefresh = async () => {
    await loadArticles();
    uni.stopPullDownRefresh();
};

/**
 * 生命周期钩子
 */
onMounted(() => {
    loadArticles();
});

// 导出方法供 uniapp 调用
defineExpose({
    onPullDownRefresh,
});
</script>

<template>
    <view class="blog-list-page">
        <view class="header">
            <text class="title text-primary text-2xl font-bold">{{ t("blog.list") }}</text>
        </view>

        <!-- 文章列表 -->
        <view class="article-list">
            <view
                v-for="article in articles"
                :key="article.id"
                class="article-item"
                @click="goToDetail(article.id)"
            >
                <view class="article-content">
                    <text class="article-title">{{ t(article.titleKey) }}</text>
                    <text class="article-summary">{{ t(article.summaryKey) }}</text>
                    <view class="article-meta">
                        <text class="article-category">{{ t(article.categoryKey) }}</text>
                        <text class="article-date">{{ article.date }}</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 空状态 -->
        <view v-if="articles.length === 0 && !loading" class="empty-state">
            <text class="empty-text">{{ t("blog.empty") }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-state">
            <text class="loading-text">{{ t("blog.loading") }}</text>
        </view>
    </view>
</template>
