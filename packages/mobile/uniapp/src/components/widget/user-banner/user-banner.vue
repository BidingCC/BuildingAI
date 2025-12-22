<script setup lang="ts">
import { useAppStore } from "@/stores/app";
import { navigateTo } from "@/utils/navigate";

const props = defineProps({
    content: {
        type: Object,
        default: () => ({}),
    },
    styles: {
        type: Object,
        default: () => ({}),
    },
});
const handleClick = (link: any) => {
    navigateTo(link);
};
const { getImageUrl } = useAppStore();
</script>

<template>
    <view
        class="banner mt-4 h-[200rpx] translate-y-0"
        v-if="content.data.length && content.enabled"
    >
        <swiper
            class="swiper h-full"
            :indicator-dots="content.data.length > 1"
            indicator-active-color="#4173ff"
            :autoplay="true"
        >
            <swiper-item
                v-for="(item, index) in content.data"
                :key="index"
                @click="handleClick(item.link)"
            >
                <BdImage
                    mode="widthFix"
                    width="100%"
                    height="100%"
                    :src="getImageUrl(item.image)"
                    class="rounded-lg"
                />
            </swiper-item>
        </swiper>
    </view>
</template>

<style></style>
