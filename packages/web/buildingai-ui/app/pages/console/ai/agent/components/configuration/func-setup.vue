<script setup lang="ts">
import type {
    FormFieldConfig,
    UpdateAgentConfigParams,
} from "@buildingai/service/consoleapi/ai-agent";

import { usePluginSlots } from "@//utils/plugins.utils";

const McpTool = defineAsyncComponent(() => import("./_func_components/mcp-tool.vue"));
const Context = defineAsyncComponent(() => import("./_func_components/context.vue"));
const Datasets = defineAsyncComponent(() => import("./_func_components/datasets.vue"));
const Feedback = defineAsyncComponent(() => import("./_func_components/feedback.vue"));
const Prompt = defineAsyncComponent(() => import("./_func_components/prompt.vue"));
const Public = defineAsyncComponent(() => import("./_func_components/public.vue"));
const Reference = defineAsyncComponent(() => import("./_func_components/reference.vue"));
const Tags = defineAsyncComponent(() => import("./_func_components/tags.vue"));
const Variable = defineAsyncComponent(() => import("./_func_components/variable.vue"));

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

const ThirdPartyIntegration = computed(() => {
    console.log(usePluginSlots("agent:config:third-party").value, state.value.createMode);
    return usePluginSlots("agent:config:third-party").value.find(
        (slot) => slot.meta?.platform === state.value.createMode,
    )?.component;
});
</script>

<template>
    <div class="space-y-4 overflow-y-auto">
        <template v-if="!isThirdParty">
            <!-- 角色设定提示词区域 -->
            <Prompt v-model="state.rolePrompt as string" />

            <!-- 角色设定变量修改区域 -->
            <Variable v-model="state.formFields as FormFieldConfig[]" />

            <!-- 角色设定知识库修改区域 -->
            <Datasets v-model="state.datasetIds as string[]" />

            <!-- MCP工具 -->
            <McpTool v-model="state.mcpServerIds as string[]" />

            <!-- 对话上下文 -->
            <Context v-model="state.showContext as boolean" />

            <!-- 引用来源 -->
            <Reference v-model="state.showReference as boolean" />

            <!-- 反馈按钮 -->
            <Feedback v-model="state.enableFeedback as boolean" />
        </template>

        <template v-else>
            <!-- 第三方平台集成 -->
            <component :is="ThirdPartyIntegration" v-model="state.thirdPartyIntegration" />
        </template>

        <!-- 公开设置 -->
        <Public v-model="state.isPublic as boolean" />

        <!-- 标签 -->
        <Tags v-model="state.tagIds as string[]" />
    </div>
</template>
