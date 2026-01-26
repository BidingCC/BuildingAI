<script setup lang="ts">
const { t } = useI18n();

const emit = defineEmits<{
    (e: "close", value: boolean): void;
}>();

/**
 * 关闭弹窗
 */
const handleClose = (): void => {
    emit("close", false);
};

/**
 * 查看订阅详情
 */
const handleViewDetail = (): void => {
    emit("close", true);
};
</script>

<template>
    <UModal>
        <template #content>
            <UCard>
                <div class="flex flex-col items-center py-6">
                    <div
                        class="bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                    >
                        <UIcon name="i-lucide-check" class="text-primary text-3xl" />
                    </div>
                    <h3 class="mb-2 text-xl font-semibold">
                        {{ t("membership.frontend.center.subscribeSuccess") }}
                    </h3>
                    <p class="text-muted-foreground mb-6 text-sm">
                        {{ t("membership.frontend.center.subscribeSuccessTip") }}
                    </p>
                    <div class="flex gap-3">
                        <UButton variant="outline" @click="handleClose">
                            {{ t("membership.frontend.center.close") }}
                        </UButton>
                        <UButton color="primary" @click="handleViewDetail">
                            {{ t("membership.frontend.center.viewDetail") }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </template>
    </UModal>
</template>
