<script setup lang="ts">
import {
    ScrollAreaCorner,
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,
} from "reka-ui";
import { onMounted, useTemplateRef } from "vue";

import type { BdScrollAreaEmits, BdScrollAreaProps, BdScrollAreaSlots } from "./types";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<BdScrollAreaProps>(), {
    type: "hover",
    scrollHideDelay: 0,
    scrollbarSize: 10,
    variant: "default",
    horizontal: false,
    vertical: true,
    shadow: true,
});

const emits = defineEmits<BdScrollAreaEmits>();

defineSlots<BdScrollAreaSlots>();

const state = reactive({
    top: true,
    bottom: false,
});
const rootRef = useTemplateRef("rootRef");
const viewportRef = useTemplateRef("viewportRef");

/** Scrollbar background style */
const scrollbarClass = computed(() => {
    return "flex select-none touch-none p-0.5 z-10 transition-colors duration-[160ms] ease-out scrollbar";
});

/** Scrollbar thumb button style */
const thumbClass = computed(() => {
    return "flex-1 !w-[4px] rounded-full relative thumb bg-red before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]";
});

/** Calculate scroll shadow data attributes */
const shadowAttrs = computed(() => {
    if (!props.shadow) {
        return { "data-shadow": "false" };
    }
    const { top, bottom } = state;
    return {
        "data-shadow": "true",
        "data-shadow-top": String(!top),
        "data-shadow-bottom": String(!bottom),
    };
});

const debouncedScroll = useDebounceFn(async (event: Event) => {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Check if at top
    const isAtTop = scrollTop === 0;
    // Check if at bottom (scrollTop + clientHeight == scrollHeight)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // Subtract 1 to avoid floating point errors

    state.top = !isAtBottom;
    state.bottom = !isAtTop;
}, 50);

/**
 * Handle scroll events and get current scroll position
 * @param {Event} event - The triggered scroll event
 */
function handleScroll(event: Event) {
    if (props.shadow) debouncedScroll(event);
    emits("scroll", event);
}

/**
 * Absolute scroll to specified position
 * Uses native `scrollTo` method
 * @param {ScrollToOptions} [options] - Scroll options, defaults to scroll to top
 */
function scrollTo(options: ScrollToOptions = { top: 0 }) {
    if (viewportRef.value?.$el) {
        const viewport = viewportRef.value.viewportElement as HTMLElement;
        viewport.scrollTo(options);
    }
}

/**
 * Relative scroll
 * Uses native `scrollBy` method
 *
 * @param {ScrollToOptions} options - Scroll options, relative to current scroll position
 */
function scrollBy(options: ScrollToOptions) {
    if (viewportRef.value?.$el) {
        const viewport = viewportRef.value.viewportElement as HTMLElement;
        viewport.scrollBy(options);
    }
}

/**
 * Scroll to top
 * Uses scrollTop method provided by reka-ui
 */
function scrollToTop() {
    if (rootRef.value) {
        rootRef.value.scrollTop();
    }
}

/**
 * Scroll to bottom
 * Uses native element finding to scroll to bottom
 */
function scrollToBottom(animation: boolean = false) {
    if (viewportRef.value?.$el) {
        const viewport = viewportRef.value.viewportElement as HTMLElement;
        const scrollHeight = viewport.scrollHeight;
        const clientHeight = viewport.clientHeight;

        // Use scrollTo instead of scrollBy, and set behavior to 'auto' to avoid triggering additional scroll events
        viewport.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: animation ? "smooth" : "auto",
        });
    }
}

/**
 * Scroll to left
 * Uses scrollTopLeft method provided by reka-ui
 */
function scrollToLeft() {
    if (rootRef.value) {
        rootRef.value.scrollTopLeft();
    }
}

/**
 * Get viewport element
 * @returns Viewport DOM element
 */
function getViewportElement() {
    return viewportRef.value;
}

/**
 * Get scroll area element
 * @returns Scroll area DOM element
 */
function getScrollAreaElement() {
    return rootRef.value;
}

onMounted(() => emits("in-view"));

defineExpose({
    scrollTo,
    scrollBy,
    scrollToTop,
    scrollToBottom,
    scrollToLeft,
    getViewportElement,
    getScrollAreaElement,
});
</script>

<template>
    <ScrollAreaRoot
        ref="rootRef"
        :type="props.type"
        :scroll-hide-delay="props.scrollHideDelay"
        class="bd-scroll-area relative overflow-hidden"
        v-bind="{ ...$attrs, ...shadowAttrs }"
        style="--scrollbar-size: 10px"
        :data-variant="props.variant"
    >
        <ScrollAreaViewport
            ref="viewportRef"
            class="scrollbar-hide h-full w-full overflow-auto rounded outline-none"
            @scroll="handleScroll"
        >
            <slot />
        </ScrollAreaViewport>

        <ScrollAreaScrollbar v-if="props.vertical" orientation="vertical" :class="scrollbarClass">
            <ScrollAreaThumb :class="thumbClass" />
        </ScrollAreaScrollbar>

        <ScrollAreaScrollbar
            v-if="props.horizontal"
            orientation="horizontal"
            :class="scrollbarClass"
        >
            <ScrollAreaThumb :class="thumbClass" />
        </ScrollAreaScrollbar>

        <ScrollAreaCorner
            v-if="props.horizontal && props.vertical"
            class="bg-gray-100 dark:bg-gray-800"
        />
    </ScrollAreaRoot>
</template>

<style scoped>
/* Define CSS variables */
.bd-scroll-area {
    --scrollbar-bg: var(--scrollbar-bg-default);
    --scrollbar-hover-bg: var(--scrollbar-hover-bg-default);
    --thumb-bg: var(--thumb-bg-default);
    --thumb-hover-bg: var(--thumb-hover-bg-default);
}

/* Scroll shadow effect */
.bd-scroll-area[data-shadow="true"] {
    mask-image: linear-gradient(
        to bottom,
        transparent 0,
        #000 40px,
        #000 calc(100% - 40px),
        transparent 100%
    );
}

/* Shadow effect based on scroll position */
.bd-scroll-area[data-shadow-bottom="true"] {
    mask-image: linear-gradient(to bottom, #000 0, #000 calc(100% - 40px), transparent 100%);
}

.bd-scroll-area[data-shadow-top="true"] {
    mask-image: linear-gradient(to bottom, transparent 0, #000 40px, #000 100%);
}

/* Default variant */
.bd-scroll-area[data-variant="default"] {
    /* --scrollbar-bg: rgba(0, 0, 0, 0.05); */
    --scrollbar-hover-bg: rgba(0, 0, 0, 0);
    --thumb-bg: rgba(0, 0, 0, 0.05);
    --thumb-hover-bg: rgba(0, 0, 0, 0.1);
}

.dark {
    .bd-scroll-area[data-variant="default"] {
        /* --scrollbar-bg: rgba(0, 0, 0, 0.05); */
        --scrollbar-hover-bg: rgba(0, 0, 0, 0);
        --thumb-bg: rgba(255, 255, 255, 0.05);
        --thumb-hover-bg: rgba(255, 255, 255, 0.15);
    }
}

/* Primary variant */
.bd-scroll-area[data-variant="primary"] {
    /* --scrollbar-bg: rgba(59, 130, 246, 0.1); */
    --scrollbar-hover-bg: rgba(59, 130, 246, 0.2);
    --thumb-bg: rgba(59, 130, 246, 0.4);
    --thumb-hover-bg: rgba(59, 130, 246, 0.5);
}

/* Scrollbar styles */
.scrollbar {
    background-color: var(--scrollbar-bg);
}

.scrollbar:hover {
    background-color: var(--scrollbar-hover-bg);
}

.thumb {
    background-color: var(--thumb-bg);
}

.thumb:hover {
    background-color: var(--thumb-hover-bg);
}

/* .bd-scroll-area :deep(.scrollbar-hide) {
    scrollbar-width: thin;
} */

/* Hide default scrollbar */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

.scrollbar-hide {
    /* IE and Edge */
    -ms-overflow-style: none;
    /* Firefox */
    scrollbar-width: thin;
}
</style>
