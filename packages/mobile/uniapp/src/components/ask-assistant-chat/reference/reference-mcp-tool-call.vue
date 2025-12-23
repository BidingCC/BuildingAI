<script setup lang="ts">
import type { McpToolCall } from "@buildingai/service/consoleapi/mcp-server";
import { ref } from "vue";

import { formatDuration } from "@/utils/helper";

const { t } = useI18n();

interface Props {
    toolCalls?: McpToolCall[];
    messageId?: string;
}

withDefaults(defineProps<Props>(), {
    toolCalls: () => [],
    messageId: undefined,
});

const expandedIndexes = ref<Set<number>>(new Set());

const toggleExpand = (index: number) => {
    if (expandedIndexes.value.has(index)) {
        expandedIndexes.value.delete(index);
    } else {
        expandedIndexes.value.add(index);
    }
};
</script>

<template>
    <view
        v-if="toolCalls && toolCalls.length > 0"
        class="bg-muted mb-2 flex flex-col gap-1.5 rounded-lg p-2"
    >
        <view v-for="(item, index) in toolCalls" :key="index" class="group">
            <view
                class="flex cursor-pointer flex-row items-center justify-between text-xs select-none"
                @click="toggleExpand(index)"
            >
                <view class="flex flex-wrap items-center gap-2">
                    <text
                        v-if="!item?.output && !item?.error"
                        class="i-lucide-loader-2 animate-spin text-base"
                    />
                    <svg
                        v-else
                        class="text-base"
                        width="16"
                        height="16"
                        viewBox="0 0 195 195"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
                            stroke="currentColor"
                            stroke-width="12"
                            stroke-linecap="round"
                        />
                        <path
                            d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
                            stroke="currentColor"
                            stroke-width="12"
                            stroke-linecap="round"
                        />
                        <path
                            d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"
                            stroke="currentColor"
                            stroke-width="12"
                            stroke-linecap="round"
                        />
                    </svg>
                    <text>
                        {{
                            !item.input && !item.output
                                ? t("common.chat.toolCall.start") || "开始"
                                : ""
                        }}
                        {{
                            item.input && !item.output
                                ? t("common.chat.toolCall.calling") || "调用中"
                                : ""
                        }}
                        {{ t("common.chat.toolCall.from") || "从" }}
                    </text>
                    <view class="bg-primary/15 text-primary rounded px-2 py-1 text-xs">
                        {{ item?.mcpServer?.name }}
                    </view>
                    <text class="text-md">{{ t("common.chat.toolCall.call") || "调用" }}</text>
                    <view class="bg-primary/15 text-primary rounded px-2 py-1 text-xs">
                        {{ item?.tool?.name }}
                    </view>
                    <text>
                        {{
                            item.input && item.output
                                ? t("common.chat.toolCall.finished") || "完成"
                                : ""
                        }}
                    </text>
                    <view v-if="item.duration" class="bg-secondary rounded px-2 py-1 text-xs">
                        {{ t("common.chat.toolCall.duration") || "耗时"
                        }}{{ formatDuration(item.duration) }}
                    </view>
                </view>
                <text
                    :class="
                        expandedIndexes.has(index)
                            ? 'i-lucide-chevron-down'
                            : 'i-lucide-chevron-right'
                    "
                    class="text-base transition-transform duration-200"
                />
            </view>

            <view
                v-if="expandedIndexes.has(index) && item && item?.tool"
                class="bg-background mt-3 rounded p-3"
            >
                <text class="text-foreground text-md mb-3 font-medium">
                    {{ item?.tool?.name }} {{ t("common.reference.callDetails") || "调用详情" }}
                </text>
                <view class="space-y-2">
                    <!-- Input section -->
                    <view v-if="item?.input" class="bg-muted rounded p-2">
                        <text class="text-foreground mb-1 text-xs font-medium">
                            {{ t("common.chat.toolCall.startCall") || "开始调用" }}
                            {{ item?.tool?.name }}
                        </text>
                        <text class="text-muted-foreground text-xs">
                            {{ JSON.stringify(item.input) }}
                        </text>
                    </view>
                    <!-- Output section -->
                    <view v-if="item?.output" class="bg-muted rounded p-2">
                        <text class="text-foreground mb-1 text-xs font-medium">
                            {{ t("common.chat.toolCall.finishedCall") || "调用完成" }}
                            {{ item?.tool?.name }}
                        </text>
                        <text class="text-muted-foreground text-xs">
                            {{ JSON.stringify(item.output) }}
                        </text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>

