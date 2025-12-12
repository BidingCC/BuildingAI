<script lang="ts" setup>
const show = ref(false);

const emit = defineEmits<{
    "slide-progress": [progress: number];
    open: [];
    close: [];
}>();

const open = () => {
    show.value = true;
    emit("open");
};
const close = () => {
    show.value = false;
    emit("close");
};

/**
 * @description 处理滑动进度变化
 * @param progress 滑动进度
 */
const handleSlideProgress = (progress: number) => {
    emit("slide-progress", progress);
};

defineExpose({
    open,
    close,
});
</script>

<template>
    <half-popup
        v-model="show"
        :z-index="99999"
        height="90vh"
        @close="close"
        @open="open"
        @slide-progress="handleSlideProgress"
    >
        <scroll-view :scroll-y="true" style="height: 100%">
            <view style="padding: 20rpx" v-for="item in 60"> 你好呀 {{ item }} </view>
        </scroll-view>
    </half-popup>
</template>
