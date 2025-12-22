<script lang="ts" setup>
import type { BaseEvent } from "@uni-helper/uni-types";
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

import UniPopup from "@/components/uni_modules/uni-popup/components/uni-popup/uni-popup.vue?async";

const props = withDefaults(
    defineProps<{
        range: any[][];
        value: number[];
        title?: string;
        confirmText?: string;
        cancelText?: string;
    }>(),
    {
        range: () => [],
        value: () => [],
        title: "请选择",
        confirmText: "确定",
        cancelText: "取消",
    },
);

const emit = defineEmits<{
    confirm: [value: number[]];
    close: [];
    change: [value: number[]];
    open: [];
    pickstart: [value: BaseEvent];
    pickend: [value: BaseEvent];
}>();

const uniPopupRef = ref<UniPopupInstance>();
const selected = ref<number[]>([]);

function close() {
    uniPopupRef.value?.close?.();
    console.log("close");
    emit("close");
}

function onChange(e: BaseEvent) {
    selected.value = e.detail.value;
    emit("change", selected.value);
}

function open() {
    uniPopupRef.value?.open?.();
    emit("open");
}

function confirm() {
    emit("confirm", selected.value);
    console.log("confirm", selected.value);
    close();
}

onMounted(() => {
    // 初始化默认值, 保证selected的长度和range一致
    const defaultValue = JSON.parse(JSON.stringify(props.value));
    while (defaultValue.length < props.range.length) {
        defaultValue.push(0);
    }

    if (defaultValue.length > props.range.length) {
        defaultValue.splice(props.range.length);
    }

    if (props.value.length === props.range.length) {
        props.range.forEach((item, index) => {
            if (item.length < defaultValue[index]) {
                defaultValue[index] = 0;
            }
        });
    }
    selected.value = defaultValue;
});

defineExpose({
    open,
    close,
});
</script>

<template>
    <uni-popup ref="uniPopupRef" type="bottom" :safe-area="false" @mask-click="close">
        <view class="bg-background rounded-t-5 picker-container overflow-hidden">
            <!-- 标题栏 -->
            <view
                class="bg-background border-border flex items-center justify-between border-b px-4 py-3"
            >
                <view class="text-foreground flex-1 text-base active:opacity-70" @click="close">
                    {{ props.cancelText }}
                </view>
                <view class="text-foreground flex-1 truncate text-center text-base font-medium">
                    {{ props.title }}
                </view>
                <view
                    class="text-primary-600 flex-1 text-right text-base active:opacity-70"
                    @click="confirm"
                >
                    {{ props.confirmText }}
                </view>
            </view>
            <!-- 选择器区域 -->
            <picker-view
                ref="pickerViewRef"
                :value="selected"
                class="h-[476rpx] w-full overflow-hidden"
                mask-class="bg-transparent"
                indicator-class="picker-view-indicator"
                @change="onChange"
                @pickend="emit('pickend', $event)"
                @pickstart="emit('pickstart', $event)"
            >
                <picker-view-column v-for="(item, index) in props.range" :key="index">
                    <view
                        v-for="(v, k) in item"
                        :key="k"
                        class="picker-view-column-item text-foreground text-center"
                    >
                        {{ v }}
                    </view>
                </picker-view-column>
            </picker-view>
        </view>
    </uni-popup>
</template>

<style scoped>
.picker-container {
    /* #ifndef APP-NVUE */
    padding-bottom: env(safe-area-inset-bottom);
    /* #endif */
}

.picker-view-indicator {
    background: transparent;
    height: 68rpx;
    box-sizing: border-box;
    /* 确保指示器位置精确 */
    position: relative;
}

.picker-view-column-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 64rpx;
    line-height: 64rpx;
    font-size: 32rpx;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}
</style>
