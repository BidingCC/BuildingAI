<script setup lang="ts">
import type { McpServerDetail } from "@buildingai/service/consoleapi/mcp-server";
import { apiCheckMcpServerConnect } from "@buildingai/service/consoleapi/mcp-server";

const props = withDefaults(
    defineProps<{
        mcpServer: McpServerDetail;
        selected?: boolean;
        isUpdate?: string[];
    }>(),
    {
        selected: false,
    },
);

const emit = defineEmits<{
    (e: "select", mcpServer: McpServerDetail, selected: boolean | "indeterminate"): void;
    (e: "delete", mcpServer: McpServerDetail): void;
    (e: "edit", mcpServer: McpServerDetail): void;
    (e: "set-quick-menu", mcpServer: McpServerDetail): void;
    (e: "view-models", mcpServerId: string): void;
    (e: "toggle-active", mcpServerId: string, isActive: boolean): void;
}>();

const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();
const connectable = shallowRef<boolean | "">("");
const connectableError = shallowRef<string | undefined>("");

const handleCheckConnect = async () => {
    const res = await apiCheckMcpServerConnect(props.mcpServer.id);
    connectable.value = res.connectable;
    connectableError.value = res.error;
};

const connectableType = computed(() => {
    return connectable.value === "" ? props.mcpServer.connectable : connectable.value;
});

const connectableErrorInfo = computed(() => {
    return connectable.value === "" ? props.mcpServer.connectError : connectableError.value;
});

const dropdownActions = computed(() => {
    const items = [];

    if (hasAccessByCodes(["ai-provider.backends:update"])) {
        items.push({
            label: t("console-common.edit"),
            icon: "i-lucide-edit",
            onSelect: () => emit("edit", props.mcpServer),
        });
    }

    if (hasAccessByCodes(["ai-provider.backends:update"]) && !props.mcpServer.isQuickMenu) {
        items.push({
            label: t("ai-mcp.backend.setQuickMenu"),
            icon: "i-lucide-star",
            onSelect: () => emit("set-quick-menu", props.mcpServer),
        });
    }

    if (hasAccessByCodes(["ai-provider.backends:delete"])) {
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
            onSelect: () => emit("delete", props.mcpServer),
        });
    }

    return items;
});

function handleCardClick() {
    emit("view-models", props.mcpServer.id);
}

function handleSelect(selected: boolean | "indeterminate") {
    if (typeof selected === "boolean") {
        emit("select", props.mcpServer, selected);
    }
}

function getFormattedUrl(url: string): string {
    if (!url) return "#";

    // 检查URL是否包含协议前缀，如果不包含则添加https://
    if (!/^https?:\/\//i.test(url)) {
        return "https://" + url;
    }

    return url;
}

onMounted(() => {
    if (props.isUpdate?.includes(props.mcpServer.id)) {
        handleCheckConnect();
        props.isUpdate?.splice(props.isUpdate.indexOf(props.mcpServer.id), 1);
    }
});
</script>

<template>
    <BdCard
        class="flex flex-col overflow-hidden"
        selectable
        clickable
        show-actions
        variant="outlined"
        :selected="selected"
        :actions="dropdownActions"
        @select="handleSelect"
    >
        <div
            v-if="mcpServer.isQuickMenu"
            class="bg-primary absolute top-3 -left-6 w-22 -rotate-45 text-center text-xs font-bold text-white shadow-md"
        >
            {{ t("ai-mcp.backend.quickMenu") }}
        </div>
        <template #icon="{ groupHoverClass, selectedClass }">
            <div class="flex items-center gap-4">
                <UChip :color="connectableType ? 'success' : 'error'" position="top-right">
                    <UAvatar
                        :src="mcpServer.icon"
                        :alt="mcpServer.name"
                        size="3xl"
                        :ui="{ root: 'rounded-lg', fallback: 'text-inverted' }"
                        :class="[
                            groupHoverClass,
                            selectedClass,
                            mcpServer.icon ? '' : 'bg-primary',
                        ]"
                    />
                </UChip>
                <div class="flex h-12 flex-col justify-start">
                    <h3 class="text-secondary-foreground flex items-center text-base font-semibold">
                        <UTooltip :text="mcpServer.name" :delay="0">
                            <span class="line-clamp-1">
                                {{ mcpServer.alias || mcpServer.name }}
                            </span>
                        </UTooltip>
                    </h3>
                    <a
                        v-if="mcpServer.providerName"
                        :href="getFormattedUrl(mcpServer.providerUrl)"
                        class="text-muted-foreground hover:text-primary group/a flex items-center gap-1 text-xs hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="line-clamp-1"> @ {{ mcpServer.providerName }} </span>
                        <UIcon
                            name="tabler:external-link"
                            class="flex-none opacity-0 group-hover/a:opacity-100"
                            size="12"
                        />
                    </a>
                </div>
            </div>
        </template>

        <template #description>
            <UTooltip
                :disabled="!mcpServer.description"
                :delay-duration="0"
                :ui="{
                    content: 'max-w-100 !whitespace-pre-wrap leading-relaxed h-fit p-2',
                }"
            >
                <template #content>
                    <div class="max-w-100">
                        {{ mcpServer.description }}
                    </div>
                </template>
                <h4 v-if="mcpServer.description" class="text-muted-foreground line-clamp-2 text-xs">
                    {{ mcpServer.description }}
                </h4>
                <h4 v-else class="text-muted-foreground line-clamp-2 text-xs">
                    {{ t("ai-mcp.backend.noDescription") }}
                </h4>
            </UTooltip>
            <UTooltip
                :text="connectableErrorInfo"
                :ui="{ content: 'max-w-100 !whitespace-pre-wrap leading-relaxed h-fit p-2' }"
                :delay-duration="0"
            >
                <template #content>
                    <div class="max-w-100">
                        {{ connectableErrorInfo }}
                    </div>
                </template>
                <div v-if="connectableErrorInfo" class="flex flex-row items-center gap-1.5">
                    <UIcon name="tabler:plug-connected-x" size="16" class="text-red-500" />
                    <h4 class="line-clamp-2 text-xs text-red-500">
                        {{ connectableErrorInfo }}
                    </h4>
                </div>
            </UTooltip>
        </template>

        <template #footer>
            <div class="flex items-center justify-between gap-2">
                <USwitch
                    :model-value="!mcpServer.isDisabled"
                    @update:model-value="(val) => emit('toggle-active', mcpServer.id, !val)"
                    unchecked-icon="i-lucide-x"
                    checked-icon="i-lucide-check"
                    size="md"
                />

                <div class="flex items-center gap-1">
                    <UButton icon="i-lucide-eye" variant="ghost" size="sm" @click="handleCardClick">
                        {{ t("console-common.check") }}
                    </UButton>
                </div>
            </div>
        </template>
    </BdCard>
</template>
