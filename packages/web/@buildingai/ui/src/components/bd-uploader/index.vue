<script setup lang="ts">
import { uploadFileAdaptive, uploadFilesAdaptive } from "@buildingai/upload";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import type { Composer } from "vue-i18n";

import { getFileIcon } from "../../images";
import { UPLOAD_STATUS } from "./constants";
import type { BdUploaderEmits, BdUploaderProps, UploadItem } from "./types";

const props = withDefaults(defineProps<BdUploaderProps>(), {
    showPreviewButton: true,
    showReplaceButton: true,
    showRemoveButton: true,
});

const emit = defineEmits<BdUploaderEmits>();

// 获取 FormField 上下文，用于触发表单校验
const formField = useFormField();

const { $i18n } = useNuxtApp();
const { t } = $i18n as Composer;

const fileList = ref<UploadItem[]>([]);
const fileInputRef = useTemplateRef("fileInputRef");
const globalProgress = ref(0);
const showGlobalProgress = ref(false);
const errorMessage = ref("");
const replacingIndex = ref<number | null>(null);
const componentId = ref(`bd-uploader-${generateUniqueId()}`);
const message = useMessage();

const customClassName = computed(() => props.class || "h-28 w-full");
const showAddButton = computed(() =>
    props.single
        ? fileList.value.length === 0
        : props.maxCount
          ? fileList.value.length < props.maxCount
          : true,
);

watch(() => props.modelValue, initFileList, { immediate: true });

function initFileList() {
    fileList.value = [];
    if (!props.modelValue) return;

    if (props.single && typeof props.modelValue === "string" && props.modelValue) {
        const fileName = getFileNameFromUrl(props.modelValue);
        const extension = getFileExtension(fileName);
        fileList.value = [
            {
                id: generateUniqueId(),
                name: fileName,
                size: 0,
                type: getFileTypeFromExtension(extension),
                url: props.modelValue,
                progress: 100,
                status: UPLOAD_STATUS.SUCCESS,
                extension,
                isImage: isImageByExtension(extension),
                isVideo: isVideoByExtension(extension),
            },
        ];
    } else if (Array.isArray(props.modelValue)) {
        fileList.value = props.modelValue.map((url) => {
            const fileName = getFileNameFromUrl(url);
            const extension = getFileExtension(fileName);
            return {
                id: generateUniqueId(),
                name: fileName,
                size: 0,
                type: getFileTypeFromExtension(extension),
                url,
                progress: 100,
                status: UPLOAD_STATUS.SUCCESS,
                extension,
                isImage: isImageByExtension(extension),
                isVideo: isVideoByExtension(extension),
            };
        });
    }
}

async function handleFileUpload(event: Event) {
    try {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files || !files.length) return;

        errorMessage.value = "";

        if (props.multiple && files.length > 1 && !props.single) {
            await handleMultipleFilesUpload(files);
        } else {
            const file = files[0];
            if (!file || !validateFile(file)) return;

            const uploadItem = createUploadItem(file);
            addOrReplaceFile(uploadItem);
            await uploadAndProcessFile(uploadItem);
        }
    } finally {
        nextTick(() => {
            const input = fileInputRef.value as unknown as HTMLInputElement;
            if (input) {
                input.value = "";
            }
        });
    }
}

async function handleMultipleFilesUpload(files: FileList) {
    if (props.maxCount && fileList.value.length + files.length > props.maxCount) {
        message.warning(t("common.message.maxCount", { count: props.maxCount }));
        emit("exceed", Array.from(files));
        return;
    }

    const validFiles = Array.from(files).filter(validateFile);
    if (!validFiles.length) return;

    showGlobalProgress.value = true;
    globalProgress.value = 0;

    try {
        const uploadFn = props.uploadApi || uploadFilesAdaptive;
        const response = await uploadFn(
            {
                files: validFiles,
                ...(props.extensionId && { extensionId: props.extensionId }),
            },
            {
                onProgress: (progress: number) => {
                    globalProgress.value = progress;
                },
            },
        );

        if (Array.isArray(response)) {
            response.forEach((fileResponse) => {
                const uploadItem: UploadItem = {
                    id: generateUniqueId(),
                    name: fileResponse.originalName,
                    size: fileResponse.size,
                    type: fileResponse.type,
                    url: fileResponse.url,
                    progress: 100,
                    status: UPLOAD_STATUS.SUCCESS,
                    extension: fileResponse.extension,
                    isImage: isImageByExtension(fileResponse.extension),
                    isVideo: isVideoByExtension(fileResponse.extension),
                };

                fileList.value.push(uploadItem);
                emit("success", uploadItem, fileResponse);
            });

            updateModelValue();
            message.success(t("common.message.uploadSuccess"));
        }
    } catch (error: any) {
        console.error("文件上传失败:", error);
        message.error(error?.message || t("common.message.uploadFailed"));
    } finally {
        setTimeout(() => {
            showGlobalProgress.value = false;
        }, 500);
    }
}

async function uploadAndProcessFile(uploadItem: UploadItem) {
    if (!uploadItem.file) {
        console.error("上传文件不存在");
        return;
    }

    showGlobalProgress.value = true;
    globalProgress.value = 0;

    try {
        const uploadFn = props.uploadApi || uploadFileAdaptive;
        const response = await uploadFn(
            {
                file: uploadItem.file,
                ...(props.extensionId && { extensionId: props.extensionId }),
            },
            {
                onProgress: (progress: number) => {
                    const index = fileList.value.findIndex((file) => file.id === uploadItem.id);

                    if (index !== -1 && fileList.value[index]) {
                        fileList.value[index].progress = progress;
                        globalProgress.value = progress;
                        emit("progress", fileList.value[index], progress);
                    }
                },
            },
        );

        const index = fileList.value.findIndex((file) => file.id === uploadItem.id);
        if (index !== -1 && fileList.value[index]) {
            fileList.value[index].progress = 100;
            fileList.value[index].status = UPLOAD_STATUS.SUCCESS;

            if (response) {
                fileList.value[index].url = response.url;
                fileList.value[index].extension = response.extension;
            }

            updateModelValue();
            emit("success", fileList.value[index], response);

            setTimeout(() => {
                message.success(t("common.message.uploadSuccess"));
            }, 1000);
        }
    } catch (error: any) {
        const index = fileList.value.findIndex((file) => file.id === uploadItem.id);
        if (index !== -1 && fileList.value[index]) {
            emit("error", fileList.value[index], error);
            removeFile(index);
        }

        console.error("文件上传失败:", error);
        message.error(error?.message || "上传失败");
    } finally {
        setTimeout(() => {
            showGlobalProgress.value = false;
        }, 500);
    }
}

function createUploadItem(file: File): UploadItem {
    const extension = getFileExtension(file.name);
    const isImage = file.type.startsWith("image/") || isImageByExtension(extension);
    const isVideo = file.type.startsWith("video/") || isVideoByExtension(extension);
    return {
        id: generateUniqueId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        progress: 0,
        status: UPLOAD_STATUS.UPLOADING,
        file,
        extension,
        isImage,
        isVideo,
    };
}

function addOrReplaceFile(uploadItem: UploadItem): boolean {
    if (replacingIndex.value !== null) {
        if (props.single) {
            fileList.value = [uploadItem];
        } else {
            fileList.value.splice(replacingIndex.value, 1, uploadItem);
        }
        replacingIndex.value = null;
        emit("change", uploadItem);
        return true;
    }

    if (props.single) {
        fileList.value = [uploadItem];
        emit("change", uploadItem);
        return true;
    }

    if (props.maxCount && fileList.value.length >= props.maxCount) {
        message.warning(t("common.message.maxCount", { count: props.maxCount }));
        if (uploadItem.file) {
            emit("exceed", [uploadItem.file]);
        }
        return false;
    }

    fileList.value.push(uploadItem);
    emit("change", uploadItem);
    return true;
}

function previewFile(item: UploadItem, index: number) {
    if (item.isImage) {
        const imageUrls = Array.isArray(props.modelValue)
            ? (props.modelValue.filter((url) => url) as string[])
            : props.modelValue
              ? [props.modelValue]
              : [];

        useImagePreview(imageUrls, index);
    } else if (item.isVideo) {
        // 视频预览使用弹窗
        const overlay = useOverlay();
        const VideoPreviewModal = defineAsyncComponent(() => import("./video-preview-modal.vue"));
        const modal = overlay.create(VideoPreviewModal);
        modal.open({ videoUrl: item.url, title: item.name });
    } else {
        window.open(item.url, "_blank");
    }
}

function reSelectFile(index: number) {
    replacingIndex.value = index;
    if (props.disabled) {
        return;
    }
    const input = fileInputRef.value as unknown as { inputRef?: HTMLInputElement };
    input?.inputRef?.click();
}

function handleAddButtonClick() {
    if (props.disabled) {
        return;
    }
    const input = fileInputRef.value as unknown as { inputRef?: HTMLInputElement };
    input?.inputRef?.click();
}

function removeFile(index: number) {
    const file = fileList.value[index];
    if (file && file.url.startsWith("blob:")) URL.revokeObjectURL(file.url);

    fileList.value.splice(index, 1);
    updateModelValue();
    if (file) {
        emit("remove", file);
    }
}

function updateModelValue() {
    const urls = fileList.value
        .filter((item) => item.status === UPLOAD_STATUS.SUCCESS)
        .map((item) => item.url);

    const value: string | string[] = props.single ? urls[0] || "" : urls;
    emit("update:modelValue", value);
    // 触发表单校验，让 UForm 能够感知到值的变化
    formField?.emitFormChange();
}

function validateFile(file: File): boolean {
    const maxSize = props.maxSize || 5;

    if (file.size > maxSize * 1024 * 1024) {
        const msg = t("common.message.fileSizeTooLarge", {
            size: formatFileSize(maxSize * 1024 * 1024),
        });
        errorMessage.value = msg;
        message.warning(msg);
        return false;
    }

    if (props.accept && !isAcceptFile(file)) {
        const msg = t("common.message.fileTypeNotMatch");
        errorMessage.value = msg;
        message.warning(msg);
        return false;
    }

    return true;
}

function isAcceptFile(file: File): boolean {
    if (!props.accept) return true;

    const acceptTypes = props.accept.split(",").map((type) => type.trim());

    return acceptTypes.some((acceptType) => {
        if (acceptType === "*") return true;

        if (acceptType.startsWith(".")) {
            const extension = `.${getFileExtension(file.name)}`;
            return extension === acceptType.toLowerCase();
        } else if (acceptType.endsWith("/*")) {
            const mainType = acceptType.split("/")[0];
            return file.type.startsWith(`${mainType}/`);
        }

        return file.type === acceptType;
    });
}

function getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
}

function getFileNameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(urlObj.pathname.lastIndexOf("/") + 1);
    } catch {
        return url.substring(url.lastIndexOf("/") + 1);
    }
}

function isImageByExtension(extension: string): boolean {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
    return imageExtensions.includes(extension.toLowerCase());
}

function isVideoByExtension(extension: string): boolean {
    const videoExtensions = ["mp4", "webm", "ogg", "mov", "avi", "m4v", "mkv"];
    return videoExtensions.includes(extension.toLowerCase());
}

function getFileTypeFromExtension(extension: string): string {
    if (isImageByExtension(extension)) return "image";

    const videoExtensions = ["mp4", "webm", "ogg", "mov", "avi"];
    if (videoExtensions.includes(extension.toLowerCase())) return "video";

    return "file";
}

function generateUniqueId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
}

function formatFileSize(size: number): string {
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (size < KB) return `${size} B`;
    if (size < MB) return `${(size / KB).toFixed(2)} KB`;
    if (size < GB) return `${(size / MB).toFixed(2)} MB`;
    return `${(size / GB).toFixed(2)} GB`;
}
</script>

<template>
    <div class="bd-uploader">
        <div class="file-list" :class="{ 'flex flex-wrap gap-4': !single && fileList.length > 0 }">
            <slot name="file-list" :fileList="fileList" :remove="removeFile">
                <div
                    v-for="(item, index) in fileList"
                    :key="item.id"
                    class="form-input focus-within:ring-primary-500 dark:focus-within:ring-primary-400 file:text-muted-foreground relative block rounded-md border-0 bg-gray-50 p-0 text-sm text-gray-900 placeholder-gray-400 shadow-sm ring-1 ring-gray-300 ring-inset file:mr-1.5 file:border-0 file:bg-transparent file:p-0 file:font-medium file:outline-none focus-within:ring-2 focus-within:outline-none dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:ring-gray-700 dark:file:text-gray-400"
                    :class="[customClassName]"
                >
                    <slot name="file-item" :item="item" :index="index" :remove="removeFile">
                        <div
                            class="group absolute inset-0 z-[1] size-full cursor-pointer rounded-md p-px"
                        >
                            <NuxtImg
                                v-if="item.isImage"
                                :src="item.url"
                                class="size-full rounded-md object-contain"
                                alt=""
                            />

                            <div
                                v-else-if="item.isVideo"
                                class="relative size-full rounded-md bg-black"
                            >
                                <video
                                    :src="item.url"
                                    class="size-full rounded-md object-cover"
                                    preload="metadata"
                                    muted
                                />
                                <div
                                    class="absolute inset-0 flex items-center justify-center rounded-md bg-black/20"
                                >
                                    <UIcon
                                        name="i-lucide-play-circle"
                                        class="size-10 text-white opacity-80"
                                    />
                                </div>
                            </div>

                            <div v-else class="flex size-full flex-col items-center justify-center">
                                <NuxtImg
                                    :src="getFileIcon(item.name)"
                                    class="size-12 object-contain"
                                    alt=""
                                />
                                <p
                                    class="text-accent-foreground mt-2 max-w-full truncate px-2 text-xs"
                                >
                                    {{ item.name }}
                                </p>
                            </div>

                            <div
                                v-if="item.status === UPLOAD_STATUS.UPLOADING"
                                class="absolute inset-0 z-50 flex size-full flex-col items-center justify-center overflow-hidden rounded-md px-4 backdrop-blur-lg"
                            >
                                <UProgress class="my-2" v-model="item.progress" />
                                <p class="text-xs text-white">
                                    {{
                                        item.progress === 100
                                            ? finishProgressText ||
                                              t("common.message.uploadSuccess")
                                            : progressText || t("common.message.uploading")
                                    }}
                                </p>
                            </div>

                            <div
                                v-else
                                class="absolute inset-0 z-10 flex w-full items-center justify-around overflow-hidden rounded-b-md bg-black/30 opacity-0 transition-all duration-200 group-hover:opacity-100 dark:bg-gray-800/80"
                            >
                                <span
                                    v-if="Boolean(showPreviewButton)"
                                    class="hover:bg-primary transition-color flex size-6 cursor-pointer items-center justify-center rounded-lg"
                                    @click.stop="previewFile(item, index)"
                                    title="预览"
                                >
                                    <UIcon name="i-lucide-eye" class="text-white" />
                                </span>
                                <span
                                    v-if="Boolean(showReplaceButton)"
                                    class="hover:bg-primary flex size-6 cursor-pointer items-center justify-center rounded-lg transition-colors"
                                    @click.stop="reSelectFile(index)"
                                    title="重新选择"
                                >
                                    <UIcon name="tabler:reload" class="text-white" />
                                </span>
                                <span
                                    v-if="Boolean(showRemoveButton)"
                                    class="flex size-6 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-red-500"
                                    @click.stop="removeFile(index)"
                                    title="删除"
                                >
                                    <UIcon name="tabler:trash" class="text-white" />
                                </span>
                            </div>
                        </div>
                    </slot>
                </div>
            </slot>

            <template v-if="showAddButton">
                <div @click="handleAddButtonClick">
                    <slot
                        name="add-button"
                        :showAddButton="showAddButton"
                        :disabled="disabled"
                        :errorMessage="errorMessage"
                        :text="text || t('common.clickUploadFile')"
                        :icon="icon || 'tabler:upload'"
                    >
                        <div
                            class="hover:border-primary-500 dark:hover:border-primary-400 relative block rounded-md border border-dashed border-gray-300 p-0 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-200 dark:border-gray-700"
                            :class="[
                                customClassName,
                                disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
                            ]"
                        >
                            <div
                                class="dark:text-muted-foreground flex size-full flex-col items-center justify-center gap-2 text-gray-400"
                                :class="[addButtonClassName]"
                            >
                                <UIcon
                                    :name="icon || 'tabler:upload'"
                                    class="text-2xl"
                                    :class="errorMessage ? 'text-red-500' : ''"
                                />
                                <p v-if="errorMessage" class="text-xs text-red-500">
                                    {{ errorMessage }}
                                </p>
                                <p v-else class="text-xs">
                                    {{ text || t("common.clickUploadFile") }}
                                </p>
                            </div>
                        </div>
                    </slot>
                </div>
            </template>

            <UInput
                :id="componentId"
                ref="fileInputRef"
                type="file"
                class="hidden"
                :disabled="disabled"
                :multiple="multiple && !single"
                :accept="accept"
                @change="handleFileUpload"
            />
        </div>

        <div
            v-if="showGlobalProgress"
            :timeout="0"
            class="fixed right-4 bottom-4 z-50 w-64 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800"
            color="primary"
        >
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">{{ t("common.message.progress") }}</span>
                    <span class="text-xs">{{ globalProgress }}%</span>
                </div>
                <UProgress v-model="globalProgress" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
:deep(input[type="file"]) {
    &::-webkit-file-upload-button {
        opacity: 0 !important;
    }
}
</style>
