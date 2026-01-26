<script lang="ts" setup>
import { ExtensionSupportTerminal } from "@buildingai/constants/shared/extension.constant";
import {
    apiGetExtensionByIdentifier,
    apiGetExtensionDetail,
    type ExtensionFormData,
} from "@buildingai/service/consoleapi/extensions";

const emits = defineEmits<{
    (e: "close"): void;
}>();

const props = defineProps<{
    isIdentifier?: boolean;
    extensionId: string;
    identifier: string;
}>();

const { t } = useI18n();
const open = shallowRef(true);
const extension = shallowRef<ExtensionFormData | null>(null);

const getTerminalLabel = (terminalType: number): string => {
    const terminalMap: Record<number, string> = {
        [ExtensionSupportTerminal.WEB]: t("extensions.modal.terminalTypes.web"),
        [ExtensionSupportTerminal.WEIXIN]: t("extensions.modal.terminalTypes.weixin"),
        [ExtensionSupportTerminal.H5]: t("extensions.modal.terminalTypes.h5"),
        [ExtensionSupportTerminal.MP]: t("extensions.modal.terminalTypes.mp"),
        [ExtensionSupportTerminal.API]: t("extensions.modal.terminalTypes.api"),
    };
    return terminalMap[terminalType] || "未知";
};

const getDetails = async () => {
    const res = props.isIdentifier
        ? await apiGetExtensionDetail(props.extensionId)
        : await apiGetExtensionByIdentifier(props.identifier);
    extension.value = res;
};

function handleClose() {
    emits("close");
    open.value = false;
}

onMounted(() => {
    getDetails();
});
</script>

<template>
    <UDrawer
        v-model:open="open"
        :set-background-color-on-scale="false"
        direction="right"
        should-scale-background
    >
        <template #content>
            <div v-if="extension" class="flex flex-col pr-4" style="width: 400px">
                <!-- 抽屉头部 -->
                <div class="flex items-center justify-between py-2">
                    <h2 class="text-secondary-foreground text-xl font-bold">
                        {{ $t("extensions.market.detail") }}
                    </h2>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-x"
                        @click="handleClose"
                    />
                </div>

                <!-- 抽屉内容 -->
                <div class="flex-1 overflow-y-auto">
                    <div class="flex flex-col space-y-6">
                        <!-- 插件基本信息 -->
                        <div class="mt-6 flex items-start gap-4">
                            <UAvatar
                                :src="extension.icon"
                                :alt="extension.name"
                                size="3xl"
                                :ui="{ root: 'rounded-lg' }"
                            >
                                <template #fallback>
                                    <UIcon
                                        name="i-lucide-puzzle"
                                        class="text-muted-foreground h-8 w-8"
                                    />
                                </template>
                            </UAvatar>
                            <div class="flex-1">
                                <h3
                                    class="text-secondary-foreground flex items-center gap-2 text-base"
                                >
                                    {{ extension.name }}
                                    <UBadge size="sm">
                                        {{ $t("extensions.market.officialTeam") }}
                                    </UBadge>
                                </h3>
                                <p class="text-accent-foreground my-2 text-sm dark:text-gray-400">
                                    {{ $t("extensions.market.author") }}:
                                    {{ extension?.author?.name || extension?.user }}
                                </p>
                                <div class="flex items-center gap-4">
                                    <div class="flex gap-1">
                                        <UBadge
                                            v-for="supportTerminal in extension.supportTerminal"
                                            :color="
                                                supportTerminal === ExtensionSupportTerminal.WEB
                                                    ? 'success'
                                                    : supportTerminal ===
                                                        ExtensionSupportTerminal.API
                                                      ? 'info'
                                                      : 'neutral'
                                            "
                                            variant="soft"
                                            :label="getTerminalLabel(supportTerminal)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 插件描述 -->
                        <div>
                            <h4 class="text-secondary-foreground mb-2 font-medium">
                                {{ $t("extensions.develop.form.version") }}
                            </h4>
                            <p class="text-accent-foreground dark:text-gray-400">
                                {{ extension.version }}
                            </p>
                        </div>

                        <div>
                            <h4 class="text-secondary-foreground mb-2 font-medium">
                                {{ $t("extensions.market.platformVersion") }}
                            </h4>
                            <div class="flex items-center gap-2">
                                <span class="text-accent-foreground dark:text-gray-400">
                                    {{ extension.engine }}
                                </span>
                                <div
                                    v-if="!extension.isCompatible"
                                    class="text-error flex items-center gap-1"
                                >
                                    <UIcon
                                        name="i-lucide-circle-alert"
                                        class="size-3.5 cursor-pointer"
                                    />
                                    <span class="text-xs leading-none">
                                        {{ $t("extensions.manage.incompatible") }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- 插件描述 -->
                        <div>
                            <h4 class="text-secondary-foreground mb-2 font-medium">
                                {{ $t("extensions.market.description") }}
                            </h4>
                            <p class="text-accent-foreground dark:text-gray-400">
                                {{ extension.description || extension.describe }}
                            </p>
                        </div>

                        <!-- 上次更新时间 -->
                        <div>
                            <h4 class="text-secondary-foreground mb-2 font-medium">
                                {{ $t("extensions.market.updateTime") }}
                            </h4>
                            <p class="text-accent-foreground dark:text-gray-400">
                                <TimeDisplay
                                    v-if="extension.updatedAt"
                                    :datetime="extension.updatedAt || extension.createdAt"
                                    mode="datetime"
                                />
                            </p>
                        </div>

                        <!-- 版本信息 -->
                        <div v-if="extension.versionLists && extension.versionLists.length > 0">
                            <h4 class="text-secondary-foreground mb-2 font-medium">
                                {{ $t("extensions.market.changelog") }}
                            </h4>
                            <div class="space-y-3">
                                <div
                                    v-for="(version, index) in extension.versionLists.slice(0, 3)"
                                    :key="index"
                                    class="bg-muted rounded-lg p-3"
                                >
                                    <div class="mb-1 flex items-center justify-between">
                                        <span class="text-secondary-foreground font-medium">
                                            v{{ version.version }}
                                        </span>
                                        <span
                                            class="text-muted-foreground text-sm dark:text-gray-400"
                                        >
                                            <TimeDisplay
                                                :datetime="version.createdAt"
                                                mode="date"
                                            />
                                        </span>
                                    </div>
                                    <p class="text-accent-foreground text-sm dark:text-gray-400">
                                        {{ version.explain }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 抽屉底部 -->
                <div class="flex gap-3 pb-4">
                    <UButton
                        color="neutral"
                        variant="outline"
                        class="flex-1 justify-center"
                        size="lg"
                        @click="handleClose"
                    >
                        {{ $t("console-common.close") }}
                    </UButton>
                </div>
            </div>
            <div v-else class="flex h-full w-full items-center justify-center" style="width: 400px">
                <UIcon name="i-lucide-package-search" class="h-12 w-12 text-gray-400" />
            </div>
        </template>
    </UDrawer>
</template>
