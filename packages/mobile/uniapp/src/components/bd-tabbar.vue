<script setup lang="ts">
import { getCurrentPageMeta, getPageTitle, tabBarList } from "virtual:pages-meta";

interface TabItem {
    pagePath: string;
    text: string;
    iconPath?: string;
    selectedIconPath?: string;
    icon?: string;
    selectedIcon?: string;
    disabled?: boolean;
    badge?: number | string;
    dot?: boolean;
    index: number;
    [key: string]: unknown;
}

const { t } = useI18n();

// 标准化路径（统一为 / 开头）
const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

// Tab 列表（带国际化）
const tabList = computed<TabItem[]>(() =>
    tabBarList.map((item) => {
        const pageTitle = getPageTitle(item.pagePath);
        return {
            ...item,
            text: pageTitle ? t(pageTitle) : item.text || "",
        };
    }),
);

// 当前页面路径
const currentPagePath = computed(() => getCurrentPageMeta()?.path || "");

// 判断当前页面是否在 tabbar 列表中
const isTabBarPage = computed(() => {
    if (!currentPagePath.value || tabList.value.length === 0) return false;
    const current = normalizePath(currentPagePath.value);
    return tabList.value.some((item) => normalizePath(item.pagePath) === current);
});

// 当前选中索引
const currentIndex = computed(() => {
    const current = normalizePath(currentPagePath.value);
    const index = tabList.value.findIndex((item) => normalizePath(item.pagePath) === current);
    return index >= 0 ? index : 0;
});

// 安全区域
const safeAreaBottom = ref(0);
const tabbarHeight = computed(() => 64 + safeAreaBottom.value);

// 模糊效果状态-（邪修方法，无法解决 stacking context 堆叠问题，所以只能使用这种来模糊背景达到模糊效果）
const isBlurred = ref(false);
const blurIntensity = ref(20);

// 样式
const tabbarStyle = computed(() => ({
    background: "var(--background)",
    height: `${tabbarHeight.value}px`,
    ...(safeAreaBottom.value > 0 && { paddingBottom: `${safeAreaBottom.value}px` }),
    ...(isBlurred.value && {
        filter: `blur(${blurIntensity.value}px)`,
        WebkitFilter: `blur(${blurIntensity.value}px)`,
        transition: "filter 0.25s ease-out",
    }),
}));

// Tab 点击处理
const handleTabClick = (item: TabItem) => {
    if (item.disabled) return;
    // 模糊状态下不允许点击跳转
    if (isBlurred.value) return;

    const targetPath = normalizePath(item.pagePath);
    if (currentPagePath.value === targetPath) return;

    uni.switchTab({
        url: targetPath,
        fail: () => uni.navigateTo({ url: targetPath }),
    });
};

// 获取图标/图片
const getTabAsset = (item: TabItem, isSelected: boolean): string => {
    const asset = isSelected
        ? item.selectedIconPath || item.selectedIcon || item.iconPath || item.icon
        : item.iconPath || item.icon;
    return asset || "";
};

// 判断是否为 Iconify 图标
const isIconify = (asset: string) => asset && asset.startsWith("i-");

// 处理图片路径（确保以 / 开头）
const getImagePath = (path: string) => (path && !path.startsWith("/") ? `/${path}` : path);

onMounted(() => {
    safeAreaBottom.value = uni.getSystemInfoSync().safeAreaInsets?.bottom || 0;

    // Listen to global events to apply blur effect
    uni.$on("popover:open", (options: { blurIntensity?: number }) => {
        blurIntensity.value = options?.blurIntensity || 20;
        isBlurred.value = true;
    });

    uni.$on("popover:close", () => {
        isBlurred.value = false;
    });
});

// onUnmounted(() => {
//     // Clean up event listeners
//     uni.$off("popover:open");
//     uni.$off("popover:close");
// });
</script>

<template>
    <view v-if="isTabBarPage" class="bd-tabbar-wrapper">
        <view class="bd-tabbar-placeholder" :style="{ height: `${tabbarHeight}px` }" />
        <view class="bd-tabbar bd-tabbar--fixed bd-tabbar--border" :style="tabbarStyle">
            <view class="bd-tabbar__content">
                <view
                    v-for="(item, index) in tabList"
                    :key="index"
                    class="bd-tabbar__item"
                    :class="{
                        'bd-tabbar__item--active': currentIndex === index,
                        'bd-tabbar__item--disabled': item.disabled || isBlurred,
                    }"
                    :style="{
                        color:
                            currentIndex === index ? 'var(--primary)' : 'var(--muted-foreground)',
                    }"
                    @click="handleTabClick(item)"
                >
                    <view class="bd-tabbar__item-content">
                        <view class="bd-tabbar__item-icon">
                            <template v-if="getTabAsset(item, currentIndex === index)">
                                <text
                                    v-if="isIconify(getTabAsset(item, currentIndex === index))"
                                    class="bd-tabbar__icon"
                                    :class="getTabAsset(item, currentIndex === index)"
                                />
                                <image
                                    v-else
                                    :src="getImagePath(getTabAsset(item, currentIndex === index))"
                                    mode="aspectFit"
                                    class="bd-tabbar__image"
                                />
                            </template>
                        </view>
                        <text v-if="item.text" class="bd-tabbar__item-text">{{ item.text }}</text>
                        <view v-if="item.badge || item.dot" class="bd-tabbar__badge">
                            <text v-if="item.badge && !item.dot" class="bd-tabbar__badge-text">
                                {{
                                    typeof item.badge === "number" && item.badge > 99
                                        ? "99+"
                                        : item.badge
                                }}
                            </text>
                            <view v-if="item.dot" class="bd-tabbar__badge-dot" />
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.bd-tabbar-wrapper {
    position: relative;
}

.bd-tabbar-placeholder {
    width: 100%;
}

.bd-tabbar {
    width: 100%;
    box-sizing: border-box;
    padding: 18rpx 0;
}

.bd-tabbar--fixed {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 998;
    width: 100%;
}

.bd-tabbar--border {
    position: relative;
}

.bd-tabbar--border::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0;
    background-color: transparent;
    border: none;
}

.bd-tabbar__content {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100%;
    box-sizing: border-box;
}

.bd-tabbar__item {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    transition: color 0.2s;
}

.bd-tabbar__item--disabled {
    opacity: 0.5;
}

.bd-tabbar__item-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.bd-tabbar__item-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    /* #ifndef H5 */
    width: 60rpx;
    height: 60rpx;
    /* #endif */
    /* #ifdef H5 */
    width: 44rpx;
    height: 44rpx;
    /* #endif */
    margin-bottom: 4rpx;
}

.bd-tabbar__icon {
    font-size: 44rpx;
    line-height: 1;
}

.bd-tabbar__image {
    width: 100%;
    height: 100%;
}

.bd-tabbar__item-text {
    font-size: 20rpx;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    margin-top: 6rpx;
}

.bd-tabbar__badge {
    position: absolute;
    top: -4rpx;
    right: -8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    background: var(--error, #ef4444);
    border-radius: 16rpx;
    box-sizing: border-box;
}

.bd-tabbar__badge-text {
    font-size: 20rpx;
    color: #ffffff;
    line-height: 1;
    font-weight: 500;
}

.bd-tabbar__badge-dot {
    width: 16rpx;
    height: 16rpx;
    background: var(--error, #ef4444);
    border-radius: 50%;
}

/* #ifdef H5 */
.bd-tabbar__item {
    user-select: none;
}

.bd-tabbar__item:active:not(.bd-tabbar__item--disabled) {
    opacity: 0.7;
}
/* #endif */
</style>
