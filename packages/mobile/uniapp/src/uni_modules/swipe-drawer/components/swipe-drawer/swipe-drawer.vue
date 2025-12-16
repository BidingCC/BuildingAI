<!-- @ts-nocheck -->
<!-- #ifdef APP-PLUS || MP-WEIXIN || MP-QQ || H5 -->
<script src="./use-touch.wxs" module="wxs" lang="wxs"></script>
<!-- #endif -->
<script setup lang="ts">
import { useSwipeDrawer } from "./composables/use-swipe-drawer";
import { swipeDrawerEmits, swipeDrawerProps } from "./swipe-drawer";

const props = defineProps(swipeDrawerProps);
const emits = defineEmits(swipeDrawerEmits);

const { wxsPropsType, drawerWidth, onOverlayTap } = useSwipeDrawer(props, emits);
</script>

<!-- 因为 setup 语法的方法无法被 wxs 调用，所以需要使用 script 标签来定义方法 -->
<script lang="ts">
export default {
    emits: ["slide-progress", "update:modelValue"],
    data() {
        return {
            slideProgress: 0 as number,
            // 用于延迟隐藏，确保关闭动画时阴影和内容能平滑过渡
            hideTimer: null as ReturnType<typeof setTimeout> | null,
            // 用于标记是否正在关闭动画中，延迟隐藏侧边栏
            isClosing: false,
        };
    },
    methods: {
        /**
         * 处理滑动进度变化
         * @param progress 滑动进度 0-1
         */
        handleSlideProgress(progress: number) {
            const validProgress = typeof progress === 'number' && !isNaN(progress) && isFinite(progress) ? progress : 0;
            this.$emit("slide-progress", validProgress);
            const oldProgress = typeof this.slideProgress === 'number' && !isNaN(this.slideProgress) ? this.slideProgress : 0;
            
            // 清除之前的定时器
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            
            // 如果 progress 是 0.01（wxs 关闭时发送的临时值），延迟隐藏
            if (progress === 0.01 && oldProgress > 0) {
                this.slideProgress = 0.01; // 保持 0.01，让 visibility 和 opacity 保持可见
                // 延迟 250ms（略大于动画时长 200ms）后设置为 0，确保动画完成
                this.hideTimer = setTimeout(() => {
                    this.slideProgress = 0;
                    this.$emit("slide-progress", 0);
                    this.$forceUpdate();
                }, 250);
                return;
            }
            
            // 当 progress 从 > 0 变为 0 时（关闭动画开始）
            // 立即更新 slideProgress 让 content 跟随，但标记正在关闭动画中，延迟隐藏侧边栏
            if (oldProgress > 0 && progress === 0) {
                // 立即更新 slideProgress，让 content 能够跟随侧边栏的动画
                this.slideProgress = 0;
                // 标记正在关闭动画中，延迟隐藏侧边栏
                this.isClosing = true;
                // 延迟 250ms（略大于动画时长 200ms）后取消关闭标记，确保关闭动画完成
                this.hideTimer = setTimeout(() => {
                    this.isClosing = false;
                    this.$forceUpdate();
                }, 250);
                return;
            }
            
            if (validProgress > 0) {
                this.isClosing = false;
            }
            
            this.slideProgress = validProgress;
        },
        /**
         * 处理关闭事件
         */
        handleClose() {
            this.$emit("update:modelValue", false);
        },
    },
    beforeUnmount() {
        // 组件销毁前清除定时器
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
    },
};
</script>

<template>
    <view
        class="swipe-drawer"
        :style="{
            '--zIndex': props.zIndex,
            '--drawer-bg-color': props.drawerBgColor,
        }"
    >
        <!-- 主内容区域：向右移动 -->
        <view
            class="swipe-drawer__content"
            :style="{
                transform: `translate3d(${Math.max(0, (slideProgress === 0.01 ? 1 : slideProgress) * (drawerWidth || 0))}px,0,0)`,
                filter: `blur(${Math.max(0, (props.blurMax || 0) * (slideProgress === 0.01 ? 1 : slideProgress))}px)`,
                transition: (slideProgress === 0 || slideProgress === 1 || slideProgress === 0.01 || isClosing) ? 'transform 0.2s ease-out, filter 0.25s ease-out' : 'none',
            }"
            @touchstart.passive="wxs.handleTouchstart"
            <!-- #ifdef MP-WEIXIN -->
            :catchtouchmove="wxs.handleTouchmove"
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            @touchmove.passive="wxs.handleTouchmove"
            <!-- #endif -->
            @touchend="wxs.handleTouchend"
            @touchcancel="wxs.handleTouchend"
        >
            <slot name="content">
                <slot />
            </slot>
        </view>

        <!-- 侧边抽屉面板 -->
        <view
            class="swipe-drawer__panel"
            :change:prop="wxs.observePropChanges"
            :prop="wxsPropsType"
            :style="{
                visibility: (slideProgress > 0 || isClosing) ? 'visible' : 'hidden',
                opacity: (slideProgress > 0 || isClosing) ? 1 : 0,
            }"
            @tap.stop
            @touchstart.passive="wxs.handleTouchstart"
            <!-- #ifdef MP-WEIXIN -->
            :catchtouchmove="wxs.handleTouchmove"
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            @touchmove.passive="wxs.handleTouchmove"
            <!-- #endif -->
            @touchend="wxs.handleTouchend"
            @touchcancel="wxs.handleTouchend"
            @handleSlideProgress="handleSlideProgress"
        >
            <slot name="drawer" />
        </view>

        <!-- 遮罩层 -->
        <view
            class="swipe-drawer__mask"
            :style="{
                background: `rgba(0,0,0,${Math.max(0, Math.min(1, (props.maskMaxOpacity || 0) * (slideProgress === 0.01 ? 1 : slideProgress)))})`,
                opacity: slideProgress > 0 ? 1 : 0,
                pointerEvents: slideProgress > 0 ? 'auto' : 'none',
            }"
            @tap.stop="onOverlayTap"
            @touchstart.passive="wxs.handleTouchstart"
            <!-- #ifdef MP-WEIXIN -->
            :catchtouchmove="wxs.handleTouchmove"
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            @touchmove.passive="wxs.handleTouchmove"
            <!-- #endif -->
            @touchend="wxs.handleTouchend"
            @touchcancel="wxs.handleTouchend"
        />
    </view>
</template>

<style>
@import "swipe-drawer.css";
</style>
