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
    <view
        v-if="references && references.length > 0"
        class="bg-muted mb-2 flex flex-col gap-1.5 rounded-lg p-2"
    >
        <view v-for="(ref, index) in references" :key="index" class="group">
            <view
                class="flex items-center justify-between text-xs select-none"
                @click="toggleExpand(index)"
            >
                <view class="flex items-stretch gap-2">
                    <view class="flex">
                        <text class="i-lucide-hammer text-primary text-base" />
                    </view>

                    <view class="flex flex-wrap items-center gap-x-2">
                        <text class="shrink-0">
                            {{ t("common.chat.knowledgeCall.start") }}
                            {{ t("common.chat.knowledgeCall.from") }}
                        </text>

                        <view
                            class="bg-primary-50 text-primary max-w-[50vw] truncate rounded px-2 py-1 text-xs"
                        >
                            {{ ref.datasetName }}
                        </view>

                        <text class="text-md shrink-0">
                            {{ t("common.chat.knowledgeCall.call") }}
                        </text>

                        <view
                            v-if="ref.retrievalMode"
                            class="bg-primary-50 text-primary max-w-[40vw] truncate rounded px-2 py-1 text-xs"
                        >
                            {{
                                retrievalModeMap[ref.retrievalMode as keyof typeof retrievalModeMap]
                            }}
                        </view>

                        <text class="shrink-0">
                            {{ t("common.chat.knowledgeCall.finished") }}
                        </text>

                        <view
                            v-if="ref.duration"
                            class="bg-primary-50 text-primary shrink-0 rounded px-2 py-1 text-xs"
                        >
                            {{ t("common.chat.toolCall.duration") }}
                            {{ formatDuration(ref.duration) }}
                        </view>
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

            <view v-if="expandedIndexes.has(index) && ref" class="bg-background mt-3 rounded p-3">
                <text class="text-foreground text-md mb-3 font-medium">
                    {{ ref.datasetName }} {{ t("common.reference.callDetails") }}
                </text>
                <view class="space-y-2">
                    <!-- Request section -->
                    <view v-if="ref?.userContent" class="bg-muted rounded p-2">
                        <text class="text-foreground mb-1 text-xs font-medium">
                            {{ t("common.reference.request") }}
                        </text>
                        <text class="text-muted-foreground text-xs break-all">
                            {{ ref.userContent }}
                        </text>
                    </view>

                    <!-- Response section -->
                    <view v-if="ref?.chunks && ref.chunks.length > 0" class="bg-muted rounded p-2">
                        <text class="text-foreground mb-1 text-xs font-medium">
                            {{ t("common.reference.response") }}
                        </text>
                        <view class="text-muted-foreground flex flex-col gap-2 text-xs">
                            <view v-for="(chunk, chunkIndex) in ref.chunks" :key="chunkIndex">
                                <text class="text-foreground font-bold">
                                    #chunk-{{ chunkIndex + 1 }}:
                                </text>
                                <text class="break-all">{{ chunk.content }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>
