<script setup lang="ts">
import type {
    ExtensionFeatureItem,
    ExtensionFormData,
} from "@buildingai/service/consoleapi/extensions";
import {
    apiGetExtensionFeatures,
    apiUpdateFeatureLevels,
} from "@buildingai/service/consoleapi/extensions";

/**
 * 功能配置弹窗 Props
 */
const props = defineProps<{
    extension: ExtensionFormData;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const loading = shallowRef(false);
const saving = reactive<Record<string, boolean>>({});
const features = shallowRef<ExtensionFeatureItem[]>([]);
const featureLevelIds = reactive<Record<string, string[]>>({});

/**
 * 加载功能列表
 */
async function loadFeatures() {
    if (loading.value) return;
    loading.value = true;
    try {
        features.value = await apiGetExtensionFeatures(props.extension.identifier);
        features.value.forEach((f) => {
            featureLevelIds[f.id] = f.membershipLevels.map((l) => l.id);
        });
    } catch (error) {
        console.error("加载功能列表失败:", error);
        toast.error(t("console-common.messages.failed"));
    } finally {
        loading.value = false;
    }
}

/**
 * 保存功能会员等级
 */
async function saveFeatureLevels(feature: ExtensionFeatureItem) {
    if (saving[feature.id]) return;
    saving[feature.id] = true;
    try {
        const levelIds = featureLevelIds[feature.id] || [];
        const updated = await apiUpdateFeatureLevels(feature.id, levelIds);
        const idx = features.value.findIndex((f) => f.id === feature.id);
        if (idx !== -1) features.value[idx] = updated;
        toast.success(t("console-common.messages.success"));
    } catch (error) {
        console.error("保存失败:", error);
        toast.error(t("console-common.messages.failed"));
    } finally {
        saving[feature.id] = false;
    }
}

function handleLevelChange(featureId: string, value: string | string[]) {
    featureLevelIds[featureId] = Array.isArray(value) ? value : value ? [value] : [];
}

function handleClose() {
    emit("close");
}

onMounted(loadFeatures);
</script>

<template>
    <BdModal
        :title="t('extensions.featureConfig.title')"
        :description="extension.name"
        :ui="{ content: 'max-w-xl' }"
        @close="handleClose"
    >
        <div class="space-y-4">
            <!-- 插件信息 -->
            <div class="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
                <NuxtImg
                    v-if="extension.icon"
                    :src="extension.icon"
                    :alt="extension.name"
                    class="h-10 w-10 rounded-lg object-cover"
                />
                <div
                    v-else
                    class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg"
                >
                    <UIcon name="i-lucide-puzzle" class="text-primary h-5 w-5" />
                </div>
                <div>
                    <div class="font-medium">{{ extension.name }}</div>
                    <div class="text-muted-foreground text-sm">{{ extension.identifier }}</div>
                </div>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <UIcon
                    name="i-lucide-loader-2"
                    class="text-muted-foreground h-6 w-6 animate-spin"
                />
            </div>

            <!-- 空状态 -->
            <div
                v-else-if="!features.length"
                class="text-muted-foreground flex flex-col items-center justify-center py-12"
            >
                <UIcon name="i-lucide-box" class="mb-3 h-10 w-10 opacity-50" />
                <span class="text-sm">{{ t("extensions.featureConfig.empty") }}</span>
            </div>

            <!-- 功能列表 -->
            <div v-else class="space-y-3">
                <div
                    v-for="feature in features"
                    :key="feature.id"
                    class="border-border rounded-lg border p-4"
                >
                    <div class="mb-3">
                        <div class="flex items-center gap-2">
                            <span class="font-medium">{{ feature.name }}</span>
                            <UBadge variant="soft" color="neutral" size="sm">
                                {{ feature.featureCode }}
                            </UBadge>
                        </div>
                        <p v-if="feature.description" class="text-muted-foreground mt-1 text-sm">
                            {{ feature.description }}
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="min-w-0 flex-1">
                            <MembershipLevelSelect
                                :model-value="featureLevelIds[feature.id] as any"
                                multiple
                                :placeholder="t('extensions.featureConfig.levelPlaceholder')"
                                :button-ui="{
                                    class: 'w-full border border-border rounded-md',
                                }"
                                @update:model-value="handleLevelChange(feature.id, $event)"
                            />
                        </div>
                        <UButton
                            color="primary"
                            size="sm"
                            :loading="saving[feature.id]"
                            @click="saveFeatureLevels(feature)"
                        >
                            {{ t("console-common.save") }}
                        </UButton>
                    </div>

                    <p class="text-muted-foreground mt-2 text-xs">
                        {{ t("extensions.featureConfig.levelTip") }}
                    </p>
                </div>
            </div>
        </div>
    </BdModal>
</template>
