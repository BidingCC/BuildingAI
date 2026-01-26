<script setup lang="ts">
const { t } = useI18n();

const props = defineProps<{
    modelValue: string[];
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string[]): void;
}>();

const mcpServers = useVModel(props, "modelValue", emit);
</script>

<template>
    <div class="bg-muted flex items-center justify-between rounded-lg p-3">
        <div class="flex flex-col gap-1">
            <span class="text-foreground text-sm font-medium">
                {{ t("ai-agent.backend.configuration.mcp.title") }}
            </span>
            <span class="text-muted-foreground text-xs">
                {{ t("ai-agent.backend.configuration.mcp.description") }}
            </span>
        </div>
        <McpToolSelect v-model="mcpServers" capability="agent" :console="true" :use-cache="false" />
    </div>
</template>
