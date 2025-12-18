<script setup lang="ts">
import { useAppStore } from "@/stores/app";

/**
 * Image component props
 * @description Props for bd-image component
 */
interface Props {
    /** Image source URL */
    src?: string;
    /** Image width (supports rpx, px, %, etc.) */
    width?: string | number;
    /** Image height (supports rpx, px, %, etc.) */
    height?: string | number;
    /** Image display mode */
    mode?: "scaleToFill" | "aspectFit" | "aspectFill" | "widthFix" | "heightFix";
    /** Image alt text */
    alt?: string;
    /** Whether to use lazy loading */
    lazyLoad?: boolean;
    /** Whether to show loading placeholder */
    showMenuByLongpress?: boolean;
    /** Image error handler */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (event: any) => void;
    /** Image load handler */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLoad?: (event: any) => void;
    /** CSS class name */
    class?: string;
    /** Inline styles */
    style?: string;
}

const props = withDefaults(defineProps<Props>(), {
    src: "",
    width: "100%",
    height: "auto",
    mode: "aspectFit",
    alt: "",
    lazyLoad: false,
    showMenuByLongpress: false,
    class: "",
    style: "",
});

const { getImageUrl } = useAppStore();

/**
 * Processed image URL
 * @description Get processed image URL using app store
 */
const imageUrl = computed(() => {
    if (!props.src) return "";
    return getImageUrl(props.src);
});

/**
 * Format width value
 * @description Format width to string with unit
 */
const formattedWidth = computed(() => {
    if (typeof props.width === "number") {
        return `${props.width}rpx`;
    }
    return props.width;
});

/**
 * Format height value
 * @description Format height to string with unit
 */
const formattedHeight = computed(() => {
    if (typeof props.height === "number") {
        return `${props.height}rpx`;
    }
    return props.height;
});
</script>

<template>
    <image
        :src="imageUrl"
        :mode="mode"
        :lazy-load="lazyLoad"
        :show-menu-by-longpress="showMenuByLongpress"
        :class="class"
        :style="`width: ${formattedWidth}; height: ${formattedHeight}; ${style || ''}`"
        :alt="alt"
        @error="onError"
        @load="onLoad"
    />
</template>
