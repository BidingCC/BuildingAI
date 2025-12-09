<script lang="ts" setup>
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

const props = withDefaults(
    defineProps<{
        actions: {
            title: string;
            desc?: string;
            type?: keyof typeof colorType;
            show?: boolean; // 是否显示该选项
            click?: () => void;
        }[];
    }>(),
    {
        actions: () => [],
    },
);

const emit = defineEmits<{
    confirm: [];
    close: [];
    change: [];
    open: [];
}>();

const uniPopupRef = ref<UniPopupInstance>();
const colorType = {
    default: "text-white",
    primary: "text-primary",
    error: "text-error",
    warning: "text-warning",
};

function close() {
    uniPopupRef.value?.close?.();
    emit("close");
}

function open() {
    uniPopupRef.value?.open?.();
    emit("open");
}

function getTypeColor(type: keyof typeof colorType = "default") {
    return colorType[type];
}

defineExpose({
    open,
    close,
});

onMounted(() => {});
</script>

<template>
    <uni-popup ref="uniPopupRef" type="bottom" :safe-area="false" z-index="99">
        <view class="bg-background rounded-t-5 action-sheet overflow-hidden">
            <!-- 选项列表 -->
            <view v-if="props.actions.length > 0" class="bg-background">
                <view
                    v-for="(item, index) in props.actions"
                    v-show="item.show !== false"
                    :key="index"
                    class="bg-background active:bg-muted action-sheet__item relative flex items-center justify-center py-4"
                    :class="getTypeColor(item.type)"
                    @click="
                        () => {
                            item.click?.();
                            close();
                        }
                    "
                >
                    <view class="flex flex-col items-center justify-center gap-2">
                        <text
                            class="text-foreground text-base leading-normal"
                            :class="{
                                '!text-primary-600': item.type === 'primary',
                                '!text-error-600': item.type === 'error',
                                '!text-warning-600': item.type === 'warning',
                            }"
                        >
                            {{ item.title }}
                        </text>
                        <text v-if="item.desc" class="text-muted-foreground text-xs leading-normal">
                            {{ item.desc }}
                        </text>
                    </view>
                </view>
            </view>
            <view class="bg-muted h-2"></view>
            <view
                class="bg-background active:bg-muted flex items-center justify-center py-4"
                @click="close"
            >
                <text class="text-foreground text-base leading-normal">取消</text>
            </view>
        </view>
    </uni-popup>
</template>

<style scoped>
/* 安全区域适配 */
.action-sheet {
    /* #ifndef APP-NVUE */
    padding-bottom: env(safe-area-inset-bottom);
    /* #endif */
}
</style>
