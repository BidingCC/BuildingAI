import { computed, type Ref, ref, watch } from "vue";

import type { SwipeDrawerEmits, SwipeDrawerProps } from "../swipe-drawer";

/**
 * @description 管理 swipe-drawer 内部状态（wxs 版本，手势逻辑在 wxs 中处理）
 */
export const useSwipeDrawer = (props: SwipeDrawerProps, emits: SwipeDrawerEmits) => {
    const drawerWidth: Ref<number> = ref(0);
    const slideProgress: Ref<number> = ref(0); // 0-1，由 wxs 通过 handleSlideProgress 更新

    /**
     * @description 根据 props.width 计算抽屉实际宽度（px）
     */
    const computeDrawerWidth = () => {
        const systemInfo = uni.getSystemInfoSync();
        const screenWidth = systemInfo.windowWidth || 375;
        const rawWidth = props.width;

        if (typeof rawWidth === "number") {
            return rawWidth;
        }

        const widthStr = String(rawWidth);

        if (widthStr.endsWith("%")) {
            const percentage = parseFloat(widthStr);
            return (screenWidth * percentage) / 100;
        }

        if (widthStr.endsWith("rpx")) {
            const rpxVal = parseFloat(widthStr);
            return (rpxVal * screenWidth) / 750;
        }

        if (widthStr.endsWith("px")) {
            return parseFloat(widthStr);
        }

        // 兜底：当成百分比处理
        const percentage = parseFloat(widthStr || "70");
        return (screenWidth * percentage) / 100;
    };

    // 计算抽屉宽度
    watch(
        () => props.width,
        () => {
            drawerWidth.value = computeDrawerWidth();
        },
        { immediate: true },
    );

    // 监听 modelValue 变化，触发 open/close 事件
    watch(
        () => props.modelValue,
        (val) => {
            if (val) {
                emits("open");
            } else {
                emits("close");
            }
        },
        { immediate: true },
    );

    /**
     * @description 点击遮罩关闭
     */
    const onOverlayTap = () => {
        if (!props.closeOnOverlay) return;
        console.log("onOverlayTap");
        emits("update:modelValue", false);
    };

    /**
     * @description 用于传递给 wxs 的 props 字符串（JSON 格式）
     */
    const wxsPropsType = computed(() => {
        return JSON.stringify({
            duration: props.duration,
            modelValue: props.modelValue,
            width: drawerWidth.value + "px",
            edgeWidth: props.edgeWidth,
        });
    });

    return {
        drawerWidth,
        slideProgress,
        wxsPropsType,
        onOverlayTap,
    };
};
