<script setup lang="ts">
import type { AiProviderInfo } from "@buildingai/service/consoleapi/ai-provider";

const props = withDefaults(
    defineProps<{
        provider: AiProviderInfo;
        selected?: boolean;
    }>(),
    {
        selected: false,
    },
);

const emit = defineEmits<{
    (e: "select", provider: AiProviderInfo, selected: boolean | "indeterminate"): void;
    (e: "delete", provider: AiProviderInfo): void;
    (e: "edit", provider: AiProviderInfo): void;
    (e: "view-models", providerId: string): void;
    (e: "toggle-active", providerId: string, isActive: boolean): void;
}>();
const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();

function getProviderStatusInfo(isActive: boolean) {
    if (isActive) {
        return {
            label: t("console-common.enabled"),
            color: "success" as const,
            icon: "i-lucide-check-circle",
        };
    } else {
        return {
            label: t("console-common.disabled"),
            color: "error" as const,
            icon: "i-lucide-x-circle",
        };
    }
}

const dropdownActions = computed(() => {
    const items = [];

    if (hasAccessByCodes(["ai-provider.backends:update"])) {
        items.push({
            label: t("console-common.edit"),
            icon: "i-lucide-edit",
            onSelect: () => emit("edit", props.provider),
        });
    }

    if (hasAccessByCodes(["ai-provider.backends:delete"]) && !props.provider.isBuiltIn) {
        if (items.length > 0) {
            items.push({
                type: "separator" as const,
                label: "",
                onSelect: () => {},
            });
        }
        items.push({
            label: t("console-common.delete"),
            icon: "i-lucide-trash-2",
            color: "error" as const,
            onSelect: () => emit("delete", props.provider),
        });
    }

    return items;
});

const statusInfo = computed(() => getProviderStatusInfo(props.provider.isActive));

function handleCardClick() {
    // router.push({
    //     path: useRoutePath("ai-models:list"),
    //     query: { id: props.provider.id },
    // });
    emit("view-models", props.provider.id);
}

function handleSelect(selected: boolean | "indeterminate") {
    if (typeof selected === "boolean") {
        emit("select", props.provider, selected);
    }
}

const localIsActive = ref(props.provider.isActive);

watchEffect(() => {
    localIsActive.value = props.provider.isActive;
});

const handleToggleActive = async () => {
    const originalState = !localIsActive.value;

    try {
        emit("toggle-active", props.provider.id, localIsActive.value);

        await new Promise((resolve) => setTimeout(resolve, 200));

        if (props.provider.isActive !== localIsActive.value) {
            localIsActive.value = originalState;
        }
    } catch (error) {
        localIsActive.value = originalState;
        console.error("Toggle provider active failed:", error);
    }
};
</script>

<template>
    <BdCard
        selectable
        clickable
        show-actions
        variant="outlined"
        class="cursor-pointer"
        :selected="selected"
        :actions="dropdownActions"
        @select="handleSelect"
        @click="handleCardClick"
    >
        <template #icon="{ groupHoverClass, selectedClass }">
            <UChip
                :position="provider.isActive ? 'top-right' : undefined"
                :color="statusInfo.color"
            >
                <UAvatar
                    :src="provider.iconUrl"
                    :alt="provider.name"
                    size="3xl"
                    :ui="{ root: 'rounded-lg', fallback: 'text-inverted' }"
                    :class="[groupHoverClass, selectedClass, provider.iconUrl ? '' : 'bg-primary']"
                />
            </UChip>
        </template>

        <template #title>
            <div class="flex items-center justify-between">
                <h3 class="text-secondary-foreground flex items-center text-base font-semibold">
                    <UTooltip :text="provider.name" :delay="0">
                        <span class="line-clamp-1 shrink-0">
                            {{ provider.name }}
                        </span>
                    </UTooltip>
                    <span class="text-muted-foreground mr-2 ml-1 line-clamp-1 shrink-0 text-sm">
                        ({{ provider.provider }})
                    </span>
                </h3>
            </div>
        </template>

        <template #description>
            <p v-if="provider.description" class="text-muted-foreground line-clamp-2 text-xs">
                {{ provider.description }}
            </p>

            <div class="flex flex-row flex-wrap gap-1">
                <UBadge
                    v-for="type in provider.supportedModelTypes"
                    :key="type"
                    variant="soft"
                    color="neutral"
                    size="sm"
                    class="h-fit"
                >
                    {{ type.toLocaleUpperCase().replaceAll("-", " ") }}
                </UBadge>
            </div>
        </template>

        <template #footer>
            <div class="flex items-center justify-between gap-2">
                <UBadge
                    variant="outline"
                    color="neutral"
                    size="sm"
                    class="shrink-0 gap-0 rounded-full"
                >
                    {{ provider.models.length }}
                    {{ `${t("common.unit.general.item")}${t("common.ai.model")}` }}
                    <UIcon name="i-lucide-chevron-right" />
                </UBadge>
                <AccessControl :codes="['ai-providers:update']">
                    <USwitch
                        v-model="localIsActive"
                        @click.stop
                        @update:model-value="handleToggleActive"
                    />
                </AccessControl>
            </div>
        </template>
    </BdCard>
</template>
