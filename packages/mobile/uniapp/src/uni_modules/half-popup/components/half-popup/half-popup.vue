<!-- #ifdef APP-VUE || MP-WEIXIN || MP-QQ || H5 -->
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
    onClickClose,
    onFullScreen,
    onOverlayClose,
    updateSlideProgress
} = usePopup(props, emits)

const handleSlideProgress = (progress: number) => {
    updateSlideProgress(progress);
};


// 将方法暴露给wxs调用
defineExpose({ onClickClose, handleSlideProgress, getCurrentInstance })
</script>

<template>
    <view
        v-if="visiblePopup"
        class="half-popup"
        :style="{
            '--zIndex': props.zIndex,
            '--color': props.color
        }"
        @close="onClickClose"
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
            @onClickClose="onClickClose"
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
                @tap.stop="onClickClose"
            >
                <text class="__close-icon" />
            </view>
        </view>
    </view>
</template>

<style lang="scss">
@import 'half-popup.scss';
</style>