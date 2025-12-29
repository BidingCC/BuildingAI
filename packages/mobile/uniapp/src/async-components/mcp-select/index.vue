<script setup lang="ts">
import type { McpServerInfo } from "@buildingai/service/webapi/mcp-server";
import { useVModel } from "@vueuse/core";

import BdPopover from "@/async-components/bd-popover/index.vue?async";
import { apiGetAllMcpServerList } from "@/service/ai-conversation";

const props = withDefaults(
    defineProps<{
        disabled?: boolean;
        placement?:
            | "top"
            | "bottom"
            | "left"
            | "right"
            | "end-top"
            | "end-bottom"
            | "start-top"
            | "start-bottom";
        modelValue?: string[];
    }>(),
    {
        disabled: false,
        placement: "top",
        modelValue: () => [],
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", mcpIds: string[]): void;
    (e: "select", mcpIds: string[]): void;
}>();

const { t } = useI18n();
const toast = useToast();
const appStore = useAppStore();
const popoverRef = ref<InstanceType<typeof BdPopover>>();
const selectedIds = useVModel(props, "modelValue", emit);
const allMcpList = ref<McpServerInfo[]>([]);

const { lockFn: getAllList, isLock: loading } = useLockFn(async () => {
    try {
        const data = await apiGetAllMcpServerList();
        allMcpList.value = data;

        const valid = selectedIds.value.filter((id) => data.some((item) => item.id === id));
        if (valid.length !== selectedIds.value.length) {
            emit("update:modelValue", valid);
        }
    } catch (e) {
        console.error("Failed to load MCP", e);
    }
});

const handleSelect = (mcp: McpServerInfo) => {
    if (!mcp.connectable) {
        toast.error(mcp.connectError || t("common.message.mcpNotConnectable"));
        return;
    }

    const currentIds = [...selectedIds.value];
    const index = currentIds.indexOf(mcp.id);
    if (index > -1) {
        currentIds.splice(index, 1);
    } else {
        if (currentIds.length >= 5) {
            toast.error(t("common.message.mcpMaxLimit"));
            return;
        }
        currentIds.push(mcp.id);
    }

    emit("update:modelValue", currentIds);
    emit("select", currentIds);
};

const handlePopoverOpen = () => {
    if (props.disabled) {
        popoverRef.value?.close();
        return;
    }
    // Trigger haptic feedback when popover opens
    appStore.triggerHapticFeedback("light");
    getAllList();
};

defineExpose({
    open: () => popoverRef.value?.open(),
    close: () => popoverRef.value?.close(),
});
</script>

<template>
    <BdPopover
        ref="popoverRef"
        :placement="placement"
        :blur-intensity="4"
        :content-style="{
            background: 'var(--background-transparent)',
            maxHeight: '800rpx',
            width: '300rpx',
        }"
        @open="handlePopoverOpen"
    >
        <slot />
        <template #content>
            <view class="flex flex-col gap-2">
                <!-- Loading -->
                <view v-if="loading" class="text-muted-foreground py-10 text-center text-sm">
                    {{ t("common.loading") }}...
                </view>

                <!-- Empty -->
                <view
                    v-else-if="!allMcpList.length"
                    class="text-muted-foreground py-10 text-center text-sm"
                >
                    {{ t("common.noData") }}
                </view>

                <!-- MCP List -->
                <scroll-view v-else scroll-y class="max-h-[500px]">
                    <view class="space-y-1">
                        <view
                            v-for="mcp in allMcpList"
                            :key="mcp.id"
                            class="flex items-center gap-3 rounded-lg p-2 active:opacity-80"
                            :class="{
                                'bg-neutral-200': selectedIds.includes(mcp.id),
                                'opacity-50': !mcp.connectable,
                            }"
                            @click.stop="handleSelect(mcp)"
                        >
                            <!-- Icon -->
                            <image
                                v-if="mcp.icon"
                                :src="mcp.icon"
                                mode="aspectFill"
                                class="size-7 rounded-lg"
                            />
                            <view
                                v-else
                                class="bg-primary flex size-7 items-center justify-center rounded-lg"
                            >
                                <text class="i-lucide-route text-sm text-white" />
                            </view>

                            <!-- Info -->
                            <view class="min-w-0 flex-1">
                                <view class="text-foreground truncate text-sm font-medium">
                                    {{ mcp.alias || mcp.name }}
                                </view>
                                <view
                                    v-if="mcp.connectError"
                                    class="text-error mt-1 flex items-center gap-1 text-xs"
                                >
                                    <text class="i-lucide-alert-octagon text-xs" />
                                    <text class="line-clamp-1">{{ mcp.connectError }}</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>
        </template>
    </BdPopover>
</template>
