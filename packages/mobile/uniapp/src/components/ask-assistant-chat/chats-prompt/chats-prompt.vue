<script setup lang="ts">
import type { FilesList } from "@buildingai/service/models/message";
import { useVModel } from "@vueuse/core";
import { onMounted, watch } from "vue";

import type { AiModel } from "@/service/ai-conversation";

import type { FilePreviewItem } from "./prompt-file-preview.vue";
import PromptFilePreview from "./prompt-file-preview.vue";
import PromptFileUpload from "./prompt-file-upload.vue";
import { type FileItem, usePromptFiles } from "./use-prompt";

const emits = defineEmits<{
    (e: "update:modelValue", v: string): void;
    (e: "update:fileList", v: FilesList): void;
    (e: "submit", v: string): void;
    (e: "stop"): void;
}>();

const props = withDefaults(
    defineProps<{
        modelValue: string;
        fileList?: FilesList;
        placeholder?: string;
        isLoading?: boolean;
        rows?: number;
        needAuth?: boolean;
        attachmentSizeLimit?: number;
        selectedModel?: AiModel | null;
    }>(),
    {
        modelValue: "",
        fileList: () => [],
        placeholder: "",
        isLoading: false,
        rows: 1,
        needAuth: false,
        attachmentSizeLimit: 10,
        selectedModel: null,
    },
);

const inputValue = useVModel(props, "modelValue", emits);
const filesList = useVModel(props, "fileList", emits);

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

const keyboardHeight = shallowRef(0);
const keyboardIsShow = shallowRef(false);
const tabbarHeight = shallowRef(0);

onMounted(() => {
    const systemInfo = uni.getSystemInfoSync();
    const safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 0;
    tabbarHeight.value = safeAreaBottom + 40;
});

const chatActionBarStyle = computed(() => {
    if (keyboardIsShow.value && keyboardHeight.value > 0) {
        const adjustedHeight = Math.max(0, keyboardHeight.value - tabbarHeight.value);
        return {
            paddingBottom: `${adjustedHeight}px`,
        };
    }
    return {};
});

function handleKeyboardHeightChange(e: { detail: { height: number } }) {
    const height = e.detail.height || 0;
    keyboardHeight.value = height;
    keyboardIsShow.value = height > 0;
}

function handleKeyboardHide() {
    keyboardIsShow.value = false;
    keyboardHeight.value = 0;
}

function handleSubmit() {
    if (props.isLoading) {
        emits("stop");
    } else {
        if (!inputValue.value.trim() && files.value.length === 0) return;
        emits("submit", inputValue.value);
        // Clear file list after submission
        clearFiles();
        filesList.value = [];
    }
}

async function handleFileSelect(file: File | string) {
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

watch(
    () => props.fileList,
    (newFileList) => {
        if (newFileList.length === 0 && files.value.length > 0) {
            clearFiles();
        }
    },
);
</script>

<template>
    <view>
        <PromptFilePreview
            v-if="files.length > 0"
            :files="[...files]"
            :show-actions="true"
            @remove="handleFileRemove"
            @retry="handleRetryUpload"
        />
        <view
            class="chat-action-bar bg-background border-muted safe-area-inset-bottom rounded-t-2xl border border-solid p-2"
            :style="chatActionBarStyle"
            id="noswipe"
        >
            <view p="2">
                <textarea
                    :adjust-position="false"
                    v-model="inputValue"
                    placeholder="给 小助手 发送消息"
                    focus
                    auto-height
                    :cursor-spacing="-1"
                    class="textarea-input w-full"
                    confirm-type="send"
                    :maxlength="-1"
                    :show-confirm-bar="false"
                    @keyboardheightchange="handleKeyboardHeightChange"
                    @blur="handleKeyboardHide"
                    @confirm="handleSubmit"
                />
            </view>
            <view class="action-bar" flex="~ items-center justify-between" px="1">
                <view flex="~ items-center gap-2">
                    <slot flex="~ items-center gap-2" name="action-left">
                        <view class="p-1.5">
                            <text i-lucide-settings-2 />
                        </view>
                    </slot>
                </view>
                <view flex="~ items-center gap-2">
                    <PromptFileUpload
                        :disabled="isUploading"
                        :max-size="attachmentSizeLimit"
                        :selected-model="selectedModel"
                        @file-select="handleFileSelect"
                        @url-submit="handleUrlSubmit"
                    />
                    <view
                        flex="~ items-center justify-center"
                        class="bg-primary rounded-full p-2"
                        @click="handleSubmit"
                    >
                        <text i-lucide-arrow-up text="white" />
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<style scoped>
.chat-action-bar {
    box-shadow:
        0 0 8px 0 rgba(145 158 171 / 0.2),
        0 0 24px -4px rgba(145 158 171 / 0.12);
    user-select: none;
    transition: padding-bottom 0.3s;
}

.textarea-input {
    min-height: 32px;
    max-height: 300px;
    box-sizing: border-box;
    line-height: 1.6;
}
</style>
