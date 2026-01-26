<script setup lang="ts">
import type {
    AutoQuestionsConfig,
    QuickCommandConfig,
    UpdateAgentConfigParams,
} from "@buildingai/service/consoleapi/ai-agent";

import { usePluginSlots } from "@//utils/plugins.utils";

const ChatAvatar = defineAsyncComponent(() => import("./_user_components/chat-avatar.vue"));
const Command = defineAsyncComponent(() => import("./_user_components/command.vue"));
const Problem = defineAsyncComponent(() => import("./_user_components/problem.vue"));
const Prologue = defineAsyncComponent(() => import("./_user_components/prologue.vue"));
const Suggest = defineAsyncComponent(() => import("./_user_components/suggest.vue"));

const props = defineProps<{
    modelValue: UpdateAgentConfigParams;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: UpdateAgentConfigParams): void;
}>();

const state = useVModel(props, "modelValue", emit);

const isThirdParty = computed(() => {
    return usePluginSlots("agent:config:third-party").value.filter(
        (slot) => slot.meta?.platform === state.value.createMode,
    ).length;
});
</script>

<template>
    <div class="space-y-4 overflow-y-auto">
        <template v-if="!isThirdParty">
            <!-- 开场白区域 -->
            <Prologue v-model="state.openingStatement as string" />

            <!-- 开场问题区域 -->
            <Problem v-model="state.openingQuestions as string[]" />

            <!-- 自动追问区域 -->
            <Suggest v-model="state.autoQuestions as AutoQuestionsConfig" />
        </template>

        <!-- 快捷指令区域 -->
        <Command v-model="state.quickCommands as QuickCommandConfig[]" />

        <!-- 对话头像区域 -->
        <ChatAvatar v-model="state.chatAvatar as string" />
    </div>
</template>
