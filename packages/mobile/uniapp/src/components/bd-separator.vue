<script setup lang="ts">
/**
 * Separator 分隔线组件
 * @description 用于分隔内容的组件，支持水平和垂直方向，可带文字
 * @property {String} orientation 分隔线方向，可选值：horizontal（水平）、vertical（垂直），默认：horizontal
 * @property {String} text 分隔线中间的文字内容
 * @property {String} color 分隔线颜色，默认使用主题边框颜色
 * @property {String} thickness 分隔线粗细，默认：1rpx
 * @property {String} margin 分隔线外边距，默认：16rpx 0
 */

interface Props {
    /** 分隔线方向 */
    orientation?: "horizontal" | "vertical";
    /** 分隔线中间的文字内容 */
    text?: string;
    /** 分隔线颜色 */
    color?: string;
    /** 分隔线粗细 */
    thickness?: string;
    /** 分隔线外边距 */
    margin?: string;
}

const props = withDefaults(defineProps<Props>(), {
    orientation: "horizontal",
    text: "",
    color: "",
    thickness: "1rpx",
    margin: "16rpx 0",
});

const separatorStyle = computed(() => {
    const style: Record<string, string> = {
        margin: props.margin,
    };

    if (props.orientation === "horizontal") {
        style.width = "100%";
        style.height = props.thickness;
    } else {
        style.width = props.thickness;
        style.height = "100%";
    }

    if (props.color) {
        style.backgroundColor = props.color;
        style.borderColor = props.color;
    }

    return style;
});

const lineStyle = computed(() => {
    const style: Record<string, string> = {};
    if (props.color) {
        style.backgroundColor = props.color;
        style.borderColor = props.color;
    }
    return style;
});
</script>

<template>
    <view
        class="bd-separator"
        :class="[`bd-separator--${orientation}`, { 'bd-separator--with-text': text }]"
        :style="separatorStyle"
    >
        <template v-if="text && orientation === 'horizontal'">
            <view class="bd-separator__line" :style="lineStyle"></view>
            <view class="bd-separator__text">
                <slot name="text">
                    <text>{{ text }}</text>
                </slot>
            </view>
            <view class="bd-separator__line" :style="lineStyle"></view>
        </template>
        <template v-else>
            <view class="bd-separator__line" :style="lineStyle"></view>
        </template>
    </view>
</template>

<style scoped>
.bd-separator {
    /* #ifndef APP-NVUE */
    display: flex;
    /* #endif */
    align-items: center;
    box-sizing: border-box;
}

.bd-separator--horizontal {
    flex-direction: row;
    width: 100%;
}

.bd-separator--vertical {
    flex-direction: column;
    height: 100%;
}

.bd-separator--with-text {
    gap: 16rpx;
}

.bd-separator__line {
    flex: 1;
    background-color: var(--border);
    border: none;
}

.bd-separator--horizontal .bd-separator__line {
    height: 1rpx;
}

.bd-separator--vertical .bd-separator__line {
    width: 1rpx;
}

.bd-separator__text {
    flex-shrink: 0;
    color: var(--muted-foreground);
    font-size: 14px;
    white-space: nowrap;
}

/* 暗色模式适配 */
.dark .bd-separator__line {
    background-color: var(--border);
}

.dark .bd-separator__text {
    color: var(--muted-foreground);
}
</style>

