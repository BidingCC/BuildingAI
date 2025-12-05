<script setup lang="ts">
import type { CreateAgentAnnotationParams } from "@buildingai/service/consoleapi/ai-agent";
import {
    apiCreateAgentAnnotation,
    apiGetAgentAnnotationDetail,
    apiUpdateAgentAnnotation,
} from "@buildingai/service/consoleapi/ai-agent";
import type { AiMessage } from "@buildingai/service/models/message";
import {
    apiCreateAnnotation,
    apiGetAnnotationDetail,
    apiUpdateAnnotation,
} from "@buildingai/service/webapi/ai-agent-publish";
import { boolean, object, string } from "yup";

const props = defineProps<{
    /** 智能体ID */
    agentId: string;
    /** 标注ID，如果为null则为创建模式 */
    annotationId: string | null;
    /** 是否隐藏状态 */
    hiddenStatus?: boolean;
    /** 对话消息ID，用于关联对话消息的metadata */
    messageId?: string | null;
    /** 是否为公开访问模式 */
    isPublic?: boolean;
    /** 发布令牌（公开访问模式需要） */
    publishToken?: string;
    /** 访问令牌（公开访问模式需要） */
    accessToken?: string;
    /** 初始数据（创建模式时使用） */
    initialData?: {
        question: string;
        answer: string;
        enabled: boolean;
    };
}>();

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
    (e: "result", value?: AiMessage): void;
}>();

const toast = useMessage();
const { t } = useI18n();

const formData = shallowRef<CreateAgentAnnotationParams>({
    question: "",
    answer: "",
    enabled: true,
});

const schema = object({
    question: string().required("请输入标注问题"),
    answer: string().required("请输入标注答案"),
    enabled: boolean(),
});

const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        let data;
        if (props.isPublic && props.publishToken && props.accessToken) {
            // 公开访问模式
            data = await apiGetAnnotationDetail(
                props.publishToken,
                props.accessToken,
                props.annotationId as string,
            );
        } else {
            // 管理后台模式
            data = await apiGetAgentAnnotationDetail(props.annotationId as string);
        }

        // 填充表单数据
        formData.value = {
            question: data.question,
            answer: data.answer,
            enabled: data.enabled,
        };
    } catch (error) {
        console.error("获取标注详情失败:", error);
    }
});

// 提交表单
const { lockFn: submitForm, isLock: submitting } = useLockFn(async () => {
    try {
        if (props.annotationId) {
            // 更新标注
            if (props.isPublic && props.publishToken && props.accessToken) {
                // 公开访问模式
                await apiUpdateAnnotation(
                    props.publishToken,
                    props.accessToken,
                    props.annotationId,
                    {
                        ...formData.value,
                        messageId: props.messageId || undefined,
                    },
                );
            } else {
                // 管理后台模式
                await apiUpdateAgentAnnotation(props.annotationId, {
                    ...formData.value,
                    messageId: props.messageId || undefined,
                });
            }
            toast.success(t("ai-agent.backend.logs.success"));
        } else {
            // 创建标注
            let result;
            if (props.isPublic && props.publishToken && props.accessToken) {
                // 公开访问模式
                result = await apiCreateAnnotation(props.publishToken, props.accessToken, {
                    ...formData.value,
                    agentId: props.agentId,
                    messageId: props.messageId || undefined,
                });
            } else {
                // 管理后台模式
                result = await apiCreateAgentAnnotation(props.agentId, {
                    ...formData.value,
                    agentId: props.agentId,
                    messageId: props.messageId || undefined,
                });
            }
            toast.success(t("ai-agent.backend.logs.createAnnotationSuccess"));
            // 传递创建结果给父组件
            emits("result", result);
            emits("close", true);
            return;
        }
        emits("close", true);
    } catch (error) {
        console.error(`${props.annotationId ? "更新" : "创建"}标注失败:`, error);
    }
});

// 组件挂载时初始化数据
onMounted(async () => {
    if (props.annotationId) {
        // 如果有标注ID，则获取详情数据（编辑模式）
        fetchDetail();
    } else if (props.initialData) {
        // 如果有初始数据，则预填充表单（创建模式）
        formData.value = {
            question: props.initialData.question,
            answer: props.initialData.answer,
            enabled: props.initialData.enabled,
        };
    }
});
</script>

<template>
    <BdModal
        :title="
            props.annotationId
                ? t('ai-agent.backend.logs.updateAnnotation')
                : t('ai-agent.backend.logs.addAnnotation')
        "
        :description="
            props.annotationId
                ? t('ai-agent.backend.logs.updateAnnotationDesc')
                : t('ai-agent.backend.logs.addAnnotationDesc')
        "
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close')"
    >
        <!-- 加载状态 -->
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 576px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <!-- 表单内容 -->
        <UForm v-else :schema="schema" :state="formData" class="space-y-4" @submit="submitForm">
            <div class="flex flex-col gap-4">
                <UFormField :label="t('ai-agent.backend.logs.question')" name="question" required>
                    <UTextarea
                        v-model="formData.question"
                        :placeholder="t('ai-agent.backend.logs.questionPlaceholder')"
                        :rows="5"
                        :ui="{ root: 'w-full' }"
                    />
                    <template #hint> {{ t("ai-agent.backend.logs.questionHint") }} </template>
                </UFormField>

                <UFormField :label="t('ai-agent.backend.logs.answer')" name="answer" required>
                    <div class="h-full min-h-70 w-full">
                        <BdEditor v-model="formData.answer" custom-class="!min-h-70 " />
                    </div>
                    <template #hint> {{ t("ai-agent.backend.logs.answerHint") }} </template>
                </UFormField>

                <UFormField
                    v-if="hiddenStatus"
                    :label="t('ai-agent.backend.logs.enabled')"
                    name="enabled"
                >
                    <div class="flex items-center gap-3">
                        <USwitch v-model="formData.enabled" color="primary" />
                        <span class="text-muted-foreground text-sm">
                            {{
                                formData.enabled
                                    ? t("console-common.enabled")
                                    : t("console-common.disabled")
                            }}
                        </span>
                    </div>
                    <template #hint> {{ t("ai-agent.backend.logs.enabledHint") }} </template>
                </UFormField>
            </div>

            <!-- 底部按钮 -->
            <div class="mt-6 flex justify-end gap-2">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close')">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" :loading="submitting" type="submit">
                    {{
                        props.annotationId ? t("console-common.update") : t("console-common.create")
                    }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
