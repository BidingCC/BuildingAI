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

<script lang="ts">
export default {
    emits: ["slide-progress", "update:modelValue"],
    data() {
        return {
            slideProgress: 0 as number,
            hideTimer: null as ReturnType<typeof setTimeout> | null,
            isClosing: false,
        };
    },
    methods: {
        handleSlideProgress(progress: number) {
            const validProgress = typeof progress === 'number' && !isNaN(progress) && isFinite(progress) ? progress : 0;
            this.$emit("slide-progress", validProgress);
            const oldProgress = typeof this.slideProgress === 'number' && !isNaN(this.slideProgress) ? this.slideProgress : 0;
            
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = null;
            }
            
            if (progress === 0.01 && oldProgress > 0) {
                this.slideProgress = 0.01;
                this.hideTimer = setTimeout(() => {
                    this.slideProgress = 0;
                    this.$emit("slide-progress", 0);
                    this.$forceUpdate();
                }, 250);
                return;
            }
            
            if (oldProgress > 0 && progress === 0) {
                this.slideProgress = 0;
                this.isClosing = true;
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
        handleClose() {
            this.$emit("update:modelValue", false);
        },
        handleOpen() {
            this.$emit("update:modelValue", true);
        },
    },
    beforeUnmount() {
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
        <view
            class="swipe-drawer__content"
            :style="{
                transform: `translate3d(${Math.max(0, (slideProgress === 0.01 ? 1 : slideProgress) * (drawerWidth || 0))}px,0,0)`,
                filter: `blur(${Math.max(0, (props.blurMax || 0) * (slideProgress === 0.01 ? 1 : slideProgress))}px)`,
                transition: (slideProgress === 0 || slideProgress === 1 || slideProgress === 0.01 || isClosing) ? 'transform 0.2s ease-out, filter 0.25s ease-out' : 'none',
            }"
        >
            <view
                class="swipe-drawer__content-body"
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
            <view class="swipe-drawer__content-footer">
                <slot name="footer" />
            </view>
        </view>

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
