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
const appConfig = useAppConfig();

const bubbleClasses = computed(() => {
    const baseClasses = "rounded-lg text-sm max-w-full break-words";

    // Apply different styles based on message type
    let typeClasses: string;
    if (props.type === "user") {
        // 检测主题色是否为黑色
        const isBlackPrimary =
            appConfig.theme.blackAsPrimary || appConfig.ui.colors.primary === "black";

        if (isBlackPrimary) {
            // 主题色为黑色时，使用蓝色背景和白色文字确保可见性
            typeClasses = "bg-primary text-background px-4 py-3";
        } else {
            // 其他主题色，使用 primary 颜色和白色文字
            typeClasses = "bg-primary-400 text-background px-4 py-3";
        }
    } else {
        // 系统/AI消息：使用前景色
        typeClasses = "text-foreground";
    }

    return [baseClasses, typeClasses, props.bubbleClass];
});
</script>

<template>
    <div :class="bubbleClasses">
        <slot />
    </div>
</template>
