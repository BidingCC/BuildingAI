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
                class="flex flex-row items-center justify-between text-xs select-none"
                @click="toggleExpand(index)"
            >
                <view class="flex flex-wrap items-center gap-2">
                    <text
                        v-if="!item?.output && !item?.error"
                        class="i-lucide-loader-2 animate-spin text-base"
                    />
                    <view v-else class="flex">
                        <text class="i-lucide-route text-sm" />
                    </view>

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
                    <view class="bg-primary-50 text-primary rounded px-2 py-1 text-xs">
                        {{ item?.mcpServer?.name }}
                    </view>
                    <text class="text-md">{{ t("common.chat.toolCall.call") || "调用" }}</text>
                    <view class="bg-primary-50 text-primary rounded px-2 py-1 text-xs">
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
                        <text class="text-muted-foreground text-xs break-all">
                            {{ JSON.stringify(item.input) }}
                        </text>
                    </view>
                    <!-- Output section -->
                    <view v-if="item?.output" class="bg-muted rounded p-2">
                        <text class="text-foreground mb-1 text-xs font-medium">
                            {{ t("common.chat.toolCall.finishedCall") || "调用完成" }}
                            {{ item?.tool?.name }}
                        </text>
                        <text class="text-muted-foreground text-xs break-all">
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
