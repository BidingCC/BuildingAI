<script setup lang="ts">
import BdPopover from "@/async-components/bd-popover/index.vue?async";
import BdModal from "@/components/bd-modal.vue";
import type { AiModel } from "@/service/ai-conversation";

const emits = defineEmits<{
    (e: "file-select", file: File | string): void;
    (e: "url-submit", url: string): void;
}>();

const props = defineProps<{
    disabled?: boolean;
    maxSize?: number;
    accept?: string;
    selectedModel?: AiModel | null;
}>();

const { t } = useI18n();
const toast = useToast();
const { isLoaded } = useAsyncPackage("bd-popover");

const remoteUrls = shallowRef<string>("");
const modalRef = ref<InstanceType<typeof BdModal>>();

const supportedFileTypes = computed(() => {
    if (!props.selectedModel) {
        return [".pdf", ".doc", ".docx", ".txt", ".md"];
    }

    const features = props.selectedModel.features || [];
    const supportedTypes: string[] = [];

    const documentTypes = [
        ".pdf",
        ".docx",
        ".txt",
        ".md",
        ".rtf",
        ".csv",
        ".xlsx",
        ".xls",
        ".pptx",
    ];
    supportedTypes.push(...documentTypes);

    if (features.includes("vision")) {
        supportedTypes.push(".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp");
    }

    if (features.includes("audio")) {
        supportedTypes.push(".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a");
    }

    return supportedTypes;
});

function parseAcceptToExtensions(accept: string): string[] {
    const acceptParts = accept.split(",").map((s) => s.trim());
    const extList = acceptParts
        .map((part) => {
            if (part.includes("/")) {
                const [type, subtype] = part.split("/");
                if (subtype === "*") {
                    const mimeTypeMap: Record<string, string[]> = {
                        image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"],
                        video: [".mp4", ".webm", ".ogg", ".mov", ".avi", ".wmv", ".flv", ".mkv"],
                        audio: [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma"],
                    };
                    return type ? mimeTypeMap[type] || [] : [];
                }
                const mimeToExt: Record<string, string> = {
                    "image/jpeg": ".jpg",
                    "image/png": ".png",
                    "image/gif": ".gif",
                    "image/webp": ".webp",
                    "video/mp4": ".mp4",
                    "video/webm": ".webm",
                    "audio/mpeg": ".mp3",
                    "audio/wav": ".wav",
                };
                return mimeToExt[part] ? [mimeToExt[part]] : [];
            }
            if (part.startsWith(".")) {
                return [part];
            }
            return [];
        })
        .flat()
        .filter((ext): ext is string => Boolean(ext));
    return [...new Set(extList)];
}

function getFileExtensions(): string[] | undefined {
    if (supportedFileTypes.value.length > 0) {
        return supportedFileTypes.value;
    }
    if (props.accept) {
        const extensions = parseAcceptToExtensions(props.accept);
        return extensions.length > 0 ? extensions : undefined;
    }
    return undefined;
}

// #ifdef H5
async function chooseFileH5(): Promise<string | null> {
    try {
        const extensions = getFileExtensions();
        const res = await new Promise<{ tempFilePaths: string | string[] }>((resolve, reject) => {
            uni.chooseFile({
                count: 1,
                extension: extensions,
                success: resolve,
                fail: reject,
            });
        });

        const tempFilePaths = Array.isArray(res.tempFilePaths)
            ? res.tempFilePaths
            : [res.tempFilePaths];
        return tempFilePaths[0] || null;
    } catch (err) {
        console.error("Choose file failed:", err);
        toast.error(t("common.message.chooseFileFailed"));
        return null;
    }
}
// #endif

// #ifdef MP-WEIXIN
async function chooseFileMP(): Promise<string | null> {
    try {
        const res = await new Promise<WechatMiniprogram.ChooseMessageFileSuccessCallbackResult>(
            (resolve, reject) => {
                wx.chooseMessageFile({
                    count: 1,
                    type: "file",
                    success: resolve,
                    fail: reject,
                });
            },
        );

        const file = res.tempFiles[0];
        return file?.path || null;
    } catch (err) {
        console.error("Choose file failed:", err);
        toast.error(t("common.message.chooseFileFailed"));
        return null;
    }
}
// #endif

// #ifdef APP-PLUS
async function chooseFileApp(): Promise<string | null> {
    return new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore plus is available in App environment
        if (typeof plus === "undefined") {
            console.error("plus.io is not available");
            toast.error(t("common.message.chooseFileFailed") || "文件选择功能不可用");
            resolve(null);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore plus.io is available in App environment
        plus.io.chooseFile(
            {
                title: t("common.chat.messages.uploadFile") || "选择文件",
                multiple: false,
                maximum: 1,
                system: false,
            },
            (event: { files?: string[] }) => {
                if (event.files && event.files.length > 0 && event.files[0]) {
                    resolve(event.files[0]);
                } else {
                    resolve(null);
                }
            },
            (error: { message?: string }) => {
                console.error("Choose file failed:", error);
                toast.error(
                    error.message || t("common.message.chooseFileFailed") || "文件选择失败",
                );
                resolve(null);
            },
        );
    });
}
// #endif

async function handleFileSelect(filePath: string | null) {
    if (!filePath) return;
    emits("file-select", filePath);
}

const handleChooseImage = async () => {
    try {
        const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
            (resolve, reject) => {
                uni.chooseImage({
                    count: 1,
                    sizeType: ["original"],
                    sourceType: ["album", "camera"],
                    success: resolve,
                    fail: reject,
                });
            },
        );

        const tempFilePath = res.tempFilePaths[0];
        if (!tempFilePath) return;

        emits("file-select", tempFilePath);
    } catch (err) {
        console.error("Choose image failed:", err);
        toast.error(t("common.message.chooseFileFailed"));
    }
};

const handleChooseVideo = async () => {
    try {
        const res = await new Promise<{ tempFilePath: string }>((resolve, reject) => {
            uni.chooseVideo({
                count: 1,
                sourceType: ["album", "camera"],
                success: resolve,
                fail: reject,
            });
        });

        const tempFilePath = res.tempFilePath;
        if (!tempFilePath) return;

        emits("file-select", tempFilePath);
    } catch (err) {
        console.error("Choose video failed:", err);
        toast.error(t("common.message.chooseFileFailed"));
    }
};

const handleChooseFile = async () => {
    // #ifdef H5
    const h5FilePath = await chooseFileH5();
    await handleFileSelect(h5FilePath);
    // #endif

    // #ifdef MP-WEIXIN
    const mpFilePath = await chooseFileMP();
    await handleFileSelect(mpFilePath);
    // #endif

    // #ifdef APP-PLUS
    const appFilePath = await chooseFileApp();
    await handleFileSelect(appFilePath);
    // #endif

    // #ifndef H5 || MP-WEIXIN || APP-PLUS
    handleChooseImage();
    // #endif
};

function handleUrlSubmit() {
    const url = remoteUrls.value.trim();
    if (!url) return;

    emits("url-submit", url);
    remoteUrls.value = "";
    modalRef.value?.close();
}

function handleOpenUrlModal() {
    modalRef.value?.open?.({ title: t("common.chat.messages.uploadAttachment") });
}

const features = computed(() => props.selectedModel?.features || []);
const supportsVision = computed(() => features.value.includes("vision"));
</script>

<template>
    <view v-show="isLoaded">
        <BdPopover
            placement="end-top"
            :blur-intensity="4"
            :content-style="{
                width: '250rpx',
                background: 'var(--background-transparent)',
            }"
        >
            <template #content>
                <view class="flex flex-col gap-0 pr-1" style="min-width: 200rpx">
                    <!-- 在线链接 -->
                    <view
                        class="flex items-center gap-2 rounded-lg px-3 py-2.5 active:opacity-80"
                        :class="disabled ? 'opacity-50' : ''"
                        @click="!disabled && handleOpenUrlModal()"
                    >
                        <text class="i-lucide-link text-foreground text-base" />
                        <text class="text-foreground text-sm">
                            {{ t("common.chat.messages.inputUrl") }}
                        </text>
                    </view>

                    <!-- 选择文件 -->
                    <view
                        class="flex items-center gap-2 rounded-lg px-3 py-2.5 active:opacity-80"
                        :class="disabled ? 'opacity-50' : ''"
                        @click="!disabled && handleChooseFile()"
                    >
                        <text class="i-lucide-upload text-foreground text-base" />
                        <text class="text-foreground text-sm">
                            {{ t("common.chat.messages.uploadFile") }}
                        </text>
                    </view>

                    <!-- 选择图片 -->
                    <view
                        v-if="supportsVision"
                        class="flex items-center gap-2 rounded-lg px-3 py-2.5 active:opacity-80"
                        :class="disabled ? 'opacity-50' : ''"
                        @click="!disabled && handleChooseImage()"
                    >
                        <text class="i-lucide-image text-foreground text-base" />
                        <text class="text-foreground text-sm">
                            {{ t("common.chat.messages.chooseImage") }}
                        </text>
                    </view>

                    <!-- 选择视频 -->
                    <view
                        v-if="supportsVision"
                        class="flex items-center gap-2 rounded-lg px-3 py-2.5 active:opacity-80"
                        :class="disabled ? 'opacity-50' : ''"
                        @click="!disabled && handleChooseVideo()"
                    >
                        <text class="i-lucide-video text-foreground text-base" />
                        <text class="text-foreground text-sm">
                            {{ t("common.chat.messages.chooseVideo") }}
                        </text>
                    </view>
                </view>
            </template>
            <view
                class="flex items-center justify-center rounded-full p-2 active:opacity-70"
                :class="disabled ? 'opacity-50' : ''"
            >
                <text class="i-lucide-plus text-foreground text-lg" />
            </view>
        </BdPopover>

        <BdModal
            ref="modalRef"
            :title="t('common.chat.messages.uploadAttachment')"
            :show-confirm="false"
            :show-cancel="false"
        >
            <view class="px-2 pb-4">
                <view class="flex items-center gap-2">
                    <uni-easyinput
                        v-model="remoteUrls"
                        class="flex-1"
                        :placeholder="t('common.chat.messages.inputUrlPlaceholder')"
                        :clearable="true"
                        :input-border="true"
                        confirm-type="send"
                        @confirm="handleUrlSubmit"
                    />
                    <view
                        class="bg-primary rounded-lg px-4 py-2 text-sm text-white active:opacity-80"
                        @click="handleUrlSubmit"
                    >
                        {{ t("common.confirm") }}
                    </view>
                </view>
            </view>
        </BdModal>
    </view>
</template>
