<script setup lang="ts">
import { onMounted, ref } from "vue";

/**
 * 文章详情类型定义
 */
interface ArticleDetail {
    id: number;
    title: string;
    content: string;
    category: string;
    date: string;
}

/**
 * 响应式状态
 */
const article = ref<ArticleDetail | null>(null);
const loading = ref(false);
const articleId = ref<number>(0);

/**
 * 加载文章详情
 */
const loadArticleDetail = async (id: number) => {
    loading.value = true;
    try {
        // TODO: 调用 API 获取文章详情
        // 这里使用模拟数据
        await new Promise((resolve) => setTimeout(resolve, 1000));
        article.value = {
            id,
            title: id === 1 ? "欢迎使用 BuildingAI" : "如何创建扩展",
            content: `这是文章 ${id} 的详细内容。\n\nBuildingAI 提供了强大的扩展系统，允许你轻松创建和集成自定义功能。通过插件化的架构，你可以将功能模块化，提高代码复用性和可维护性。\n\n在移动端，我们使用 uniapp 作为跨平台解决方案，支持小程序、H5 等多端发布。`,
            category: id === 1 ? "教程" : "开发",
            date: id === 1 ? "2025-11-26" : "2025-11-25",
        };
    } catch (error) {
        console.error("加载文章详情失败:", error);
        uni.showToast({
            title: "加载失败",
            icon: "none",
        });
    } finally {
        loading.value = false;
    }
};

/**
 * 生命周期钩子
 */
onMounted(() => {
    // 获取路由参数
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any).options;

    if (options.id) {
        articleId.value = Number.parseInt(options.id);
        loadArticleDetail(articleId.value);
    }
});
</script>

<template>
    <view class="blog-detail-page">
        <!-- 文章内容 -->
        <view v-if="article && !loading" class="article-detail">
            <view class="article-header">
                <text class="article-title">{{ article.title }}</text>
                <view class="article-meta">
                    <text class="article-category">{{ article.category }}</text>
                    <text class="article-date">{{ article.date }}</text>
                </view>
            </view>

            <view class="article-body">
                <text class="article-content">{{ article.content }}</text>
            </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-state">
            <text class="loading-text">加载中...</text>
        </view>

        <!-- 错误状态 -->
        <view v-if="!article && !loading" class="error-state">
            <text class="error-text">文章不存在</text>
        </view>
    </view>
</template>

<style scoped>
.blog-detail-page {
    min-height: 100vh;
    background-color: #ffffff;
}

.article-detail {
    padding: 32rpx;
}

.article-header {
    padding-bottom: 32rpx;
    border-bottom: 1rpx solid #eeeeee;
}

.article-title {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    color: #333333;
    line-height: 1.5;
    margin-bottom: 24rpx;
}

.article-meta {
    display: flex;
    align-items: center;
    gap: 24rpx;
}

.article-category {
    font-size: 24rpx;
    color: #1890ff;
    padding: 4rpx 16rpx;
    background-color: #e6f7ff;
    border-radius: 8rpx;
}

.article-date {
    font-size: 24rpx;
    color: #999999;
}

.article-body {
    padding: 32rpx 0;
}

.article-content {
    font-size: 32rpx;
    color: #333333;
    line-height: 1.8;
    white-space: pre-wrap;
}

.loading-state,
.error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 120rpx 0;
}

.loading-text,
.error-text {
    font-size: 28rpx;
    color: #999999;
}
</style>
