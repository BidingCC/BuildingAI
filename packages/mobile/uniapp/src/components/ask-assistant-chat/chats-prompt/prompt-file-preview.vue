<script setup lang="ts">
import type { FileItem } from "./use-prompt";

export interface FilePreviewItem {
    name: string;
    url: string;
    /** Media type */
    mediaType?: "image" | "video" | "audio" | "file";
}

const props = defineProps<{
    files: (FileItem | FilePreviewItem)[];
    showActions?: boolean;
}>();

const emit = defineEmits<{
    (e: "remove", file: FileItem | FilePreviewItem): void;
    (e: "view", file: FileItem | FilePreviewItem): void;
    (e: "retry", file: FileItem): void;
}>();

const hasUploadStatus = (file: FileItem | FilePreviewItem): file is FileItem => "status" in file;

/**
 * Get media type of file
 */
const getFileMediaType = (
    file: FileItem | FilePreviewItem,
): "image" | "video" | "audio" | "file" => {
    if ("mediaType" in file && file.mediaType) {
        return file.mediaType;
    }
    return "file";
};

const handleRemove = (file: FileItem | FilePreviewItem) => emit("remove", file);

const handleRetry = (file: FileItem) => emit("retry", file);

const handleFileClick = (file: FileItem | FilePreviewItem) => {
    const mediaType = getFileMediaType(file);
    if (mediaType === "image") {
        // Use uniapp's preview image API
        uni.previewImage({
            urls: props.files
                .filter((f) => getFileMediaType(f) === "image")
                .map((item) => item.url),
            current: file.url,
        });
    } else {
        emit("view", file);
    }
};
</script>

<template>
    <scroll-view scroll-x class="box-border flex px-2 pt-2 pb-4" style="white-space: nowrap">
        <view class="flex" style="gap: 8px">
            <view
                v-for="(file, fIndex) in files"
                :key="fIndex"
                class="relative"
                style="flex-shrink: 0"
            >
                <!-- Image preview -->
                <view v-if="getFileMediaType(file) === 'image'" class="relative">
                    <image
                        :src="file.url"
                        mode="aspectFill"
                        class="rounded-lg"
                        style="width: 50px; height: 50px; min-width: 50px"
                        @click="handleFileClick(file)"
                    />

                    <view
                        v-if="hasUploadStatus(file) && file.status === 'uploading'"
                        class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50"
                    >
                        <view class="text-center text-white">
                            <view class="text-xs font-medium"
                                >{{ Math.round(file.progress) }}%</view
                            >
                        </view>
                    </view>

                    <view
                        v-if="hasUploadStatus(file) && file.status === 'error'"
                        class="bg-primary-50 absolute inset-0 flex items-center justify-center rounded-lg"
                    >
                        <view
                            class="bg-error rounded p-1 text-white"
                            @click.stop="handleRetry(file as FileItem)"
                        >
                            <text class="i-lucide-refresh-cw text-xs" />
                        </view>
                    </view>

                    <view
                        v-if="
                            showActions &&
                            (!hasUploadStatus(file) ||
                                file.status === 'success' ||
                                file.status === 'error')
                        "
                        class="absolute top-1 right-1 flex items-center justify-center rounded-full bg-black/60"
                        style="width: 20px; height: 20px"
                        @click.stop="handleRemove(file)"
                    >
                        <text class="i-lucide-x text-white" style="font-size: 12px" />
                    </view>
                </view>

                <view v-else-if="getFileMediaType(file) === 'video'" class="group relative">
                    <view
                        class="relative rounded-lg bg-black"
                        style="width: 50px; height: 50px"
                        @click="handleFileClick(file)"
                    >
                        <video
                            :src="file.url"
                            class="rounded-lg"
                            style="width: 100%; height: 100%"
                            :controls="false"
                            :show-center-play-btn="true"
                        />
                    </view>

                    <view
                        v-if="hasUploadStatus(file) && file.status === 'uploading'"
                        class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50"
                    >
                        <view class="text-center text-white">
                            <view class="text-xs font-medium"
                                >{{ Math.round(file.progress) }}%</view
                            >
                        </view>
                    </view>

                    <view
                        v-if="hasUploadStatus(file) && file.status === 'error'"
                        class="bg-primary-50 absolute inset-0 flex items-center justify-center rounded-lg"
                    >
                        <view
                            class="bg-error rounded p-1 text-white"
                            @click.stop="handleRetry(file as FileItem)"
                        >
                            <text class="i-lucide-refresh-cw text-xs" />
                        </view>
                    </view>

                    <view
                        v-if="
                            showActions &&
                            (!hasUploadStatus(file) ||
                                file.status === 'success' ||
                                file.status === 'error')
                        "
                        class="absolute top-1 right-1 flex items-center justify-center rounded-full bg-black/60"
                        style="width: 20px; height: 20px"
                        @click.stop="handleRemove(file)"
                    >
                        <text class="i-lucide-x text-white" style="font-size: 12px" />
                    </view>
                </view>

                <view v-else-if="getFileMediaType(file) === 'audio'" class="group relative">
                    <view
                        class="border-border bg-primary-50 relative flex items-center gap-2 rounded-lg border p-2 pr-4"
                        @click="handleFileClick(file)"
                    >
                        <view
                            class="border-border flex items-center justify-center rounded-lg border shadow-md"
                            style="width: 50px; height: 50px"
                        >
                            <text
                                class="i-lucide-audio-lines text-foreground"
                                style="font-size: 16px"
                            />
                        </view>

                        <view class="flex flex-col">
                            <view class="text-foreground max-w-[200px] truncate text-sm font-bold">
                                {{ file.name }}
                            </view>
                        </view>

                        <view
                            v-if="hasUploadStatus(file) && file.status === 'uploading'"
                            class="bg-primary-50 absolute inset-0 flex items-center justify-center rounded-lg"
                        >
                            <view class="text-center">
                                <view class="text-xs font-medium"
                                    >{{ Math.round(file.progress) }}%</view
                                >
                            </view>
                        </view>

                        <view
                            v-if="hasUploadStatus(file) && file.status === 'error'"
                            class="bg-primary-50 absolute inset-0 flex items-center justify-center rounded-lg"
                        >
                            <view
                                class="bg-error rounded p-1 text-white"
                                @click.stop="handleRetry(file as FileItem)"
                            >
                                <text class="i-lucide-refresh-cw text-xs" />
                            </view>
                        </view>

                        <view
                            v-if="
                                showActions && (!hasUploadStatus(file) || file.status === 'success')
                            "
                            class="absolute top-1 right-1 flex items-center justify-center rounded-full bg-black/60"
                            style="width: 20px; height: 20px"
                            @click.stop="handleRemove(file)"
                        >
                            <text class="i-lucide-x text-white" style="font-size: 12px" />
                        </view>
                    </view>
                </view>

                <view
                    v-else
                    class="border-border bg-primary-50 relative flex items-center gap-2 rounded-lg border py-2.5 pr-4 pl-2"
                    @click="handleFileClick(file)"
                >
                    <view
                        class="border-border flex items-center justify-center rounded-lg border shadow-md"
                        style="width: 32px; height: 32px"
                    >
                        <text class="i-lucide-file-box text-foreground" style="font-size: 16px" />
                    </view>

                    <view class="text-foreground me-auto max-w-[250px] truncate text-sm font-bold">
                        {{ file.name }}
                    </view>

                    <view
                        v-if="hasUploadStatus(file) && file.status === 'uploading'"
                        class="flex items-center gap-2"
                    >
                        <view class="bg-primary-50 h-2 w-16 rounded-full">
                            <view
                                class="bg-primary h-2 rounded-full transition-all duration-300"
                                :style="{ width: `${file.progress}%` }"
                            ></view>
                        </view>
                        <text class="text-muted-foreground w-8 text-xs">
                            {{ Math.round(file.progress) }}%
                        </text>
                    </view>

                    <!-- Error overlay -->
                    <view
                        v-if="hasUploadStatus(file) && file.status === 'error'"
                        class="bg-primary-50 absolute inset-0 flex items-center justify-center rounded-lg"
                    >
                        <view
                            class="bg-error rounded p-1 text-white"
                            @click.stop="handleRetry(file as FileItem)"
                        >
                            <text class="i-lucide-refresh-cw text-xs" />
                        </view>
                    </view>

                    <view
                        v-if="
                            showActions &&
                            (!hasUploadStatus(file) ||
                                file.status === 'success' ||
                                file.status === 'error')
                        "
                        class="absolute top-1 right-1 flex items-center justify-center rounded-full bg-black/60"
                        style="width: 20px; height: 20px"
                        @click.stop="handleRemove(file)"
                    >
                        <text class="i-lucide-x text-white" style="font-size: 12px" />
                    </view>
                </view>
            </view>
        </view>
    </scroll-view>
</template>
