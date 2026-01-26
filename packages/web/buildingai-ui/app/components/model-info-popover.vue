<script setup lang="ts">
import type { AiModel, AiProvider } from "@buildingai/service/webapi/ai-conversation";

withDefaults(
    defineProps<{
        model: AiModel;
        provider: AiProvider;
        showBillingRule?: boolean;
    }>(),
    {},
);

const formatContextSize = (size: number): string => {
    if (size >= 1000000) {
        return `${(size / 1000000).toFixed(1)}M`;
    } else if (size >= 1000) {
        return `${(size / 1000).toFixed(0)}K`;
    } else {
        return `${size}`;
    }
};
</script>

<template>
    <div class="bg-background width180 space-y-2 rounded-lg p-3">
        <div class="flex items-center gap-3">
            <div class="flex size-8 items-center justify-center rounded-lg shadow-md">
                <UAvatar
                    :src="provider?.iconUrl"
                    :alt="provider?.name"
                    :ui="{
                        root: 'rounded bg-transparent size-5',
                        fallback: 'text-inverted',
                    }"
                    :class="[provider?.iconUrl ? '' : 'bg-primary']"
                />
            </div>
            <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm font-semibold">{{ provider.name }}</h3>
            </div>
        </div>

        <p class="text-sm font-medium">{{ model.name }}</p>

        <div class="flex flex-wrap gap-2">
            <UBadge variant="soft" color="neutral" size="sm">
                {{ String(model.modelType).toUpperCase() }}
            </UBadge>
            <UBadge v-if="model.modelConfig.mode" variant="soft" color="neutral" size="sm">
                {{ String(model.modelConfig.mode).toUpperCase() }}
            </UBadge>
            <UBadge v-if="model.modelConfig.maxContext" variant="soft" color="neutral" size="sm">
                {{ formatContextSize(model.modelConfig.maxContext as number) }}
            </UBadge>
        </div>

        <div v-if="model.description" class="text-muted-foreground text-sm">
            {{ model.description }}
        </div>

        <div
            v-if="
                model.features?.includes('vision') ||
                model.features?.includes('video') ||
                model.features?.includes('audio')
            "
            class="space-y-2"
        >
            <div class="text-muted-foreground text-xs font-medium">
                {{ $t("common.ai.multimodalCapabilities") }}
            </div>
            <div class="flex flex-wrap gap-1">
                <UBadge
                    v-if="model.features?.includes('vision')"
                    variant="soft"
                    color="info"
                    size="sm"
                >
                    <UIcon name="i-lucide-image-play" class="mr-1" size="xs" />
                    {{ $t("common.ai.vision") }}
                </UBadge>
                <UBadge
                    v-if="model.features?.includes('video')"
                    variant="soft"
                    color="warning"
                    size="sm"
                >
                    <UIcon name="i-lucide-video" class="mr-1" size="xs" />
                    {{ $t("common.ai.video") }}
                </UBadge>
                <UBadge
                    v-if="model.features?.includes('audio')"
                    variant="soft"
                    color="success"
                    size="sm"
                >
                    <UIcon name="i-lucide-audio-lines" class="mr-1" size="xs" />
                    {{ $t("common.ai.audio") }}
                </UBadge>
            </div>
        </div>
    </div>
</template>
