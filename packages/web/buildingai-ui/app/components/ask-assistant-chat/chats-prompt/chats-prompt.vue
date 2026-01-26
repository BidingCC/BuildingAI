<script lang="ts" setup>
import type { FileUploadConfig } from "@buildingai/service/consoleapi/ai-agent";
import type { FilesList } from "@buildingai/service/models/message";
import { apiOptimizeText } from "@buildingai/service/webapi/ai-conversation";
import { useFocus } from "@vueuse/core";

import type { FilePreviewItem } from "./prompt-file-preview.vue";
import { type FileItem, usePromptFiles } from "./use-prompt";

interface TextareaInstance {
    textareaRef: HTMLTextAreaElement | null;
}

const emits = defineEmits<{
    (e: "update:modelValue", v: string): void;
    (e: "update:fileList", v: FilesList): void;
    (e: "submit", v: string): void;
    (e: "stop"): void;
}>();

interface ModelConfigInput {
    /** 模型配置：包含模型 ID 及参数、特性等信息 */
    id?: string;
    options?: Record<string, unknown>;
}

const props = withDefaults(
    defineProps<{
        modelValue: string;
        fileList?: FilesList;
        placeholder?: string;
        isLoading?: boolean;
        rows?: number;
        needAuth?: boolean;
        attachmentSizeLimit?: number;
        /** 智能体专属模型配置，包含模型 ID 与参数 */
        modelConfig?: ModelConfigInput;
        /**
         * 直接传入模型特性列表（优先级高于 modelConfig）
         * 用于前台智能体场景，后端直接返回模型特性而不暴露模型配置
         */
        modelFeatures?: string[];
        /**
         * 智能体创建模式：'direct' | 'coze' | 'dify' 等
         * 用于针对不同第三方平台设置不同的文件类型支持
         */
        agentCreateMode?: string;
        /**
         * 第三方平台的文件上传配置（如 Dify 的 allowed_file_extensions）
         */
        fileUploadConfig?: FileUploadConfig;
    }>(),
    {
        modelValue: "",
        fileList: () => [],
        placeholder: "",
        isLoading: false,
        rows: 1,
        needAuth: false,
        attachmentSizeLimit: 10,
    },
);

const uTextareaRefs = useTemplateRef<TextareaInstance | null>("uTextareaRefs");
const textareaElement = computed(() => uTextareaRefs.value?.textareaRef || null);
const inputValue = useVModel(props, "modelValue", emits);
const filesList = useVModel(props, "fileList", emits);
const { t } = useI18n();
const userStore = useUserStore();
const toast = useMessage();

const { focused: isFocused } = useFocus(textareaElement, { initialValue: false });

const originalText = shallowRef("");
const optimizedText = shallowRef("");

const isOptimizedAndUnchanged = computed(() => {
    return optimizedText.value !== "" && inputValue.value.trim() === optimizedText.value.trim();
});

const {
    files,
    isUploading,
    uploadFile,
    addUrl,
    removeFile,
    retryUpload,
    generateFilesList,
    clearFiles,
} = usePromptFiles();

const canSubmit = computed(() => inputValue.value.trim().length > 0 || files.value.length > 0);

function handleFocus() {
    uTextareaRefs.value?.textareaRef?.focus();
    if (!userStore.isAgreed && props.needAuth) {
        navigateTo("/login");
    }
}

function handleKeydown(event: KeyboardEvent) {
    if (event.isComposing) {
        return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        // 当 isLoading 存在时，禁止回车触发
        if (props.isLoading) {
            return;
        }

        if (!canSubmit.value) {
            return;
        }

        emits("submit", inputValue.value);
    }
}

function handleSubmit() {
    if (props.isLoading) {
        emits("stop");
    } else {
        if (!canSubmit.value) return;
        emits("submit", inputValue.value);
    }
}

async function handleFileSelect(file: File) {
    const result = await uploadFile(file);
    if (result) {
        filesList.value = generateFilesList();
    }
}

async function handleUrlSubmit(url: string) {
    const success = await addUrl(url);
    if (success) {
        filesList.value = generateFilesList();
    }
}

function handleFileRemove(file: FileItem | FilePreviewItem) {
    if ("id" in file) {
        removeFile(file as FileItem);
        filesList.value = generateFilesList();
    }
}

async function handleRetryUpload(file: FileItem | FilePreviewItem) {
    if ("id" in file) {
        const result = await retryUpload(file as FileItem);
        if (result) {
            filesList.value = generateFilesList();
        }
    }
}

const { lockFn: handleOptimizeText, isLock: isOptimizing } = useLockFn(async () => {
    if (!inputValue.value.trim()) {
        toast.warning(t("common.chat.messages.enterQuestion"));
        return;
    }

    if (props.isLoading) {
        return;
    }

    try {
        originalText.value = inputValue.value.trim();

        const modelId = localStorage.getItem("modelId") || undefined;

        const result = await apiOptimizeText({
            modelId,
            text: originalText.value,
        });

        if (result.optimizedText) {
            optimizedText.value = result.optimizedText;
            inputValue.value = result.optimizedText;
            toast.success(t("common.chat.messages.optimizeSuccess"));
        } else {
            toast.warning(t("common.chat.messages.optimizeEmpty"));
        }
    } catch (error: unknown) {
        console.error("文案优化失败:", error);
        const errorMessage = (error as Error)?.message || t("common.chat.messages.optimizeFailed");
        toast.error(errorMessage);
    }
});

function handleRevertText() {
    if (originalText.value) {
        inputValue.value = originalText.value;
        optimizedText.value = "";
        originalText.value = "";
    }
}

watch(
    () => props.fileList,
    (newFileList) => {
        if (newFileList.length === 0 && files.value.length > 0) {
            clearFiles();
        }
    },
);

onMounted(() =>
    nextTick(() => {
        if (userStore.isAgreed) {
            handleFocus();
        }
    }),
);
</script>

<template>
    <div
        class="chat-action-bar w-full rounded-md border p-1.5 transition-[border-color_box-shadow] duration-200 sm:rounded-2xl"
        :class="isFocused ? 'ring-primary/15 border-primary ring-3' : 'border-border'"
        @click.stop="handleFocus"
    >
        <div class="flex items-center gap-2">
            <slot name="panel-top"> </slot>
        </div>

        <PromptFilePreview
            v-if="files.length > 0"
            :files="[...files]"
            :show-actions="true"
            class="p-1.5"
            @remove="handleFileRemove"
            @retry="handleRetryUpload"
        />
        <UTextarea
            ref="uTextareaRefs"
            v-model="inputValue"
            class="custom-textarea-wrapper w-full"
            :class="{ 'optimizing-text': isOptimizing }"
            style="--ui-bg-elevated: var(--color-background)"
            variant="ghost"
            :rows="rows"
            :maxrows="8"
            :highlight="false"
            :autoresize="true"
            :ui="{
                base: 'resize-none custom-textarea text-base min-h-[40px] focus:bg-transparent hover:bg-transparent',
            }"
            :placeholder="placeholder || t('common.chat.messages.inputPlaceholder')"
            :disabled="isOptimizing"
            @keydown="handleKeydown"
        />
        <!-- Operations -->
        <div class="flex items-end justify-between p-0 sm:p-2">
            <!-- Features -->
            <div class="flex items-center gap-2">
                <slot name="panel-left">
                    <div>
                        <!--  -->
                    </div>
                </slot>
            </div>
            <!-- Send -->
            <slot name="panel-right">
                <div class="flex items-center gap-2">
                    <UTooltip
                        v-if="isOptimizedAndUnchanged"
                        :text="t('common.chat.messages.revertText')"
                        :delay-duration="0"
                        :arrow="true"
                    >
                        <UButton
                            icon="i-lucide-undo-2"
                            class="rounded-full font-bold"
                            size="lg"
                            variant="ghost"
                            color="primary"
                            :disabled="props.isLoading"
                            @click.stop="handleRevertText"
                        />
                    </UTooltip>
                    <UTooltip
                        v-else
                        :text="
                            isOptimizing
                                ? t('common.chat.messages.optimizing')
                                : !inputValue?.trim()
                                  ? t('common.chat.messages.enterQuestion')
                                  : t('common.chat.messages.optimizeText')
                        "
                        :delay-duration="0"
                        :arrow="true"
                    >
                        <UButton
                            icon="i-lucide-sparkles"
                            class="rounded-full font-bold"
                            size="lg"
                            variant="ghost"
                            color="primary"
                            :disabled="isOptimizing || !inputValue?.trim() || props.isLoading"
                            :loading="isOptimizing"
                            @click.stop="handleOptimizeText"
                        />
                    </UTooltip>
                    <PromptFileUpload
                        :disabled="isUploading"
                        :maxSize="attachmentSizeLimit"
                        :model-config="modelConfig"
                        :model-features="modelFeatures"
                        :agent-create-mode="agentCreateMode"
                        :file-upload-config="fileUploadConfig"
                        @file-select="handleFileSelect"
                        @url-submit="handleUrlSubmit"
                    />
                    <slot name="panel-right-item"></slot>
                    <UTooltip
                        :content="{ align: 'center', side: 'top', sideOffset: 8 }"
                        :text="
                            isLoading
                                ? t('common.chat.messages.stopGeneration')
                                : !canSubmit
                                  ? t('common.chat.messages.enterQuestion')
                                  : t('common.chat.messages.sendMessage')
                        "
                        :delay-duration="0"
                        :arrow="true"
                        :disabled="isLoading || canSubmit"
                    >
                        <UButton
                            :icon="isLoading ? 'i-lucide-square' : 'i-lucide-arrow-up'"
                            class="rounded-full font-bold"
                            size="lg"
                            :disabled="!isLoading && !canSubmit"
                            :color="isLoading ? 'error' : 'primary'"
                            @click.stop="handleSubmit"
                        />
                    </UTooltip>
                </div>
            </slot>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.chat-action-bar {
    :deep(.custom-textarea) {
        /* Scrollbar styles */
        & {
            /* Firefox scrollbar styles */
            scrollbar-width: thin;
            scrollbar-color: var(--color-border) transparent;
        }

        /* Webkit scrollbar styles */
        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
            background-color: var(--color-border);
            border-radius: 4px;

            &:hover {
                background-color: var(--color-muted);
            }
        }
    }

    :deep(.textarea-wrapper) {
        min-height: 40px !important;
    }
}

.optimizing-text {
    :deep(.custom-textarea) {
        color: transparent;
        background: linear-gradient(90deg, #000 0%, #888 20%, #ccc 50%, #888 80%, #000 100%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        animation: optimizing-text-shimmer 2s ease-in-out infinite;
    }

    :deep(.custom-textarea::placeholder) {
        color: var(--color-muted-foreground);
        -webkit-text-fill-color: var(--color-muted-foreground);
        background: none;
        background-clip: unset;
        -webkit-background-clip: unset;
    }
}

.chat-action-bar:deep(.dark) .optimizing-text,
:global(.dark) .optimizing-text {
    :deep(.custom-textarea) {
        color: transparent;
        background: linear-gradient(90deg, #fff 0%, #bbb 20%, #666 50%, #bbb 80%, #fff 100%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        animation: optimizing-text-shimmer 2s ease-in-out infinite;
    }

    :deep(.custom-textarea::placeholder) {
        color: var(--color-muted-foreground);
        -webkit-text-fill-color: var(--color-muted-foreground);
        background: none;
        background-clip: unset;
        -webkit-background-clip: unset;
    }
}

@keyframes optimizing-text-shimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}
</style>
