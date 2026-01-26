<script lang="ts" setup>
import type { FileItem } from "@buildingai/service/models/globals";
import { uploadFileAdaptive } from "@buildingai/upload";

const FILE_STATUS = Object.freeze({
    PENDING: "pending",
    UPLOADING: "uploading",
    SUCCESS: "success",
    ERROR: "error",
} as const);

const emit = defineEmits<{
    (e: "update:fileList", files: FileItem[]): void;
}>();

const props = defineProps<{
    fileList?: FileItem[];
}>();

const UPLOAD_CONFIG = Object.freeze({
    maxSize: 15,
    maxCount: 10,
    supportedTypes: ["TXT", "MARKDOWN", "DOCX", "PDF", "XLSX", "XLS"],
    accept: ".txt,.md,.docx,.pdf,.xlsx,.xls",
});

const { t } = useI18n();
const toast = useMessage();
const fileInputRef = ref<HTMLInputElement>();
const isDragging = ref(false);
const files = ref<FileItem[]>([]);

watch(
    () => props.fileList,
    (val) => {
        if (val && val.length !== files.value.length) {
            files.value = [...val];
        }
    },
    { immediate: true },
);

const generateId = () => `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const validateFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toUpperCase() || "";
    // 支持的文件类型：TXT, MD, DOCX, PDF, XLSX, XLS
    const allowedExtensions = ["TXT", "MD", "DOCX", "PDF", "XLSX", "XLS"];
    if (!allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: t("ai-datasets.backend.create.file.unsupportedFileType", { ext }),
        };
    }
    if (file.size > UPLOAD_CONFIG.maxSize * 1024 * 1024) {
        return {
            valid: false,
            error: t("ai-datasets.backend.create.file.fileTooLarge", {
                maxSize: UPLOAD_CONFIG.maxSize,
            }),
        };
    }
    return { valid: true };
};

const updateFile = (id: string, patch: Partial<FileItem>) => {
    const item = files.value.find((f) => f.id === id);
    if (item) Object.assign(item, patch);
};

const addFiles = async (fileList: File[]) => {
    if (files.value.length + fileList.length > UPLOAD_CONFIG.maxCount) {
        throw new Error(`最多只能上传 ${UPLOAD_CONFIG.maxCount} 个文件`);
    }

    const newItems = fileList
        .map((file) => {
            const { valid, error } = validateFile(file);
            return valid
                ? { id: generateId(), file, status: FILE_STATUS.PENDING, progress: 0 }
                : (toast.warning(`${file.name}: ${error}`), null);
        })
        .filter(Boolean) as FileItem[];

    files.value.push(...newItems);
    emit("update:fileList", [...files.value]);
    await uploadFiles(newItems);
};

const uploadFiles = async (items: FileItem[]) => {
    for (const item of items) {
        // 检查是否有文件对象
        if (!item.file || !item.id) {
            console.warn("文件对象或ID缺失，跳过上传");
            continue;
        }

        try {
            updateFile(item.id, { status: FILE_STATUS.UPLOADING, progress: 0 });

            const uploadResult = await uploadFileAdaptive(
                { file: item.file, description: "datasets files" },
                {
                    onProgress: (progress) => {
                        if (item.id) {
                            updateFile(item.id, { progress });
                        }
                    },
                },
            );

            // 处理上传结果，更新文件信息
            updateFile(item.id, {
                status: FILE_STATUS.SUCCESS,
                progress: 100,
                id: uploadResult.id,
                url: uploadResult.url,
                originalName: uploadResult.originalName,
                size: uploadResult.size,
                type: uploadResult.type as "document",
                extension: uploadResult.extension,
            });
        } catch (err) {
            console.error(`上传失败: ${item.file.name}`, err);
            updateFile(item.id, {
                status: FILE_STATUS.ERROR,
                error: t("common.message.uploadFailed"),
            });
        }
    }

    emit("update:fileList", [...files.value]);
};

const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    if (selected.length) addFiles(selected);
    input.value = "";
};

const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = false;
    addFiles(Array.from(e.dataTransfer?.files || []));
};

const handleDropOver = (e: DragEvent) => {
    e.preventDefault();
    isDragging.value = true;
};
</script>

<template>
    <div>
        <div
            class="bg-muted rounded-lg border border-dashed p-6 text-center transition-all duration-200"
            :class="[
                isDragging ? 'border-primary bg-primary-50' : 'border-default hover:border-primary',
            ]"
            @drop="handleDrop"
            @dragover="handleDropOver"
            @dragleave="isDragging = false"
        >
            <div class="flex flex-col items-center space-y-2">
                <div class="flex w-full items-center justify-center">
                    <UIcon name="i-heroicons-cloud-arrow-up" class="text-muted-foreground size-6" />
                    <UButton color="neutral" variant="link">
                        {{ t("ai-datasets.backend.create.file.dragOrSelectFiles") }}
                    </UButton>
                    <UButton color="primary" variant="link" @click="fileInputRef?.click()">
                        {{ t("ai-datasets.backend.create.file.chooseFile") }}
                    </UButton>
                </div>
                <div class="text-muted-foreground text-sm">
                    <p>
                        {{
                            t("ai-datasets.backend.create.file.supportedTypes", {
                                types: UPLOAD_CONFIG.supportedTypes.join(", "),
                            })
                        }}
                    </p>
                    <p>
                        {{
                            t("ai-datasets.backend.create.file.fileSizeLimit", {
                                maxSize: UPLOAD_CONFIG.maxSize,
                            })
                        }}
                    </p>
                </div>
            </div>

            <input
                ref="fileInputRef"
                type="file"
                multiple
                class="hidden"
                :accept="UPLOAD_CONFIG.accept"
                @change="handleFileSelect"
            />
        </div>

        <div class="text-muted-foreground mt-2 text-sm">
            {{ t("ai-datasets.backend.create.file.comingSoon") }}
        </div>
    </div>
</template>
