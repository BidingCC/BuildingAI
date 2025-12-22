import { type Ref, ref, watch } from "vue";

import type { HalfPopupEmits, HalfPopupProps } from "../half-popup";

export const usePopup = (props: HalfPopupProps, emits: HalfPopupEmits) => {
    // 是否显示弹框
    const visiblePopup: Ref<boolean> = ref(false);
    const wxsPropsType: Ref<string> = ref("");
    const isFullScreen: Ref<boolean> = ref(false);

    /**
     * @description 转换高度单位，将vh/rpx等转换为px
     * @param height 高度值，支持px、rpx、vh等单位
     * @returns 转换后的px值
     */
    const convertHeightToPx = (height: string | number): string => {
        if (typeof height === "number") {
            return height + "px";
        }

        const heightStr = String(height);

        // 处理vh单位
        if (heightStr.indexOf("vh") !== -1) {
            const systemInfo = uni.getSystemInfoSync();
            const vhValue = parseFloat(heightStr);
            const windowHeight = systemInfo.windowHeight || 667; // 默认值
            return (windowHeight * vhValue) / 100 + "px";
        }

        // 处理rpx单位
        if (heightStr.indexOf("rpx") !== -1) {
            const systemInfo = uni.getSystemInfoSync();
            const rpxValue = parseFloat(heightStr);
            const windowWidth = systemInfo.windowWidth || 375; // 默认值
            return (rpxValue * windowWidth) / 750 + "px";
        }

        // 其他单位直接返回
        return heightStr;
    };

    const popupHeight: Ref<string> = ref(convertHeightToPx(props.height));

    /**
     * @description 更新弹窗状态
     * @param value
     */
    const updateVisiblePopup = (value: boolean) => {
        // 关闭弹窗后回弹默认高度
        if (!value && isFullScreen.value) {
            onFullScreen();
        }
        visiblePopup.value = value;
    };

    watch(
        () => props.modelValue,
        (value: boolean) => {
            wxsPropsType.value = JSON.stringify({
                duration: props.duration,
                modelValue: value,
                height: popupHeight.value,
            });
            value ? emits("open") : emits("close");
            value ? updateVisiblePopup(value) : setTimeout(updateVisiblePopup, props.duration);
        },
        { immediate: true },
    );

    watch(
        () => props.height,
        (newHeight: string | number) => {
            popupHeight.value = convertHeightToPx(newHeight);
        },
    );

    watch(
        () => popupHeight.value,
        (value: string) => {
            wxsPropsType.value = JSON.stringify({
                duration: props.duration,
                modelValue: props.modelValue,
                height: value,
            });
        },
    );

    /**
     * @description 放大/回弹默认高度
     */
    const onFullScreen = () => {
        const systemInfo: UniApp.GetSystemInfoResult = uni.getSystemInfoSync();

        if (isFullScreen.value) {
            // 目前是全屏状态，恢复到默认高度
            popupHeight.value = convertHeightToPx(props.height);
        } else {
            // 目前不是全屏，设置高度以充满整个屏幕
            popupHeight.value = systemInfo.windowHeight + "px";
        }
        // 切换全屏状态
        isFullScreen.value = !isFullScreen.value;
    };

    /**
     * @description 更新弹窗状态
     * @param value
     */
    const updateModelValue = (value: boolean) => {
        emits("update:modelValue", value);
    };

    /**
     * @description 点击遮罩关闭弹窗
     */
    const onOverlayClose = () => {
        if (!props.closeOnOverlay) {
            return;
        }
        updateModelValue(false);
    };

    return {
        visiblePopup,
        wxsPropsType,
        isFullScreen,
        popupHeight,

        onFullScreen,
        onOverlayClose,
    };
};
