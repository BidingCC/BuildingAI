<script lang="ts" setup>
import type { ExtensionFormData } from "@buildingai/service/consoleapi/extensions";

const props = defineProps<{
    extension: ExtensionFormData;
}>();

const emits = defineEmits<{
    (e: "select-extension", extension: ExtensionFormData): void;
}>();

const { t } = useI18n();

const selectExtension = () => {
    emits("select-extension", props.extension);
};
</script>

<template>
    <div class="group cursor-pointer transition-all duration-200" @click.stop="selectExtension">
        <UCard :ui="{ body: 'flex flex-col justify-between gap-2' }">
            <div class="flex flex-row justify-between gap-2">
                <div class="h-18">
                    <UTooltip :text="props.extension.alias || props.extension.name">
                        <h3 class="text-4 line-clamp-1 font-semibold">
                            {{ extension.alias || extension.name }}
                        </h3>
                    </UTooltip>
                    <p class="text-muted-foreground line-clamp-2 text-sm">
                        {{ extension.aliasDescription || extension.description }}
                    </p>
                </div>
                <div
                    class="border-default bg-muted flex size-18 flex-none items-center justify-center rounded-lg border"
                >
                    <UAvatar
                        :src="extension.aliasIcon ? extension.aliasIcon : extension.icon"
                        :alt="extension.name"
                        icon="i-lucide-puzzle"
                        :ui="{
                            root: `size-full rounded-md ${extension.icon ? '' : 'bg-primary'}`,
                            icon: 'size-7 text-white',
                        }"
                    >
                    </UAvatar>
                </div>
            </div>
            <div class="flex flex-row items-center justify-between">
                <div class="flex flex-row gap-2">
                    <UBadge
                        :color="props.extension.status === 1 ? 'success' : 'neutral'"
                        variant="soft"
                    >
                        {{
                            props.extension.status === 1
                                ? t("decorate.apps.extensionCard.statusEnabled")
                                : t("decorate.apps.extensionCard.statusDisabled")
                        }}
                    </UBadge>
                    <UBadge
                        :color="
                            props.extension.aliasShow && props.extension.status === 1
                                ? 'primary'
                                : 'neutral'
                        "
                        variant="soft"
                    >
                        {{
                            props.extension.aliasShow && props.extension.status === 1
                                ? t("decorate.apps.extensionCard.aliasVisible")
                                : t("decorate.apps.extensionCard.aliasHidden")
                        }}
                    </UBadge>
                </div>
                <div
                    class="text-muted-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                    <UIcon name="i-lucide-edit" class="size-4" />
                    <span>{{ t("decorate.apps.extensionCard.editAction") }}</span>
                </div>
            </div>
        </UCard>
    </div>
</template>
