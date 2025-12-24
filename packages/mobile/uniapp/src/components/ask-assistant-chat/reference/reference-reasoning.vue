<script setup lang="ts">
import { computed, ref } from "vue";

import { formatDuration } from "@/utils/helper";

const { t } = useI18n();

interface ReasoningData {
    content: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
}

interface Props {
    reasoning?: ReasoningData;
    messageId?: string;
    isThinking?: boolean;
    defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    reasoning: undefined,
    messageId: undefined,
    isThinking: false,
    defaultOpen: false,
});

const thinkingDuration = computed(() => {
    if (props.reasoning?.duration) {
        return formatDuration(props.reasoning.duration);
    }

    if (props.reasoning?.startTime && props.reasoning?.endTime) {
        const duration = props.reasoning.endTime - props.reasoning.startTime;
        return formatDuration(duration);
    }

    return null;
});

const isExpanded = ref(props.defaultOpen);

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<template>
    <view v-if="reasoning?.content || isThinking" class="bg-muted mb-2 rounded-lg p-2">
        <view
            class="flex flex-row items-center gap-2 p-1 text-xs select-none"
            @click="toggleExpand"
        >
            <text class="i-lucide-atom text-primary text-base" />

            <text class="text-sm font-medium">
                {{
                    isThinking
                        ? t("common.chat.reasoning.thinking") || "思考中"
                        : t("common.chat.reasoning.completed") || "思考完成"
                }}
            </text>

            <text v-if="thinkingDuration" class="text-sm font-medium">
                ({{ t("common.chat.reasoning.duration") || "耗时" }}{{ thinkingDuration }})
            </text>

            <text
                :class="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="text-base transition-transform duration-200"
            />
        </view>

        <view
            v-if="isExpanded && reasoning?.content"
            class="text-muted-foreground rounded p-2 text-sm whitespace-pre-wrap"
        >
            {{ reasoning.content }}
        </view>
    </view>
</template>
