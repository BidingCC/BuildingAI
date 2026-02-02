<script setup lang="ts">
import {
    apiGetSystemRuntimeInfo,
    type SystemRuntimeInfo,
} from "@buildingai/service/consoleapi/system";

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const { copy } = useClipboard();
const { t } = useI18n();
const toast = useMessage();

const { lockFn: fetchRuntimeInfo, isLock: loading } = useLockFn(async () => {
    try {
        const data: SystemRuntimeInfo = await apiGetSystemRuntimeInfo();
        return data;
    } catch (error) {
        console.error("获取系统信息失败:", error);
        return null;
    }
});

const runtimeInfo = ref<SystemRuntimeInfo | null>(null);

// 格式化系统ID：显示前6位和后6位，中间用省略号
const formattedSystemId = computed(() => {
    const systemId = runtimeInfo.value?.systemId;
    if (!systemId || systemId.length <= 12) {
        return systemId || "-";
    }
    const prefix = systemId.substring(0, 6);
    const suffix = systemId.substring(systemId.length - 6);
    return `${prefix}****${suffix}`;
});

const handleClose = () => {
    emits("close", false);
};

const copySystemId = async () => {
    if (!runtimeInfo.value?.systemId) return;

    await copy(runtimeInfo.value.systemId);
    toast.success(t("console-common.messages.copySuccess"));
};

onMounted(async () => {
    runtimeInfo.value = await fetchRuntimeInfo();
});
</script>

<template>
    <BdModal
        :title="t('layouts.systemInfo.title')"
        :description="t('layouts.systemInfo.description')"
        :ui="{
            content: 'max-w-md',
        }"
        @close="handleClose"
    >
        <div v-if="loading" class="flex items-center justify-center" style="height: 200px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>
        <div v-else class="space-y-4 p-4">
            <div class="flex items-start gap-4">
                <span class="text-muted-foreground min-w-20 text-left text-sm">
                    {{ t("layouts.systemInfo.version") }}
                </span>
                <span class="text-secondary-foreground text-left text-sm font-medium">
                    {{ runtimeInfo?.version || "-" }}
                </span>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-muted-foreground min-w-20 text-left text-sm">
                    {{ t("layouts.systemInfo.systemId") }}
                </span>
                <div class="flex flex-1 items-center justify-between gap-2">
                    <span class="text-secondary-foreground text-left text-sm font-medium">
                        {{ formattedSystemId }}
                    </span>
                    <UButton
                        size="sm"
                        class="flex-none"
                        variant="soft"
                        icon="i-lucide-copy"
                        @click="copySystemId"
                    >
                        {{ t("console-common.copy") }}
                    </UButton>
                </div>
            </div>
        </div>
    </BdModal>
</template>
