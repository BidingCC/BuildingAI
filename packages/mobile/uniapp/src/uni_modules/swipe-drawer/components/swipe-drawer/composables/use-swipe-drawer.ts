import { type Ref, ref, watch } from "vue";

import type { SwipeDrawerEmits, SwipeDrawerProps } from "../swipe-drawer";

export const useSwipeDrawer = (props: SwipeDrawerProps, emits: SwipeDrawerEmits) => {
    const drawerWidth: Ref<number> = ref(0);
    const slideProgress: Ref<number> = ref(0);
    const wxsPropsType: Ref<string> = ref("");

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

        const percentage = parseFloat(widthStr || "70");
        return (screenWidth * percentage) / 100;
    };

    const updateWxsPropsType = () => {
        wxsPropsType.value = JSON.stringify({
            duration: props.duration,
            modelValue: props.modelValue,
            width: drawerWidth.value + "px",
            edgeWidth: props.edgeWidth,
        });
    };

    watch(
        () => props.width,
        () => {
            drawerWidth.value = computeDrawerWidth();
        },
        { immediate: true },
    );

    watch(
        () => drawerWidth.value,
        () => {
            updateWxsPropsType();
        },
    );

    watch(
        () => props.modelValue,
        (val) => {
            updateWxsPropsType();
            if (val) {
                emits("open");
            } else {
                emits("close");
            }
        },
        { immediate: true },
    );

    watch(
        () => [props.duration, props.edgeWidth],
        () => {
            updateWxsPropsType();
        },
    );

    const onOverlayTap = () => {
        if (!props.closeOnOverlay) return;
        console.log("onOverlayTap");
        emits("update:modelValue", false);
    };

    return {
        drawerWidth,
        slideProgress,
        wxsPropsType,
        onOverlayTap,
    };
};
