<script setup lang="ts">
/**
 * 视频预览弹窗组件
 */
defineProps<{
    /** 视频地址 */
    videoUrl: string;
    /** 视频标题 */
    title?: string;
}>();

const emits = defineEmits<{
    (e: "close"): void;
}>();
</script>

<template>
    <BdModal
        :title="title || '视频预览'"
        :ui="{ content: 'max-w-[90vw]' }"
        :closeOnEsc="true"
        :dismissible="true"
        @close="emits('close')"
    >
        <div class="flex items-center justify-center p-6">
            <video
                v-if="videoUrl"
                :src="videoUrl"
                class="max-h-[80vh] max-w-full rounded-lg"
                controls
                autoplay
                disablePictureInPicture
            >
                您的浏览器不支持视频播放。
            </video>
        </div>
    </BdModal>
</template>
