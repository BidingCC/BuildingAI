import type { ExtractPropTypes } from "vue";

import { makeNumberProp, makeNumericProp, makeStringProp, truthProp } from "../../utils";

/**
 * @description swipe-drawer 组件 Props 定义
 * @remark
 * - 支持通过 v-model 控制开关，通过多种参数自定义抽屉宽度、模糊程度和遮罩透明度。
 */
export const swipeDrawerProps = {
    /**
     * @description 控制抽屉是否显示（v-model）
     * @type { boolean }
     * @default false
     */
    modelValue: {
        type: Boolean,
        default: false,
    },
    /**
     * @description 抽屉宽度，支持 数值(px) / 百分比字符串 / rpx / vh 等
     * @default 70% 屏幕宽度
     * @example 280 | '70%' | '560rpx'
     */
    width: makeNumericProp("70%"),
    /**
     * @description 动画时长（ms）
     * @default 200
     */
    duration: makeNumberProp(200),
    /**
     * @description 背景页面的最大模糊半径（单位：px）
     * @default 3 降低默认值，避免模糊太严重
     */
    blurMax: makeNumberProp(3),
    /**
     * @description 遮罩层最大透明度（0 - 1）
     * @default 0.6
     */
    maskMaxOpacity: makeNumberProp(0.6),
    /**
     * @description 允许从屏幕左侧多少 px 区域开始滑动触发抽屉（仅当抽屉关闭时生效）
     *              当值为 0 或小于 0 时，表示整块内容区域任意位置右滑都可以触发
     * @default 0
     */
    edgeWidth: makeNumberProp(0),
    /**
     * @description 是否允许点击遮罩关闭抽屉
     * @default true
     */
    closeOnOverlay: truthProp,
    /**
     * @description 抽屉组件的层级
     * @default 9999
     */
    zIndex: makeNumberProp(9999),
    /**
     * @description 抽屉背景色
     * @default '#FFFFFF'
     */
    drawerBgColor: makeStringProp("#FFFFFF"),
};

/**
 * @description swipe-drawer 组件 Emits 定义
 */
export const swipeDrawerEmits = {
    /**
     * @description v-model 绑定值更新事件
     */
    "update:modelValue": (value: boolean) => typeof value === "boolean",
    /**
     * @description 抽屉完全打开时触发
     */
    open: () => true,
    /**
     * @description 抽屉完全关闭时触发
     */
    close: () => true,
    /**
     * @description 滑动进度变化事件，用于外部联动背景动画
     * @param progress 0-1 之间的数值，0 表示完全关闭，1 表示完全打开
     */
    "slide-progress": (progress: number) => typeof progress === "number",
};

export type SwipeDrawerProps = ExtractPropTypes<typeof swipeDrawerProps>;
export type SwipeDrawerEmits = ((event: "update:modelValue", value: boolean) => void) &
    ((event: "open") => void) &
    ((event: "close") => void) &
    ((event: "slide-progress", progress: number) => void);
