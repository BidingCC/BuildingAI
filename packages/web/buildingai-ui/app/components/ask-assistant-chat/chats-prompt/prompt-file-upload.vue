<script setup lang="ts">
import type { FileUploadConfig } from "@buildingai/service/consoleapi/ai-agent";
import { apiGetAiModel } from "@buildingai/service/webapi/ai-conversation";

const emits = defineEmits<{
    (e: "file-select", file: File): void;
    (e: "url-submit", url: string): void;
}>();

interface ModelConfigInput {
    /** 模型配置：包含模型 ID 及参数、特性等信息 */
    id?: string;
    options?: {
        /** 模型特性列表（如 vision/audio 等），从模型参数中透传 */
        features?: string[];
        /** 其他模型参数 */
        [key: string]: unknown;
    };
}

const props = defineProps<{
    disabled?: boolean;
    maxSize?: number;
    accept?: string;
    /** 当外部传入模型配置时优先使用，未传则回退全局选中的模型 */
    modelConfig?: ModelConfigInput;
    /**
     * 直接传入模型特性列表（优先级最高）
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
}>();

const controlsStore = useControlsStore();
const fileInputRefs = useTemplateRef<HTMLInputElement>("fileInputRefs");
const remoteUrls = shallowRef<string>("");
const isOpen = shallowRef(false);
const toast = useMessage();
const { t } = useI18n();

const remoteModelFeatures = shallowRef<string[]>([]);
const modelFeatures = computed<string[]>(() => {
    // 优先使用直接传入的 modelFeatures
    if (props.modelFeatures?.length) {
        return props.modelFeatures;
    }
    if (remoteModelFeatures.value.length > 0) {
        return remoteModelFeatures.value;
    }
    if (props.modelConfig?.options?.features?.length) {
        return props.modelConfig.options.features;
    }
    return controlsStore.selectedModel?.features || [];
});

/**
 * 根据模型 ID 远程获取模型特性
 * @param modelId 模型 ID
 */
const fetchModelFeatures = async (modelId?: string) => {
    // 如果已经通过 modelFeatures prop 直接传入了，无需远程获取
    if (props.modelFeatures?.length) {
        remoteModelFeatures.value = [];
        return;
    }
    if (!modelId) {
        remoteModelFeatures.value = [];
        return;
    }
    try {
        const detail = await apiGetAiModel(modelId);
        remoteModelFeatures.value = detail?.features || [];
    } catch (error) {
        console.error("获取模型信息失败:", error);
        remoteModelFeatures.value = [];
    }
};

watch(
    () => props.modelConfig?.id,
    (id) => fetchModelFeatures(id),
    { immediate: true },
);

/**
 * 所有支持的文件类型（用于 Coze 智能体，支持所有类型）
 */
const ALL_SUPPORTED_TYPES = {
    document: [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf", ".csv", ".xlsx", ".xls", ".pptx"],
    image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"],
    audio: [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
    video: [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"],
};

const supportedFileTypes = computed(() => {
    // 1. 如果是 Coze 智能体，支持所有类型
    if (props.agentCreateMode === "coze") {
        const allTypes = [
            ...ALL_SUPPORTED_TYPES.document,
            ...ALL_SUPPORTED_TYPES.image,
            ...ALL_SUPPORTED_TYPES.audio,
            ...ALL_SUPPORTED_TYPES.video,
        ];
        return allTypes.join(",");
    }
    // 2. 如果是 Dify 智能体，使用 fileUploadConfig 中的 allowedFileExtensions
    if (props.agentCreateMode === "dify" && props.fileUploadConfig) {
        const config = props.fileUploadConfig;

        // 如果文件上传未启用，返回空
        if (config.enabled === false) {
            return "";
        }

        // 优先使用 allowedFileExtensions
        if (config.allowedFileExtensions?.length) {
            // 确保扩展名以点开头
            return config.allowedFileExtensions
                .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`))
                .join(",");
        }

        // 如果有 allowedFileTypes，根据类型映射扩展名
        if (config.allowedFileTypes?.length) {
            const extensions: string[] = [];
            for (const type of config.allowedFileTypes) {
                const lowerType = type.toLowerCase();
                if (lowerType === "image" || lowerType.includes("image")) {
                    extensions.push(...ALL_SUPPORTED_TYPES.image);
                }
                if (lowerType === "document" || lowerType.includes("document")) {
                    extensions.push(...ALL_SUPPORTED_TYPES.document);
                }
                if (lowerType === "audio" || lowerType.includes("audio")) {
                    extensions.push(...ALL_SUPPORTED_TYPES.audio);
                }
                if (lowerType === "video" || lowerType.includes("video")) {
                    extensions.push(...ALL_SUPPORTED_TYPES.video);
                }
            }
            if (extensions.length) {
                return [...new Set(extensions)].join(",");
            }
        }

        // Dify 未配置具体类型时，默认支持文档和图片
        return [...ALL_SUPPORTED_TYPES.document, ...ALL_SUPPORTED_TYPES.image].join(",");
    }

    // 3. 默认模式（direct 或其他）：根据模型特性决定
    // 如果没有任何模型特性来源，只支持文档类型
    if (!props.modelFeatures?.length && !props.modelConfig && !controlsStore.selectedModel) {
        return ".pdf,.doc,.docx,.txt,.md";
    }

    const features = modelFeatures.value || [];
    const supportedTypes: string[] = [];

    // 始终支持文档类型（因为提示内容说"支持各类文档"）
    supportedTypes.push(...ALL_SUPPORTED_TYPES.document);

    // 如果模型支持图片，添加图片类型
    if (features.includes("vision")) {
        supportedTypes.push(...ALL_SUPPORTED_TYPES.image);
    }

    // 如果模型支持音频，添加音频类型
    if (features.includes("audio")) {
        supportedTypes.push(...ALL_SUPPORTED_TYPES.audio);
    }

    return supportedTypes.join(",");
});

const tooltipContent = computed(() => {
    const maxCount = 10;
    const maxSize = props.maxSize || 100;
    const supportsImage = modelFeatures.value.includes("vision");

    const firstLine = t("common.chat.messages.uploadAttachmentTextOnly");
    const secondLine = t("common.chat.messages.fileUploadLimit", {
        count: maxCount,
        size: maxSize,
    });
    const imageText = supportsImage ? t("common.chat.messages.supportsImage") : "";

    return `${firstLine}\n${secondLine}${imageText}`;
});

const handleClickButton = () => {
    isOpen.value = false;
    fileInputRefs.value?.click();
};

function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
        emits("file-select", file);
    }
    // Clear input value to allow selecting the same file again
    input.value = "";
}

function getFileExtensionFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const extension = pathname.split(".").pop()?.toLowerCase() || "";
        return extension ? `.${extension}` : "";
    } catch {
        // If URL parsing fails, try to extract extension from path
        const extension = url.split(".").pop()?.toLowerCase() || "";
        return extension ? `.${extension}` : "";
    }
}

function isFileTypeSupported(fileExtension: string): boolean {
    if (!fileExtension) return false;

    const supportedTypes = supportedFileTypes.value.split(",").map((type) => type.trim());
    return supportedTypes.includes(fileExtension.toLowerCase());
}

function handleUrlSubmit() {
    const url = remoteUrls.value.trim();
    if (!url) return;

    // Validate URL format
    try {
        new URL(url);
    } catch {
        toast.error(t("common.message.invalidUrl"));
        return;
    }

    // Check if file type is supported
    const fileExtension = getFileExtensionFromUrl(url);
    if (!isFileTypeSupported(fileExtension)) {
        toast.error(t("common.message.unsupportedFileType"));
        return;
    }

    emits("url-submit", url);
    remoteUrls.value = "";
    isOpen.value = false;
}
</script>

<template>
    <UPopover v-model:open="isOpen">
        <UTooltip :delay-duration="0" :ui="{ content: 'w-xs h-auto' }">
            <UButton
                @click.stop
                size="lg"
                variant="ghost"
                icon="i-lucide-paperclip"
                class="rounded-full font-bold"
                :disabled="disabled || !supportedFileTypes"
            >
            </UButton>
            <template #content>
                <div class="text-background text-xs whitespace-pre-line">
                    {{ tooltipContent }}
                </div>
            </template>
        </UTooltip>
        <template #content>
            <div class="p-3">
                <div>
                    <UInput
                        v-model="remoteUrls"
                        :ui="{ root: 'w-full', trailing: '!pe-0 !pr-1' }"
                        :placeholder="t('common.chat.messages.inputUrlPlaceholder')"
                    >
                        <template #trailing>
                            <UButton size="xs" @click.stop="handleUrlSubmit">
                                {{ t("common.confirm") }}
                            </UButton>
                        </template>
                    </UInput>
                </div>
                <USeparator
                    class="my-2"
                    :ui="{ container: 'text-xs font-normal text-muted-foreground' }"
                    label="OR"
                />
                <div class="flex items-center gap-2">
                    <UButton
                        size="sm"
                        :label="t('common.upload')"
                        :ui="{ base: 'flex-1 justify-center' }"
                        icon="i-lucide-cloud-upload"
                        variant="outline"
                        :disabled="disabled"
                        @click="handleClickButton"
                    />
                </div>
                <input
                    ref="fileInputRefs"
                    type="file"
                    :accept="accept || supportedFileTypes"
                    class="hidden"
                    :disabled="disabled"
                    @change="handleFileSelect"
                />
            </div>
        </template>
    </UPopover>
</template>
