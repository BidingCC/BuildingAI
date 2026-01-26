<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";

const props = withDefaults(
    defineProps<{
        agent: Agent;
        showStats?: boolean;
        variant?: "default" | "hot" | "latest";
    }>(),
    {
        showStats: true,
        variant: "default",
    },
);

const emit = defineEmits<{
    click: [agent: Agent];
}>();

const handleClick = () => {
    emit("click", props.agent);
};
</script>

<template>
    <div
        class="group bg-muted border-border cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-md"
        @click="handleClick"
    >
        <div class="mb-3 flex items-start gap-3">
            <div
                class="border-default bg-muted flex size-10 flex-none items-center justify-center rounded-lg border"
            >
                <NuxtImg
                    :src="agent.avatar"
                    alt="avatar"
                    class="size-10 rounded-lg object-contain"
                />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
                <h3 class="text-foreground truncate text-sm font-medium">
                    {{ agent.name }}
                </h3>

                <div class="text-muted-foreground mt-1 text-xs">
                    <span>{{ $t("ai-agent.backend.create.edit") }}</span>
                    <TimeDisplay :datetime="agent.updatedAt" mode="datetime" />
                </div>
            </div>
        </div>

        <div class="text-muted-foreground h-10 pr-8 text-xs">
            <p class="line-clamp-2 overflow-hidden">
                {{ agent.description }}
            </p>
        </div>

        <div class="flex items-center justify-between pt-2">
            <div class="text-muted-foreground flex items-center gap-3">
                <div class="flex items-center gap-1">
                    <UIcon name="i-lucide-message-square-text" class="size-3" />
                    <span class="text-xs">
                        {{ agent.conversationCount }}
                    </span>
                </div>
                <div class="flex items-center gap-1">
                    <UIcon name="i-lucide-users" class="size-3" />
                    <span class="text-xs">
                        {{ agent.userCount }}
                    </span>
                </div>
            </div>

            <div class="flex items-center gap-1">
                <UTooltip
                    v-if="agent.requiredMembershipLevel"
                    :text="agent.requiredMembershipLevel.name"
                    :delay-duration="0"
                >
                    <UAvatar :src="agent.requiredMembershipLevel.icon" class="size-4" />
                </UTooltip>
                <UTooltip :text="agent.provider?.name" :delay-duration="0">
                    <UAvatar :src="agent.provider?.iconUrl" class="size-4" />
                </UTooltip>
            </div>
        </div>
    </div>
</template>
