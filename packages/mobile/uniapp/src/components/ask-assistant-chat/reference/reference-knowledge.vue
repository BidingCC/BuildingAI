<script setup lang="ts">
import { ref } from "vue";

import { formatDuration } from "@/utils/helper";

const { t } = useI18n();

interface KnowledgeReference {
    datasetId: string;
    datasetName: string;
    userContent: string;
    retrievalMode?: string;
    duration?: number;
    chunks: Array<{
        id: string;
        content: string;
        score: number;
        metadata?: Record<string, unknown>;
        fileName?: string;
        chunkIndex?: number;
    }>;
}

interface Props {
    references?: KnowledgeReference[];
}

withDefaults(defineProps<Props>(), {
    references: () => [],
});

const retrievalModeMap = {
    vector: t("common.datasets.retrieval.vector") || "向量检索",
    fullText: t("common.datasets.retrieval.fullText") || "全文检索",
    hybrid: t("common.datasets.retrieval.hybrid") || "混合检索",
} as const;

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
    <view v-if="references && references.length > 0" class="bg-muted mb-2 rounded-lg p-2">
        <view v-for="(ref, index) in references" :key="index" class="group">
            <view
                class="flex w-full cursor-pointer flex-wrap items-center gap-2 text-xs select-none"
                @click="toggleExpand(index)"
            >
                <text class="i-lucide-hammer text-primary text-base" />

                <view class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <text class="shrink-0">
                        {{ t("common.chat.knowledgeCall.start") || "开始" }}
                        {{ t("common.chat.knowledgeCall.from") || "从" }}
                    </text>

                    <view
                        class="bg-primary/15 text-primary max-w-[50vw] truncate rounded px-2 py-1 text-xs"
                    >
                        {{ ref.datasetName }}
                    </view>

                    <text class="text-md shrink-0">
                        {{ t("common.chat.knowledgeCall.call") || "调用" }}
                    </text>

                    <view
                        v-if="ref.retrievalMode"
                        class="bg-primary/15 text-primary max-w-[40vw] truncate rounded px-2 py-1 text-xs"
                    >
                        {{ retrievalModeMap[ref.retrievalMode as keyof typeof retrievalModeMap] }}
                    </view>

                    <text class="shrink-0">
                        {{ t("common.chat.knowledgeCall.finished") || "完成" }}
                    </text>

                    <view
                        v-if="ref.duration"
                        class="bg-secondary shrink-0 rounded px-2 py-1 text-xs"
                    >
                        {{ t("common.chat.toolCall.duration") || "耗时" }}
                        {{ formatDuration(ref.duration) }}
                    </view>
                </view>

                <text
                    :class="
                        expandedIndexes.has(index)
                            ? 'i-lucide-chevron-down'
                            : 'i-lucide-chevron-right'
                    "
                    class="ml-auto text-base transition-transform duration-200"
                />
            </view>

            <view v-if="expandedIndexes.has(index)" class="mt-3 space-y-3">
                <!-- Request section -->
                <view class="bg-background rounded p-3">
                    <text class="text-foreground mb-2 text-xs font-medium">
                        {{ t("common.reference.request") || "请求" }}
                    </text>
                    <text class="text-sm text-gray-800">
                        {{ ref?.userContent }}
                    </text>
                </view>

                <!-- Response section -->
                <view class="bg-background rounded p-3">
                    <text class="text-foreground mb-2 text-xs font-medium">
                        {{ t("common.reference.response") || "响应" }}
                    </text>
                    <view class="text-muted-foreground flex flex-col gap-2 text-sm">
                        <view v-for="(chunk, chunkIndex) in ref?.chunks" :key="chunkIndex">
                            <text class="text-foreground font-bold">
                                #chunk-{{ chunkIndex + 1 }}:
                            </text>
                            <text>{{ chunk.content }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>
