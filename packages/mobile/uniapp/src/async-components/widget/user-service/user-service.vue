<script lang="ts" setup>
import BdImage from "@/async-components/bd-image.vue?async";
import type { Link } from "@/utils/navigate";
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

const handleClick = (link: Link | string | Record<string, unknown>) => {
    // If link is already a Link object, use it directly
    if (typeof link === "object" && "type" in link && "path" in link) {
        navigateTo(link as Link);
    }
    // Otherwise, ignore or handle as needed
};
</script>
<template>
    <div class="user-service bg-background mt-4 rounded-lg p-[30rpx]" v-if="props.content.enabled">
        <div v-if="props.content.title" class="title text-sm font-medium">
            <div>{{ props.content.title }}</div>
        </div>
        <!-- 横排 -->
        <div v-if="props.content.style == 1" class="grid grid-cols-4 gap-x-6">
            <div
                v-for="(item, index) in props.content.data"
                :key="index"
                class="flex flex-col items-center pt-[40rpx]"
                @click="handleClick(item.link)"
            >
                <BdImage :width="68" :height="68" :src="item.image" alt="" />
                <div class="mt-2 text-xs">{{ item.title || item.name }}</div>
            </div>
        </div>
        <!-- 竖排 -->
        <div v-if="props.content.style == 2">
            <div
                v-for="(item, index) in props.content.data"
                :key="index"
                class="flex h-[100rpx] items-center px-[24rpx]"
                @click="handleClick(item.link)"
            >
                <BdImage :width="52" :height="52" :src="item.image" alt="" />
                <div class="ml-[20rpx] flex-1">{{ item.title || item.name }}</div>
                <div class="text-muted">
                    <u-icon name="arrow-right" />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss"></style>
