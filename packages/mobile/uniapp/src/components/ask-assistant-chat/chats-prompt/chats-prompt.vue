<script setup lang="ts">
import type { FilesList } from "@buildingai/service/models/message";
import { useVModel } from "@vueuse/core";
import { onMounted } from "vue";

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

const inputValue = useVModel(props, "modelValue", emits);
const filesList = useVModel(props, "fileList", emits);

const keyboardHeight = shallowRef(0);
const keyboardIsShow = shallowRef(false);
const tabbarHeight = shallowRef(0);

onMounted(() => {
    // 通过系统信息获取 tabbar 高度
    const systemInfo = uni.getSystemInfoSync();
    // tabbar 高度 = 底部安全区域 + 固定高度（通常为 48px 或 50px）
    const safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 0;
    // 小程序中 tabbar 固定高度通常是 48px，加上安全区域
    tabbarHeight.value = safeAreaBottom + 42;
    console.log("tabbarHeight", tabbarHeight.value, "safeAreaBottom", safeAreaBottom);
});

const chatActionBarStyle = computed(() => {
    if (keyboardIsShow.value && keyboardHeight.value > 0) {
        // 减去 tabbar 的高度
        const adjustedHeight = Math.max(0, keyboardHeight.value - tabbarHeight.value);
        return {
            paddingBottom: `${adjustedHeight}px`,
        };
    }
    return {};
});

function handleKeyboardHeightChange(e: { detail: { height: number } }) {
    const height = e.detail.height || 0;
    console.log("height", height, "tabbarHeight", tabbarHeight.value);
    keyboardHeight.value = height;
    keyboardIsShow.value = height > 0;
}

function handleKeyboardHide() {
    keyboardIsShow.value = false;
    keyboardHeight.value = 0;
}

function handleKeydown(event: KeyboardEvent) {
    if (event.isComposing) {
        return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (props.isLoading) {
            emits("stop");
        } else {
            emits("submit", inputValue.value);
        }
    }
}

function handleSubmit() {
    if (props.isLoading) {
        emits("stop");
    } else {
        // if (!inputValue.value.trim() && files.value.length === 0) return;
        emits("submit", inputValue.value);
        // Clear file list after submission
        // clearFiles();
        filesList.value = [];
    }
}
</script>

<template>
    <view
        class="chat-action-bar bg-background border-muted safe-area-inset-bottom rounded-t-2xl border border-solid p-2"
        :style="chatActionBarStyle"
        id="noswipe"
    >
        <view p="2">
            <textarea
                v-model="inputValue"
                placeholder="给 小助手 发送消息"
                focus
                auto-height
                class="textarea-input"
                w="full"
                confirm-type="send"
                :maxlength="-1"
                :adjust-position="false"
                disable-default-padding
                adjust-keyboard-to="bottom"
                :show-confirm-bar="false"
                @keyboardheightchange="handleKeyboardHeightChange"
                @blur="handleKeyboardHide"
            />
        </view>
        <view class="action-bar" flex="~ items-center justify-between" px="1">
            <view flex="~ items-center gap-2">
                <view class="p-1.5">
                    <text i-lucide-settings-2 />
                </view>
            </view>
            <view flex="~ items-center gap-2">
                <view flex="~ items-center justify-center" class="bg-primary rounded-full p-2">
                    <text i-lucide-arrow-up text="white" />
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
}

.textarea-input {
    min-height: 32px;
    max-height: 300px;
    box-sizing: border-box;
    line-height: 1.6;
}
</style>
