<script lang="ts" setup>
import {
    apiGetExtensionVersions,
    type ExtensionFormData,
    type ExtensionVersion,
} from "@buildingai/service/consoleapi/extensions";

const emits = defineEmits<{
    (e: "close"): void;
}>();

const props = defineProps<{
    extension: ExtensionFormData;
    identifier: string;
}>();

const open = shallowRef(true);
const versions = shallowRef<ExtensionVersion[]>([]);

const getDetails = async () => {
    const res = await apiGetExtensionVersions(props.identifier);
    versions.value = res;
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
            <div class="flex h-full w-[300px] flex-col pr-4">
                <!-- 抽屉头部 -->
                <div class="flex items-center justify-between py-2">
                    <h3 class="text-secondary-foreground text-xl">
                        {{ $t("extensions.market.changelog") }} - {{ extension.name }}
                    </h3>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-x"
                        @click="handleClose"
                    />
                </div>

                <!-- 抽屉内容 -->
                <div class="flex-1 overflow-y-auto pt-8">
                    <div v-if="versions.length > 0" class="space-y-4">
                        <div
                            v-for="version in versions"
                            :key="version.version"
                            class="bg-muted rounded-lg p-3"
                        >
                            <div class="mb-2 flex items-center justify-between">
                                <span class="text-secondary-foreground font-medium">
                                    v{{ version.version }}
                                </span>
                                <span class="text-muted-foreground text-sm">
                                    <TimeDisplay :datetime="version.createdAt" mode="date" />
                                </span>
                            </div>
                            <p class="text-accent-foreground mb-2 text-sm">
                                {{ version.explain }}
                            </p>
                        </div>
                    </div>

                    <div
                        v-else
                        class="flex h-full w-full flex-col items-center justify-center py-8 text-center"
                    >
                        <UIcon name="i-lucide-clock" class="mx-auto mb-2 h-12" />
                        <p class="text-accent-foreground">
                            {{ $t("extensions.market.noVersionInfo") }}
                        </p>
                    </div>
                </div>
            </div>
        </template>
    </UDrawer>
</template>
