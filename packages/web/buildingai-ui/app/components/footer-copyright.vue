<script setup lang="ts">
import type { WebsiteCopyright } from "@buildingai/service/common";
import { computed } from "vue";

const props = defineProps<{ copyright?: WebsiteCopyright | WebsiteCopyright[] }>();

const copyrightList = computed(() => {
    if (!props.copyright) return [];

    // 如果是数组，直接使用
    if (Array.isArray(props.copyright)) {
        // 过滤掉 null 和 undefined 值，确保数组中的每个元素都是有效的对象
        return props.copyright.filter((item) => item != null && item.url);
    }

    // 如果是对象，转换为数组
    if (typeof props.copyright === "object" && props.copyright.url) {
        return [props.copyright];
    }

    return [];
});
</script>

<template>
    <footer class="footer-copyright flex items-center justify-center gap-4 py-4">
        <template v-for="item in copyrightList" :key="item.url">
            <a
                class="hover:text-primary-500 flex items-center gap-1 text-xs text-gray-500 transition-colors"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
            >
                <NuxtImg
                    v-if="item.iconUrl"
                    :src="item.iconUrl"
                    :alt="item.displayName"
                    class="inline-block h-4 w-4 align-middle"
                />
                <span>{{ item.displayName }}</span>
            </a>
        </template>
    </footer>
</template>
