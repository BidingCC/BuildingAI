<script lang="ts" setup>
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

type _UniPopupType =
    | "top"
    | "center"
    | "bottom"
    | "left"
    | "right"
    | "message"
    | "dialog"
    | "share";

const props = withDefaults(
    defineProps<{
        title?: string;
        content?: string;
        confirmText?: string;
        cancelText?: string;
        showConfirm?: boolean;
        showCancel?: boolean;
        isMaskClick?: boolean;
        cancelCallback?: () => void;
        confirmCallback?: () => void;
        type?: _UniPopupType;
    }>(),
    {
        title: "提示",
        content: "",
        confirmText: "确认",
        cancelText: "取消",
        showConfirm: true,
        showCancel: true,
        isMaskClick: true,
        type: "center",
        cancelCallback: () => {},
        confirmCallback: () => {},
    },
);

const emit = defineEmits<{
    confirm: [];
    close: [];
    change: [];
    open: [];
}>();

const confirmRef = ref<UniPopupInstance>();
const title = ref<string>("");
const content = ref<string>("");
const confirmText = ref<string>("");
const cancelText = ref<string>("");
const showConfirm = ref<boolean>(true);
const showCancel = ref<boolean>(true);
const isMaskClick = ref<boolean>(true);
const cancelCallback = ref<() => void>();
const confirmCallback = ref<() => void>();

function open(opts?: {
    title?: string;
    content?: string;
    confirmText?: string;
    cancelText?: string;
    showConfirm?: boolean;
    showCancel?: boolean;
    isMaskClick?: boolean;
    cancelCallback?: () => void;
    confirmCallback?: () => void;
    type?: _UniPopupType;
}) {
    title.value = opts?.title || "";
    content.value = opts?.content || "";
    confirmText.value = opts?.confirmText || "";
    cancelText.value = opts?.cancelText || "";
    showConfirm.value = opts?.showConfirm ?? props.showConfirm;
    showCancel.value = opts?.showCancel ?? props.showCancel;
    isMaskClick.value = opts?.isMaskClick ?? props.isMaskClick;
    cancelCallback.value = opts?.cancelCallback || props.cancelCallback;
    confirmCallback.value = opts?.confirmCallback || props.confirmCallback;
    confirmRef.value?.open?.(opts?.type);
    emit("open");
}

function close() {
    confirmRef.value?.close?.();
    cancelCallback.value?.();
    emit("close");
}

function change() {
    emit("change");
}

function confirm() {
    confirmCallback.value?.();
    emit("confirm");
    close();
}

defineExpose({
    open,
    close,
});
</script>

<template>
    <uni-popup
        ref="confirmRef"
        :animation="true"
        type="dialog"
        border-radius="1rem"
        background-color="var(--background)"
        style="z-index: 999"
        :is-mask-click="isMaskClick"
        @mask-click="emit('close')"
        @change="change"
    >
        <view
            p="4"
            space-y="4"
            style="min-width: 580rpx; max-width: 580rpx; box-sizing: border-box"
        >
            <view flex="~ col items-center" gap="4">
                <view font="medium" line-clamp-1 pt-2 text-center>
                    <text v-if="title || props.title">
                        {{ title || props.title }}
                    </text>
                    <slot v-else name="title">
                        {{ title || props.title }}
                    </slot>
                </view>
                <view text="center sm ">
                    <view v-if="content || props.content" class="p-4">
                        {{ content || props.content }}
                    </view>
                    <slot v-else>
                        {{ content || props.content }}
                    </slot>
                </view>
            </view>
            <view
                v-if="(showCancel ?? props.showCancel) || (showConfirm ?? props.showConfirm)"
                flex="~ items-center"
                gap="4"
            >
                <button v-if="showCancel ?? props.showCancel" size="mini" @click="close">
                    {{ cancelText || props.cancelText }}
                </button>
                <button
                    v-if="showConfirm ?? props.showConfirm"
                    type="primary"
                    size="mini"
                    @click="confirm"
                >
                    {{ confirmText || props.confirmText }}
                </button>
            </view>
        </view>
    </uni-popup>
</template>

<style lang="scss" scoped></style>
