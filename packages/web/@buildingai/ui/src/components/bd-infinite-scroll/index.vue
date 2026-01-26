<!--
Usage example:

```vue
<template>
  <BdScrollArea class="w-full h-full min-h-0">
    <BdInfiniteScroll
      :loading="loading"
      :has-more="hasMore"
      :threshold="200"
      loading-text="Loading..."
      no-more-text="No more data"
      @load-more="loadMore"
    >
      <div v-for="(item, index) in list" :key="index" class="p-4 border-b">
        {{ item.content }}
      </div>
    </BdInfiniteScroll>
  </BdScrollArea>
</template>

<script setup>
const loading = ref(false)
const hasMore = ref(true)
const list = ref([...initial data...])
const page = ref(1)

// Load more data
async function loadMore() {
  if (loading.value) return

  loading.value = true
  try {
    const newData = await fetchData(page.value)
    if (newData.length === 0) {
      hasMore.value = false
    } else {
      list.value.push(...newData)
      page.value++
    }
  } catch (error) {
    console.error('Failed to load data', error)
  } finally {
    loading.value = false
  }
}
</script>
```
-->

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import type { BdInfiniteScrollEmits, BdInfiniteScrollProps } from "./types";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<BdInfiniteScrollProps>(), {
    loading: false,
    hasMore: true,
    threshold: 200,
    loadingText: "loading...",
    noMoreText: "No more data",
});

const emits = defineEmits<BdInfiniteScrollEmits>();

/** Container element reference */
const containerRef = ref<HTMLDivElement | null>(null);

/** Loading indicator element reference */
const loadingRef = ref<HTMLDivElement | null>(null);

/** IntersectionObserver instance */
let observer: IntersectionObserver | null = null;

/**
 * Create and initialize IntersectionObserver
 * When the loading indicator element enters the viewport, trigger load more
 */
function createObserver() {
    if (!window.IntersectionObserver || !loadingRef.value || !props.hasMore || props.loading)
        return;

    observer = new IntersectionObserver(
        (entries) => {
            if (entries[0]?.isIntersecting) emits("loadMore");
        },
        {
            root: null,
            // Detect bottom distance
            rootMargin: `${props.threshold}px`,
            threshold: 0,
        },
    );

    observer.observe(loadingRef.value);
}
/**
 * Clean up and recreate observer
 */
function resetObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    // Wait for the next microtask, ensure DOM update is complete
    Promise.resolve().then(() => {
        createObserver();
    });
}

// Listen to changes in loading and hasMore, reset observer when needed
watch(
    () => [props.loading, props.hasMore],
    () => {
        resetObserver();
    },
);

// Initialize observer when component is mounted
onMounted(() => {
    createObserver();
});

// Clean up observer when component is unmounted
onUnmounted(() => {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
});
</script>

<template>
    <div ref="containerRef" v-bind="$attrs" class="h-full w-full">
        <!-- Content area -->
        <slot />

        <!-- Loading indicator -->
        <div ref="loadingRef" class="flex h-8 w-full items-center justify-center">
            <!-- Loading state -->
            <div v-if="props.loading" class="flex items-center justify-center gap-1">
                <UIcon
                    name="i-ph-spinner-gap-bold"
                    size="16"
                    class="text-secondary-foreground animate-spin"
                />
                <span class="text-secondary-foreground text-sm">{{ props.loadingText }}</span>
            </div>
            <!-- No more data state -->
            <div v-else-if="!props.hasMore" class="text-secondary-foreground text-sm">
                {{ props.noMoreText }}
            </div>
        </div>
    </div>
</template>
