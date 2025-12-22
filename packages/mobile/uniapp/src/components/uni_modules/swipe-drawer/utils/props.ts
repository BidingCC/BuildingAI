/**
 * @description swipe-drawer 模块通用 prop 类型辅助方法
 */
import type { PropType } from "vue";

export const unknownProp = null as unknown as PropType<unknown>;

export const numericProp = [Number, String];

export const truthProp = {
    type: Boolean,
    default: true as const,
};

export const makeRequiredProp = <T>(type: T) => ({
    type,
    required: true as const,
});

export const makeArrayProp = <T>() => ({
    type: Array as PropType<T[]>,
    default: () => [],
});

export const makeNumberProp = <T>(defaultVal: T) => ({
    type: Number,
    default: defaultVal,
});

export const makeNumericProp = <T>(defaultVal: T) => ({
    type: numericProp,
    default: defaultVal,
});

export const makeStringProp = <T>(defaultVal: T) => ({
    type: String as unknown as PropType<T>,
    default: defaultVal,
});


