<script setup lang="ts">
import { computed } from "vue";

/**
 * Chat bubble component props interface
 * @description Props for configuring the chat bubble appearance and behavior
 */
interface ChatsBubbleProps {
    /** Message type: user message or system/AI message */
    type?: "user" | "system";
    /** Custom bubble style classes */
    bubbleClass?: string;
    /** Whether the bubble should be clickable */
    clickable?: boolean;
    /** Whether to show loading state */
    loading?: boolean;
    /** Timestamp for the message */
    timestamp?: string | Date;
}

const props = withDefaults(defineProps<ChatsBubbleProps>(), {
    type: "system",
    bubbleClass: "",
});

/**
 * Compute bubble style classes
 * @description Dynamically generates CSS classes based on message type and custom classes
 * @returns Array of CSS classes for the bubble
 */
const bubbleClasses = computed(() => {
    const baseClasses = "rounded-lg text-sm max-w-full break-words";

    // Apply different styles based on message type
    const typeClasses =
        props.type === "user" ? "bg-primary-400 text-background px-4 py-3" : "text-foreground";

    return [baseClasses, typeClasses, props.bubbleClass];
});
</script>

<template>
    <div :class="bubbleClasses">
        <slot />
    </div>
</template>
