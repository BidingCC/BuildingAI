<script lang="ts" setup>
import type { ExtensionFormData } from "@buildingai/service/consoleapi/extensions";
import { apiUpgradeExtensionContent } from "@buildingai/service/consoleapi/extensions";

/**
 * 更新内容数据接口
 */
interface UpgradeContentData {
    version: string;
    notes?: string;
    features?: string;
    optimize?: string;
    fixs?: string;
}

const emits = defineEmits<{
    (e: "close", success?: boolean): void;
    (e: "confirmUpgrade"): void;
}>();

const props = defineProps<{
    extension: ExtensionFormData;
}>();

const { t } = useI18n();
const toast = useMessage();

const loading = shallowRef(true);
const upgrading = shallowRef(false);
const upgradeContent = shallowRef<UpgradeContentData | null>(null);

/**
 * 获取更新内容
 */
const getUpgradeContent = async () => {
    try {
        loading.value = true;
        const res = await apiUpgradeExtensionContent(props.extension.identifier);
        upgradeContent.value = res as unknown as UpgradeContentData;
    } catch (error) {
        console.error("获取更新内容失败:", error);
        toast.error(t("extensions.upgradePreview.fetchError"));
    } finally {
        loading.value = false;
    }
};

// 将换行分隔的字符串转换为数组
function splitLines(str: string) {
    if (!str) return [];
    return str.split("\n").filter((line) => line.trim());
}

/**
 * 确认更新
 */
const handleConfirmUpgrade = async () => {
    emits("confirmUpgrade");
    emits("close");
};

/**
 * 关闭弹框
 */
function handleClose() {
    emits("close");
}

onMounted(() => {
    getUpgradeContent();
});
</script>

<template>
    <BdModal
        :title="t('extensions.upgradePreview.title')"
        :ui="{ content: 'max-w-lg' }"
        @close="handleClose"
    >
        <div class="space-y-4">
            <!-- 加载状态 -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <UIcon name="i-lucide-loader-2" class="size-6 animate-spin" />
            </div>

            <!-- 更新内容 -->
            <div v-else-if="upgradeContent" class="space-y-4">
                <!-- 新版本号 -->
                <div>
                    <h4 class="text-foreground mb-1 text-sm font-medium">
                        {{ t("extensions.upgradePreview.newVersion") }}
                    </h4>
                    <p class="text-muted-foreground text-sm">v{{ upgradeContent.version }}</p>
                </div>

                <!-- 注意事项 -->
                <div
                    v-if="upgradeContent.notes"
                    class="bg-warning/10 border-warning/30 rounded-lg border p-3"
                >
                    <div class="mb-1 flex items-center gap-1.5">
                        <UIcon name="i-lucide-triangle-alert" class="text-warning size-4" />
                        <span class="text-warning text-sm font-medium">
                            {{ t("extensions.upgradePreview.notice") }}
                        </span>
                    </div>
                    <p class="text-warning text-sm whitespace-pre-line">
                        {{ upgradeContent.notes }}
                    </p>
                </div>

                <!-- 新增功能 -->
                <div v-if="upgradeContent.features">
                    <div class="mb-2 flex items-center gap-1.5">
                        <UIcon name="i-tabler-check" class="text-success size-4" />
                        <span class="text-foreground text-sm font-medium">
                            {{ t("extensions.upgradePreview.features") }}
                        </span>
                    </div>
                    <ul class="text-muted-foreground space-y-1 pl-5 text-sm">
                        <li
                            v-for="(item, index) in splitLines(upgradeContent.features)"
                            :key="`feature-${index}`"
                            class="list-disc"
                        >
                            {{ item }}
                        </li>
                    </ul>
                </div>

                <!-- 优化 -->
                <div v-if="upgradeContent.optimize">
                    <div class="mb-2 flex items-center gap-1.5">
                        <UIcon name="i-lucide-zap" class="text-info size-4" />
                        <span class="text-foreground text-sm font-medium">
                            {{ t("extensions.upgradePreview.optimizes") }}
                        </span>
                    </div>
                    <ul class="text-muted-foreground space-y-1 pl-5 text-sm">
                        <li
                            v-for="(item, index) in splitLines(upgradeContent.optimize)"
                            :key="`optimize-${index}`"
                            class="list-disc"
                        >
                            {{ item }}
                        </li>
                    </ul>
                </div>

                <!-- 修复 -->
                <div v-if="upgradeContent.fixs">
                    <div class="mb-2 flex items-center gap-1.5">
                        <UIcon name="i-lucide-bug" class="text-error size-4" />
                        <span class="text-foreground text-sm font-medium">
                            {{ t("extensions.upgradePreview.fixes") }}
                        </span>
                    </div>
                    <ul class="text-muted-foreground space-y-1 pl-5 text-sm">
                        <li
                            v-for="(item, index) in splitLines(upgradeContent.fixs)"
                            :key="`fix-${index}`"
                            class="list-disc"
                        >
                            {{ item }}
                        </li>
                    </ul>
                </div>

                <!-- 无更新内容 -->
                <div
                    v-if="
                        !upgradeContent.features &&
                        !upgradeContent.optimize &&
                        !upgradeContent.fixs &&
                        !upgradeContent.notes
                    "
                    class="text-muted-foreground py-4 text-center text-sm"
                >
                    {{ t("extensions.upgradePreview.noContent") }}
                </div>
            </div>

            <!-- 获取失败 -->
            <div v-else class="text-muted-foreground py-8 text-center text-sm">
                {{ t("extensions.upgradePreview.fetchError") }}
            </div>
        </div>

        <template #footer>
            <div class="flex items-center justify-end gap-3">
                <UButton color="neutral" variant="outline" @click="handleClose">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton
                    color="primary"
                    :loading="upgrading"
                    :disabled="loading || !upgradeContent"
                    @click="handleConfirmUpgrade"
                >
                    {{ t("extensions.upgradePreview.confirmUpgrade") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
