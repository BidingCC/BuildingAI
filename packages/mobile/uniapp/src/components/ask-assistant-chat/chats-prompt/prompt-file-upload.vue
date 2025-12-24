<script setup lang="ts">
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
        // @ts-ignore plus is available in App environment
        if (typeof plus === "undefined") {
            console.error("plus.io is not available");
            toast.error(t("common.message.chooseFileFailed") || "文件选择功能不可用");
            resolve(null);
            return;
        }

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
    modalRef.value?.close();
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
        modalRef.value?.close();
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
        modalRef.value?.close();
    } catch (err) {
        console.error("Choose video failed:", err);
        toast.error(t("common.message.chooseFileFailed"));
    }
};

// #ifdef MP-WEIXIN
function showMultimodalActionSheet() {
    const features = props.selectedModel?.features || [];
    const supportsVision = features.includes("vision");

    const actionItems: string[] = [];
    const actions: (() => void)[] = [];

    actionItems.push(t("common.chat.messages.uploadFile"));
    actions.push(async () => {
        const filePath = await chooseFileMP();
        await handleFileSelect(filePath);
    });

    if (supportsVision) {
        actionItems.push(t("common.chat.messages.chooseImage"));
        actions.push(() => {
            handleChooseImage();
        });
    }

    if (supportsVision) {
        actionItems.push(t("common.chat.messages.chooseVideo"));
        actions.push(() => {
            handleChooseVideo();
        });
    }

    uni.showActionSheet({
        itemList: actionItems,
        success: (res) => {
            const action = actions[res.tapIndex];
            if (action) {
                action();
            }
        },
        fail: () => {},
    });
    modalRef.value?.close();
}
// #endif

const handleChooseFile = async () => {
    // #ifdef H5
    const filePath = await chooseFileH5();
    await handleFileSelect(filePath);
    // #endif

    // #ifdef MP-WEIXIN
    const features = props.selectedModel?.features || [];
    const isMultimodal = features.includes("vision") || features.includes("audio");

    if (isMultimodal) {
        showMultimodalActionSheet();
    } else {
        const filePath = await chooseFileMP();
        await handleFileSelect(filePath);
    }
    // #endif

    // #ifdef APP-PLUS
    const appActionItems: string[] = [];
    const appActions: (() => void)[] = [];

    appActionItems.push(t("common.chat.messages.uploadFile"));
    appActions.push(async () => {
        const filePath = await chooseFileApp();
        await handleFileSelect(filePath);
    });

    appActionItems.push(t("common.chat.messages.chooseImage"));
    appActions.push(() => {
        handleChooseImage();
    });

    appActionItems.push(t("common.chat.messages.chooseVideo"));
    appActions.push(() => {
        handleChooseVideo();
    });

    uni.showActionSheet({
        itemList: appActionItems,
        success: (res) => {
            const action = appActions[res.tapIndex];
            if (action) {
                action();
            }
        },
        fail: () => {},
    });
    modalRef.value?.close();
    // #endif

    // #ifndef H5 || MP-WEIXIN || APP-PLUS
    uni.showActionSheet({
        itemList: [t("common.chat.messages.chooseImage"), t("common.chat.messages.chooseVideo")],
        success: (res) => {
            if (res.tapIndex === 0) {
                handleChooseImage();
            } else if (res.tapIndex === 1) {
                handleChooseVideo();
            }
        },
        fail: () => {},
    });
    modalRef.value?.close();
    // #endif
};

function handleUrlSubmit() {
    const url = remoteUrls.value.trim();
    if (!url) return;

    emits("url-submit", url);
    remoteUrls.value = "";
    modalRef.value?.close();
}
</script>

<template>
    <view>
        <view
            class="flex items-center justify-center rounded-full p-2 active:opacity-70"
            :class="disabled ? 'opacity-50' : ''"
            @click.stop="
                !disabled && modalRef?.open?.({ title: t('common.chat.messages.uploadAttachment') })
            "
        >
            <text class="i-lucide-paperclip text-foreground text-lg" />
        </view>

        <BdModal
            ref="modalRef"
            :title="t('common.chat.messages.uploadAttachment')"
            :show-confirm="false"
            :show-cancel="false"
        >
            <view class="px-4 pb-4">
                <view class="mb-4">
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

                <BdSeparator margin="30px 0" :text="t('common.chat.messages.or')" />

                <view class="flex flex-col gap-2">
                    <view
                        class="bg-muted flex items-center justify-center rounded-lg px-4 py-3 active:opacity-80"
                        :class="disabled ? 'opacity-50' : ''"
                        @click="!disabled && handleChooseFile()"
                    >
                        <text class="i-lucide-upload text-foreground mr-2" />
                        <text class="text-foreground text-sm">
                            {{ t("common.chat.messages.uploadFile") }}
                        </text>
                    </view>
                </view>
            </view>
        </BdModal>
    </view>
</template>
