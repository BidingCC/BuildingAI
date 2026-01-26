<script setup lang="ts">
import type { ModelConfig } from "@buildingai/service/consoleapi/ai-agent";
import type { AiModel } from "@buildingai/service/webapi/ai-conversation";

const props = withDefaults(
    defineProps<{
        modelValue: ModelConfig;
        disabled?: boolean;
        buttonUi?: Record<string, unknown>;
    }>(),
    {
        modelValue: () => ({ id: "", options: {} }),
        disabled: false,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: ModelConfig): void;
}>();
const { t } = useI18n();

const open = shallowRef<boolean>(false);
const selectedModelName = shallowRef<string>("");
const modelId = shallowRef(props.modelValue.id);

// Parameter configuration
const paramConfigs = [
    {
        key: "temperature",
        label: t("ai-provider.backend.modelConfig.temperature.title"),
        description: t("ai-provider.backend.modelConfig.temperature.description"),
        range: { min: 0, max: 1, step: 0.1, default: 0 },
    },
    {
        key: "topP",
        label: t("ai-provider.backend.modelConfig.top_p.title"),
        description: t("ai-provider.backend.modelConfig.top_p.description"),
        range: { min: 0, max: 1, step: 0.1, default: 1 },
    },
    {
        key: "presencePenalty",
        label: t("ai-provider.backend.modelConfig.presence_penalty.title"),
        description: t("ai-provider.backend.modelConfig.presence_penalty.description"),
        range: { min: 0, max: 1, step: 0.1, default: 0 },
    },
    {
        key: "frequencyPenalty",
        label: t("ai-provider.backend.modelConfig.frequency_penalty.title"),
        description: t("ai-provider.backend.modelConfig.frequency_penalty.description"),
        range: { min: 0, max: 1, step: 0.1, default: 0 },
    },
] as const;

// Initialize parameters and enabled states
const parameters = reactive(
    paramConfigs.reduce(
        (acc, { key, range }) => ({
            ...acc,
            [key]: props.modelValue.options?.[key] ?? range.default,
        }),
        {} as Record<string, number>,
    ),
);

const paramEnabled = reactive(
    paramConfigs.reduce(
        (acc, { key }) => ({
            ...acc,
            [key]: props.modelValue.options?.[key] !== undefined,
        }),
        {} as Record<string, boolean>,
    ),
);

// Emit updated config
const emitUpdate = () => {
    const options = Object.fromEntries(
        paramConfigs
            .filter(({ key }) => paramEnabled[key])
            .map(({ key }) => [key, parameters[key]]),
    );

    emit("update:modelValue", {
        id: modelId.value,
        options,
    });
};

// Handle model changes
const handleModelChange = (value: string) => {
    modelId.value = value;
    emitUpdate();
};

const handleModelObjectChange = (model: AiModel | null) => {
    if (model) {
        selectedModelName.value = model.name;
        modelId.value = model.id;
        emitUpdate();
    }
};

// Watch for changes
watch([parameters, paramEnabled], emitUpdate, { deep: true });

watch(
    () => props.modelValue,
    (newValue) => {
        modelId.value = newValue.id;
        paramConfigs.forEach(({ key, range }) => {
            parameters[key] = newValue.options?.[key] ?? range.default;
            paramEnabled[key] = newValue.options?.[key] !== undefined;
        });
    },
    { deep: true },
);

defineShortcuts({ o: () => (open.value = !open.value) });
</script>

<template>
    <UPopover v-model:open="open" :default-open="false" :disabled="props.disabled">
        <UButton
            :color="selectedModelName ? 'primary' : 'neutral'"
            variant="soft"
            class="flex items-center justify-between"
            :disabled="props.disabled"
            v-bind="props.buttonUi"
            @click.stop
        >
            <span class="truncate">
                {{ selectedModelName || t("common.placeholder.modelSelect") }}
            </span>
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-settings-2" />
            </div>
        </UButton>

        <div class="hidden">
            <ModelSelect
                v-if="!open"
                :model-value="modelId"
                console
                :disabled="props.disabled"
                :button-ui="{
                    variant: 'soft',
                    color: 'neutral',
                    size: 'lg',
                    class: 'w-full justify-between',
                }"
                :supportedModelTypes="['llm']"
                @update:model-value="handleModelChange"
                @change="handleModelObjectChange"
            />
        </div>

        <template #content>
            <div class="bg-background w-84 overflow-hidden rounded-lg p-4 shadow-lg">
                <div class="mb-4">
                    <h3 class="mb-1 text-sm font-medium">
                        {{ $t("ai-agent.backend.configuration.model") }}
                    </h3>
                    <ModelSelect
                        :model-value="modelId"
                        console
                        :disabled="props.disabled"
                        :button-ui="{
                            variant: 'outline',
                            color: 'neutral',
                            size: 'lg',
                            class: 'w-full justify-between bg-background',
                        }"
                        :supportedModelTypes="['llm']"
                        @update:model-value="handleModelChange"
                        @change="handleModelObjectChange"
                    />
                </div>

                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-medium">
                            {{ $t("ai-agent.backend.configuration.parameters") }}
                        </h3>
                        <UButton size="xs" variant="soft" color="primary" icon="i-lucide-plus">
                            {{ $t("ai-agent.backend.configuration.preset") }}
                        </UButton>
                    </div>

                    <div class="space-y-3">
                        <div v-for="{ key, label, description, range } in paramConfigs" :key="key">
                            <div class="flex items-center gap-3">
                                <UCheckbox v-model="paramEnabled[key]" size="sm" />
                                <div class="flex w-20 min-w-0 items-center">
                                    <span class="text-muted-foreground text-xs">{{ label }}</span>
                                    <UTooltip :text="description" :delay-duration="0">
                                        <UIcon
                                            name="i-lucide-circle-help"
                                            class="text-muted-foreground ml-1 size-3"
                                        />
                                    </UTooltip>
                                </div>
                                <div
                                    class="flex-1"
                                    :class="{
                                        'pointer-events-none opacity-50': !paramEnabled[key],
                                    }"
                                >
                                    <BdSlider
                                        v-model="parameters[key]"
                                        :min="range.min"
                                        :max="range.max"
                                        :step="range.step"
                                        size="sm"
                                        class="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </UPopover>
</template>
