<!--
 * BdPopover component
 * A popover component with iOS-style blur effect and animations
 * Usage:
 *   <BdPopover>
 *     <template #content>
 *       <view class="custom-content">
 *         <text>自定义内容</text>
 *         <button size="mini" type="primary">操作按钮</button>
 *       </view>
 *     </template>
 *     <button>点击显示</button>
 *   </BdPopover>
 * @author BuildingAI Team
-->

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        /** Popover placement position */
        placement?:
            | "top"
            | "bottom"
            | "left"
            | "right"
            | "end-top"
            | "end-bottom"
            | "start-top"
            | "start-bottom";
        /** Whether to show blur mask */
        showBlur?: boolean;
        /** Whether to close when clicking mask */
        maskClickable?: boolean;
        /** Z-index of popover */
        zIndex?: number;
        /** Offset from trigger */
        offset?: number;
        /** Blur intensity (0-100) */
        blurIntensity?: number;
        /** Custom class for content */
        contentClass?: string;
        /** Custom style for content */
        contentStyle?: string | Record<string, string | number>;
    }>(),
    {
        placement: "bottom",
        showBlur: true,
        maskClickable: true,
        zIndex: 999,
        offset: 8,
        blurIntensity: 20,
        contentClass: "",
        contentStyle: () => ({}),
    },
);

const emit = defineEmits<{
    open: [];
    close: [];
    change: [open: boolean];
}>();

const isOpen = ref(false);
const isClosing = ref(false);
const triggerRef = ref<HTMLElement>();

const open = () => {
    isClosing.value = false;
    isOpen.value = true;
    // Emit global event to blur tabbar when popover opens
    if (props.showBlur) {
        uni.$emit("popover:open", {
            blurIntensity: props.blurIntensity,
        });
    }
    emit("open");
    emit("change", true);
};

const close = () => {
    isClosing.value = true;
    // Emit global event to remove blur from tabbar when popover closes
    if (props.showBlur) {
        uni.$emit("popover:close");
    }
    // Wait for animation to complete before hiding
    setTimeout(() => {
        isOpen.value = false;
        isClosing.value = false;
        emit("close");
        emit("change", false);
    }, 300);
};

const toggle = () => {
    if (isOpen.value) {
        close();
    } else {
        open();
    }
};

const handleMaskClick = () => {
    if (props.maskClickable) {
        close();
    }
};

// Clean up: remove blur from tabbar when component is unmounted
onUnmounted(() => {
    if (props.showBlur && isOpen.value) {
        uni.$emit("popover:close");
    }
});

const placementClass = computed(() => {
    return `bd-popover__content--${props.placement}`;
});

const animationClass = computed(() => {
    if (!isOpen.value) return "";
    return isClosing.value ? "bd-popover__content--closing" : "bd-popover__content--opening";
});

const contentStyle = computed(() => {
    const bottomPlacements = ["bottom", "end-bottom", "start-bottom"];
    const topPlacements = ["top", "end-top", "start-top"];
    const rightPlacements = ["right", "end-top", "end-bottom"];
    const leftPlacements = ["left", "start-top", "start-bottom"];

    return {
        zIndex: props.zIndex + 1,
        marginTop: bottomPlacements.includes(props.placement) ? `${props.offset}rpx` : "auto",
        marginBottom: topPlacements.includes(props.placement) ? `${props.offset}rpx` : "auto",
        marginLeft: rightPlacements.includes(props.placement) ? `${props.offset}rpx` : "auto",
        marginRight: leftPlacements.includes(props.placement) ? `${props.offset}rpx` : "auto",
        ...(typeof props.contentStyle === "string" ? {} : props.contentStyle),
    };
});

defineExpose({
    open,
    close,
    toggle,
});
</script>

<template>
    <view class="bd-popover" ref="triggerRef">
        <view
            class="bd-popover__trigger"
            :class="{ 'bd-popover__trigger--active': isOpen }"
            @click.stop="toggle"
        >
            <slot />
        </view>
        <view
            v-if="isOpen"
            class="bd-popover__mask"
            :class="{
                'bd-popover__mask--visible': isOpen && !isClosing,
                'bd-popover__mask--closing': isClosing,
            }"
            :style="{
                zIndex: zIndex,
                backdropFilter: showBlur ? `blur(${blurIntensity}px)` : 'none',
                WebkitBackdropFilter: showBlur ? `blur(${blurIntensity}px)` : 'none',
            }"
            @click="handleMaskClick"
        />
        <view
            v-if="isOpen"
            class="bd-popover__content"
            :class="[placementClass, animationClass, contentClass]"
            :style="contentStyle"
            @click.stop="toggle"
        >
            <slot name="content" />
        </view>
    </view>
</template>

<style scoped>
.bd-popover {
    position: relative;
    display: inline-block;
}

.bd-popover__trigger {
    display: inline-block;
    position: relative;
    z-index: 1;
    transition: opacity 0.3s ease;
}

.bd-popover__trigger--active {
    z-index: 1000;
}

.bd-popover__mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
}

.bd-popover__mask--visible {
    animation: maskFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__mask--closing {
    animation: maskFadeOut 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content {
    position: absolute;
    background-color: var(--background-transparent, var(--background));
    backdrop-filter: blur(20rpx);
    -webkit-backdrop-filter: blur(20rpx);
    border-radius: 24rpx;
    box-shadow: 0 0 30rpx rgba(0, 0, 0, 0.1);
    padding: 12rpx;
    min-width: 250rpx;
    max-width: 700rpx;
    white-space: nowrap;
    opacity: 0;
    transform-origin: center;
}

.bd-popover__content--top {
    bottom: 100%;
    left: 50%;
}

.bd-popover__content--top.bd-popover__content--opening {
    animation: popoverFadeInTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--top.bd-popover__content--closing {
    animation: popoverFadeOutTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--bottom {
    top: 100%;
    left: 50%;
}

.bd-popover__content--bottom.bd-popover__content--opening {
    animation: popoverFadeInBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--bottom.bd-popover__content--closing {
    animation: popoverFadeOutBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--left {
    right: 100%;
    top: 50%;
}

.bd-popover__content--left.bd-popover__content--opening {
    animation: popoverFadeInLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--left.bd-popover__content--closing {
    animation: popoverFadeOutLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--right {
    left: 100%;
    top: 50%;
}

.bd-popover__content--right.bd-popover__content--opening {
    animation: popoverFadeInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--right.bd-popover__content--closing {
    animation: popoverFadeOutRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--end-top {
    bottom: 100%;
    right: 0;
    transform-origin: top right;
}

.bd-popover__content--end-top.bd-popover__content--opening {
    animation: popoverFadeInEndTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--end-top.bd-popover__content--closing {
    animation: popoverFadeOutEndTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--end-bottom {
    top: 100%;
    right: 0;
    transform-origin: bottom right;
}

.bd-popover__content--end-bottom.bd-popover__content--opening {
    animation: popoverFadeInEndBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--end-bottom.bd-popover__content--closing {
    animation: popoverFadeOutEndBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--start-top {
    bottom: 100%;
    left: 0;
    transform-origin: top left;
}

.bd-popover__content--start-top.bd-popover__content--opening {
    animation: popoverFadeInStartTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--start-top.bd-popover__content--closing {
    animation: popoverFadeOutStartTop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--start-bottom {
    top: 100%;
    left: 0;
    transform-origin: bottom left;
}

.bd-popover__content--start-bottom.bd-popover__content--opening {
    animation: popoverFadeInStartBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.bd-popover__content--start-bottom.bd-popover__content--closing {
    animation: popoverFadeOutStartBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes popoverFadeInTop {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutTop {
    from {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateX(-50%) translateY(10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInBottom {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(-10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutBottom {
    from {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateX(-50%) translateY(-10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInLeft {
    from {
        opacity: 0;
        transform: translateY(-50%) translateX(10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(-50%) translateX(0) scale(1);
    }
}

@keyframes popoverFadeOutLeft {
    from {
        opacity: 1;
        transform: translateY(-50%) translateX(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(-50%) translateX(10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInRight {
    from {
        opacity: 0;
        transform: translateY(-50%) translateX(-10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(-50%) translateX(0) scale(1);
    }
}

@keyframes popoverFadeOutRight {
    from {
        opacity: 1;
        transform: translateY(-50%) translateX(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(-50%) translateX(-10rpx) scale(0.9);
    }
}

@keyframes maskFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes maskFadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

@keyframes popoverFadeInEndTop {
    from {
        opacity: 0;
        transform: translateY(10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutEndTop {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInEndBottom {
    from {
        opacity: 0;
        transform: translateY(-10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutEndBottom {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(-10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInStartTop {
    from {
        opacity: 0;
        transform: translateY(10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutStartTop {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(10rpx) scale(0.9);
    }
}

@keyframes popoverFadeInStartBottom {
    from {
        opacity: 0;
        transform: translateY(-10rpx) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes popoverFadeOutStartBottom {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(-10rpx) scale(0.9);
    }
}
</style>
