<script setup lang="ts">
/**
 * Checkbox 复选框组件
 * @description 纯 checkbox 组件，UI 样式与 uni-data-checkbox 保持一致
 * @property {Boolean} checked 是否选中
 * @property {Boolean} disabled 是否禁用
 * @property {String} value checkbox 的值
 * @property {String} label 显示的文本标签
 * @event {Function} change 选中状态变化时触发
 */

interface Props {
    /** 是否选中 */
    checked?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** checkbox 的值 */
    value?: string | number | boolean;
    /** 显示的文本标签 */
    label?: string;
    /** v-model 绑定值 */
    modelValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    checked: false,
    disabled: false,
    value: "",
    label: "",
    modelValue: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    change: [value: boolean, event: Event];
}>();

// 如果没有提供 value，生成一个唯一的默认值
const checkboxValue = computed(() => {
    return props.value || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
});

const isChecked = computed(() => {
    return props.modelValue !== undefined ? props.modelValue : props.checked;
});

const handleClick = () => {
    if (props.disabled) return;

    const newValue = !isChecked.value;
    emit("update:modelValue", newValue);
    emit("change", newValue, new Event("change"));
};
</script>

<template>
    <view
        class="bd-checkbox"
        :class="{ 'is-checked': isChecked, 'is-disable': disabled }"
        @tap="handleClick"
    >
        <checkbox
            class="bd-checkbox__hidden"
            hidden
            :disabled="disabled"
            :value="checkboxValue + ''"
            :checked="isChecked"
        />
        <view
            class="bd-checkbox__inner"
            :class="{ 'is-checked': isChecked, 'is-disable': disabled }"
        >
            <view class="bd-checkbox__inner-icon" :class="{ 'is-checked': isChecked }"></view>
        </view>
        <slot name="label">
            <text v-if="label" class="bd-checkbox__label">{{ label }}</text>
        </slot>
    </view>
</template>

<style scoped>
.bd-checkbox {
    /* #ifndef APP-NVUE */
    display: flex;
    cursor: pointer;
    /* #endif */
    flex-direction: row;
    align-items: center;
    position: relative;
    margin: 5px 0;
    margin-right: 25px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.bd-checkbox__hidden {
    position: absolute;
    opacity: 0;
}

.bd-checkbox__inner {
    /* #ifndef APP-NVUE */
    flex-shrink: 0;
    box-sizing: border-box;
    /* #endif */
    position: relative;
    width: 16px;
    height: 16px;
    border: 1px solid var(--border-accent);
    border-radius: 4px;
    background-color: transparent;
    z-index: 1;
    transition: all 0.2s;
}

.bd-checkbox__inner-icon {
    position: absolute;
    /* #ifdef APP-NVUE */
    top: 2px;
    /* #endif */
    /* #ifndef APP-NVUE */
    top: 1px;
    /* #endif */
    left: 5px;
    height: 8px;
    width: 4px;
    border-right-width: 1px;
    border-right-color: #fff;
    border-right-style: solid;
    border-bottom-width: 1px;
    border-bottom-color: #fff;
    border-bottom-style: solid;
    opacity: 0;
    transform-origin: center;
    transform: rotate(40deg);
    transition: all 0.2s;
}

.bd-checkbox__label {
    font-size: 14px;
    color: var(--muted-foreground);
    margin-left: 5px;
    line-height: 14px;
}

/* 禁用状态 */
.bd-checkbox.is-disable {
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.bd-checkbox.is-disable .bd-checkbox__inner {
    background-color: var(--muted);
    border-color: var(--border);
    /* #ifdef H5 */
    cursor: not-allowed;
    /* #endif */
}

.bd-checkbox.is-disable .bd-checkbox__label {
    color: var(--muted-foreground);
}

/* 选中状态 */
.bd-checkbox.is-checked .bd-checkbox__inner {
    border-color: var(--primary-500);
    background-color: var(--primary-500);
}

.bd-checkbox.is-checked .bd-checkbox__inner-icon {
    opacity: 1;
    transform: rotate(45deg);
}

.bd-checkbox.is-checked .bd-checkbox__label {
    color: var(--primary-500);
}

/* 选中且禁用状态 */
.bd-checkbox.is-checked.is-disable .bd-checkbox__inner {
    opacity: 0.4;
}

.bd-checkbox.is-checked.is-disable .bd-checkbox__label {
    opacity: 0.4;
}
</style>
