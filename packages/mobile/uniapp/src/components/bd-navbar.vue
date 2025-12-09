<script setup lang="ts">
interface Props {
    title?: string;
    showBack?: boolean;
    showHome?: boolean;
    bgColor?: string;
    textColor?: string;
    fixed?: boolean;
    placeholder?: boolean;
    border?: boolean;
    filter?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: "",
    showBack: true,
    showHome: true,
    bgColor: "transparent",
    textColor: "#000000",
    fixed: true,
    placeholder: true,
    border: false,
    filter: "",
});

const emit = defineEmits<{
    back: [];
    home: [];
}>();

const statusBarHeight = ref(0);
const navBarHeight = ref(44);
const menuButtonInfo = ref({ width: 0, height: 0, top: 0, right: 0 });

const navbarStyle = computed(() => {
    const style: Record<string, string> = {
        background: props.bgColor,
        paddingTop: `${statusBarHeight.value}px`,
    };
    if (props.filter) {
        style.backdropFilter = props.filter;
    }
    return style;
});

const navbarContentStyle = computed(() => ({
    height: `${navBarHeight.value}px`,
}));

const capsuleStyle = computed(() => ({
    height: `${menuButtonInfo.value.height || 32}px`,
    borderColor: props.textColor === "#ffffff" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
    background: props.textColor === "#ffffff" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
}));

const titleStyle = computed(() => ({
    color: props.textColor,
}));

const iconColor = computed(() => props.textColor);

const totalHeight = computed(() => statusBarHeight.value + navBarHeight.value);

const canGoBack = computed(() => {
    const pages = getCurrentPages();
    return pages.length > 1;
});

const showCapsule = computed(() => (props.showBack && canGoBack.value) || props.showHome);

const isSingleBtn = computed(() => {
    const hasBack = props.showBack && canGoBack.value;
    const hasHome = props.showHome;
    return (hasBack && !hasHome) || (!hasBack && hasHome);
});

onMounted(() => {
    // #ifdef MP-WEIXIN
    const windowInfo = wx.getWindowInfo?.();
    statusBarHeight.value = windowInfo?.statusBarHeight || 0;
    try {
        const menuButton = uni.getMenuButtonBoundingClientRect();
        menuButtonInfo.value = {
            width: menuButton.width,
            height: menuButton.height,
            top: menuButton.top,
            right: (windowInfo?.windowWidth || 0) - menuButton.right,
        };
        navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height;
    } catch {
        navBarHeight.value = 44;
        menuButtonInfo.value = { width: 87, height: 32, top: 0, right: 10 };
    }
    // #endif

    // #ifndef MP-WEIXIN
    statusBarHeight.value = uni.getSystemInfoSync()?.statusBarHeight || 0;
    // #endif

    // #ifdef H5
    navBarHeight.value = 56;
    menuButtonInfo.value = { width: 87, height: 36, top: 0, right: 16 };
    // #endif

    // #ifdef APP-PLUS
    navBarHeight.value = 44;
    menuButtonInfo.value = { width: 87, height: 32, top: 0, right: 10 };
    // #endif
});

function handleBack() {
    if (canGoBack.value) {
        emit("back");
        uni.navigateBack();
    }
}

function handleHome() {
    emit("home");
    uni.reLaunch({ url: "/pages/chat/index" });
}
</script>

<template>
    <view class="bd-navbar-wrapper">
        <view
            v-if="fixed && placeholder"
            class="bd-navbar-placeholder"
            :style="{ height: `${totalHeight}px` }"
        />
        <view
            class="bd-navbar"
            :class="{ 'bd-navbar--fixed': fixed, 'bd-navbar--border': border }"
            :style="navbarStyle"
        >
            <view class="bd-navbar__content" :style="navbarContentStyle">
                <view class="bd-navbar__left">
                    <view
                        v-if="showCapsule"
                        class="bd-navbar__capsule"
                        :class="{ 'bd-navbar__capsule--single': isSingleBtn }"
                        :style="capsuleStyle"
                    >
                        <view
                            v-if="showBack && canGoBack"
                            class="bd-navbar__capsule-btn"
                            @tap="handleBack"
                        >
                            <text
                                class="bd-navbar__icon i-lucide-chevron-left"
                                :style="{ color: iconColor }"
                            />
                        </view>
                        <view
                            v-if="showBack && canGoBack && showHome"
                            class="bd-navbar__capsule-divider"
                            :style="{ background: capsuleStyle.borderColor }"
                        />
                        <view v-if="showHome" class="bd-navbar__capsule-btn" @tap="handleHome">
                            <text
                                class="bd-navbar__icon i-lucide-house"
                                :style="{ color: iconColor }"
                            />
                        </view>
                    </view>
                </view>
                <view class="bd-navbar__center">
                    <text class="bd-navbar__title" :style="titleStyle">{{ title }}</text>
                </view>
                <view class="bd-navbar__right">
                    <slot name="right" />
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.bd-navbar-wrapper {
    position: relative;
    z-index: 999;
}

.bd-navbar-placeholder {
    width: 100%;
}

.bd-navbar {
    width: 100%;
    box-sizing: border-box;
}

.bd-navbar--fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
}

.bd-navbar--border {
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.1);
}

.bd-navbar__content {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 12px;
    box-sizing: border-box;
}

/* #ifdef H5 */
.bd-navbar__content {
    padding: 0 16px;
}
/* #endif */

.bd-navbar__left {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.bd-navbar__capsule {
    display: flex;
    align-items: center;
    border: 1rpx solid;
    border-radius: 100px;
    overflow: hidden;
}

.bd-navbar__capsule--single {
    width: 32px;
    border-radius: 50%;
}

/* #ifdef H5 */
.bd-navbar__capsule--single {
    width: 36px;
}
/* #endif */

.bd-navbar__capsule-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 100%;
    transition: background-color 0.2s;
}

/* #ifdef H5 */
.bd-navbar__capsule-btn {
    width: 44px;
}
/* #endif */

.bd-navbar__capsule--single .bd-navbar__capsule-btn {
    width: 100%;
}

.bd-navbar__capsule-btn:active {
    background-color: rgba(0, 0, 0, 0.1);
}

.bd-navbar__capsule-divider {
    width: 1rpx;
    height: 60%;
}

.bd-navbar__icon {
    font-size: 18px;
}

/* #ifdef H5 */
.bd-navbar__icon {
    font-size: 20px;
}
/* #endif */

.bd-navbar__center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 50%;
    overflow: hidden;
}

.bd-navbar__title {
    font-size: 17px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* #ifdef H5 */
.bd-navbar__title {
    font-size: 18px;
}
/* #endif */

.bd-navbar__right {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
}
</style>
