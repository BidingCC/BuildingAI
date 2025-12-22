<!-- #ifdef APP-PLUS || MP-WEIXIN || MP-QQ || H5 -->
<script src="./use-touch.wxs" module="wxs" lang="wxs"></script>
<!-- #endif -->
<script setup lang="ts">
import { convertUnit } from '../../utils'
import { usePopup } from './composables/use-popup'
import { halfPopupEmits, halfPopupProps } from './half-popup'

const props = defineProps(halfPopupProps);
const emits = defineEmits(halfPopupEmits);

const {
    visiblePopup,
    wxsPropsType,
    isFullScreen,
    popupHeight,
    onFullScreen,
    onOverlayClose
} = usePopup(props, emits)

// 将方法暴露给wxs调用
defineExpose({ getCurrentInstance })
</script>

<!-- 因为 setup 语法的 方法无法被 wxs 调用，所以需要使用 script 标签来定义方法 垃圾啊-->
<script lang="ts">
export default {
    emits: ['slide-progress', 'update:modelValue'],
    data() {
        return {
            slideProgress: 0
        };
    },
    methods: {
        handleSlideProgress(progress: number) {
            this.$emit('slide-progress', progress);
            this.slideProgress = progress;
        },
        handleClose() {
            this.$emit('update:modelValue', false);
        }
    }
}
</script>

<template>
    <view
        <!-- #ifdef APP-PLUS -->
        v-show="visiblePopup"
        <!-- #endif -->
        <!-- #ifndef APP-PLUS -->
        v-if="visiblePopup"
        <!-- #endif -->
        class="half-popup"
        :style="{
            '--z-index': props.zIndex,
            '--color': props.color,
            '--bg-color': props.bgColor,
            'background-color': `rgba(0, 0, 0, ${slideProgress / 6})`
        }"
        @close="handleClose"
        @tap.stop="onOverlayClose"
        @touchmove.stop.prevent
    >
        <!-- 弹出内容 -->
        <view
            :class="['half-popup__container']"
            :style="{
                '--height': `${convertUnit(popupHeight)}`,
                '--radius': `${convertUnit(props.radius)}`
            }"
            :change:prop="wxs.observePropChanges"
            :prop="wxsPropsType"
            @tap.stop
            @touchstart.passive="wxs.handleTouchstart"
            <!-- #ifdef MP-WEIXIN -->
            :catchtouchmove="wxs.handleTouchmove"
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            @handleClose="handleClose"
            @touchmove.passive="wxs.handleTouchmove"
            <!-- #endif -->
            @touchend="wxs.handleTouchend"
            @touchcancel="wxs.handleTouchend"
            @handleSlideProgress="handleSlideProgress"
        >
            <slot></slot>

            <!-- 放大-充满屏幕 -->
            <view
                v-if="props.fullScreen"
                class="half-popup-btn half-popup-fullscreen-btn"
                @tap.stop="onFullScreen"
            >
                <text :class="isFullScreen ? '__fullscreen-icon2' : '__fullscreen-icon1'" />
            </view>
            <!-- 关闭按钮 -->
            <view
                v-if="props.closeBtn"
                class="half-popup-btn half-popup-close-btn"
                @tap.stop="handleClose"
            >
                <text class="__close-icon" />
            </view>
        </view>
    </view>
</template>

<style>
@import 'half-popup.css';
</style>