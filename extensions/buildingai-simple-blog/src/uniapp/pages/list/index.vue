<script setup lang="ts">
import { onMounted, ref } from "vue";

/**
 * 文章类型定义
 */
interface Article {
    id: number;
    title: string;
    summary: string;
    category: string;
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
                title: "欢迎使用 BuildingAI",
                summary: "BuildingAI 是一个强大的扩展系统",
                category: "教程",
                date: "2025-11-26",
            },
            {
                id: 2,
                title: "如何创建扩展",
                summary: "学习如何为 BuildingAI 创建自定义扩展",
                category: "开发",
                date: "2025-11-25",
            },
        ];
    } catch (error) {
        console.error("加载文章列表失败:", error);
        uni.showToast({
            title: "加载失败",
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
            <text class="title">博客列表</text>
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
                    <text class="article-title">{{ article.title }}</text>
                    <text class="article-summary">{{ article.summary }}</text>
                    <view class="article-meta">
                        <text class="article-category">{{ article.category }}</text>
                        <text class="article-date">{{ article.date }}</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 空状态 -->
        <view v-if="articles.length === 0 && !loading" class="empty-state">
            <text class="empty-text">暂无文章</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="loading-state">
            <text class="loading-text">加载中...</text>
        </view>
    </view>
</template>

<style scoped>
.blog-list-page {
    min-height: 100vh;
    background-color: #f5f5f5;
}

.header {
    padding: 32rpx;
    background-color: #ffffff;
}

.title {
    font-size: 48rpx;
    font-weight: bold;
    color: #333333;
}

.article-list {
    padding: 24rpx;
}

.article-item {
    margin-bottom: 24rpx;
    padding: 32rpx;
    background-color: #ffffff;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.article-content {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.article-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333333;
}

.article-summary {
    font-size: 28rpx;
    color: #666666;
    line-height: 1.5;
}

.article-meta {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin-top: 8rpx;
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

.empty-state,
.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 120rpx 0;
}

.empty-text,
.loading-text {
    font-size: 28rpx;
    color: #999999;
}
</style>
