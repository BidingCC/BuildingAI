<script setup lang="ts">
import {
    type McpServerInfo,
    McpServerType,
    type SystemMcpServerInfo,
} from "@buildingai/service/webapi/mcp-server";
import { apiGetAllMcpServerList } from "@buildingai/service/webapi/mcp-server";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

interface Props {
    modelValue?: string[];
    disabled?: boolean;
    showDescription?: boolean;
    defaultSelected?: boolean;
    console?: boolean;
    capability?: string;
    modelId?: string;
    mcpIds?: string[];
    useCache?: boolean;
}

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();

const props = withDefaults(defineProps<Props>(), {
    showDescription: true,
    defaultSelected: true,
    console: false,
    modelId: "",
    useCache: true,
});

const emit = defineEmits<{
    (e: "update:modelValue", value: string[]): void;
    (e: "change", value: string[]): void;
}>();

const loading = ref(false);
const isOpen = ref(false);
const search = ref("");
const selectedIds = ref<string[]>([]);
const tab = ref<McpServerType>(McpServerType.SYSTEM);
const allMcpList = ref<(McpServerInfo | SystemMcpServerInfo)[]>([]);
const toast = useMessage();

const filteredMcpList = computed(() => {
    const query = search.value.trim().toLowerCase();
    const mcpList = allMcpList.value.filter((m) => m.type === tab.value);

    if (!query) return mcpList;

    // Filter mcpList, return objects where name, providerName or description contains query
    const filteredMcpList = mcpList.filter((m) =>
        [m.name, m.providerName, m.description].some((s) => s?.toLowerCase().includes(query)),
    );
    return filteredMcpList;
});

/**
 * Only keep selected IDs that exist in allMcpList
 * Used for display and state judgment, avoiding "still showing selected effect" issues caused by invalid IDs
 */
const selectedValidIds = computed(() =>
    (Array.isArray(selectedIds.value) ? selectedIds.value : []).filter((id) =>
        allMcpList.value.some((m) => m.id === id),
    ),
);

const handleTabChange = (value: McpServerType) => {
    tab.value = value;
    getAllList();
};

/**
 * Get all MCP server list
 */
const getAllList = async () => {
    if (loading.value) return;
    loading.value = true;

    if (props.useCache) {
        // Restore selection from local storage, ensure it's an array type
        try {
            const raw = JSON.parse(localStorage.getItem("mcpIds") || "[]");
            selectedIds.value = Array.isArray(raw) ? raw : [];
        } catch {
            selectedIds.value = [];
        }
    } else {
        if (props.modelValue && Array.isArray(props.modelValue)) {
            selectedIds.value = [...props.modelValue];
        } else {
            selectedIds.value = [];
        }
    }

    try {
        const data: McpServerInfo[] | SystemMcpServerInfo[] = await apiGetAllMcpServerList();
        allMcpList.value = data;
        // Filter invalid selectedIds immediately after fetching, and sync back to local storage and emit events
        const sourceIds = Array.isArray(selectedIds.value) ? selectedIds.value : [];
        const valid = sourceIds.filter((id) => data.some((item) => item.id === id));
        if (valid.length !== selectedIds.value.length) {
            // Only update internal state for UI display, avoid clearing localStorage persistent selection on refresh
            selectedIds.value = valid;
        }
    } catch (e) {
        console.error("Failed to load MCP", e);
    } finally {
        loading.value = false;
    }
};

watch(
    () => props.modelValue,
    (newValue: string[] | undefined) => {
        if (!props.useCache && newValue && Array.isArray(newValue)) {
            const newIds = newValue.filter((id) => typeof id === "string");
            if (JSON.stringify(newIds.sort()) !== JSON.stringify(selectedIds.value.sort())) {
                selectedIds.value = newIds;
            }
        }
    },
    { immediate: true, deep: true },
);

onMounted(() => {
    if (userStore.isLogin) {
        getAllList();
    }
});

/**
 * Select or deselect MCP server
 */
function select(mcp: SystemMcpServerInfo | McpServerInfo) {
    const index = selectedIds.value.indexOf(mcp.id);
    if (index > -1) {
        // Already selected, deselect
        selectedIds.value.splice(index, 1);
    } else {
        // Not selected, add to selected list
        if (selectedIds.value.length === 5) {
            toast.warning(
                "为了保持性能，在当前的 MCP模式下，最多只能同时激活5个MCP 服务器。请在启用新的服务器之前关闭一些服务器。",
            );
            return;
        }
        selectedIds.value.push(mcp.id);
    }

    // 只有在启用缓存时才写入 localStorage
    if (props.useCache) {
        localStorage.setItem("mcpIds", JSON.stringify(selectedIds.value));
    }

    emit("update:modelValue", [...selectedIds.value]);
    emit("change", selectedIds.value);
}

/**
 * Clear all selections
 */
function clearSelection() {
    selectedIds.value = [];
    emit("update:modelValue", []);
    emit("change", []);
    isOpen.value = false;
    search.value = "";
    // 只有在启用缓存时才清除 localStorage
    if (props.useCache) {
        localStorage.removeItem("mcpIds");
    }
}

const findMcpById = (id: string) => allMcpList.value.find((m) => m.id === id);

async function handlePopoverUpdate(value: boolean) {
    if (value) {
        await getAllList();
        // Filter invalid IDs (gentler: only remove non-existent ones, not clear all)
        const sourceIds = Array.isArray(selectedIds.value) ? selectedIds.value : [];
        const valid = sourceIds.filter((id) => allMcpList.value.some((item) => item.id === id));
        if (valid.length !== selectedIds.value.length) {
            // Only update internal state for UI display, avoid clearing localStorage persistent selection when popover opens
            selectedIds.value = valid;
        }
    }
}
</script>

<template>
    <UPopover v-model:open="isOpen" :disabled="props.disabled" @update:open="handlePopoverUpdate">
        <UButton
            :color="selectedIds.length > 0 ? 'primary' : 'neutral'"
            variant="ghost"
            :ui="{ leadingIcon: 'size-4' }"
            :class="{ 'bg-primary/10': selectedValidIds.length }"
            :loading="loading"
            :disabled="props.disabled"
            @click.stop
        >
            <span class="flex items-center gap-1 truncate">
                <svg
                    class="size-4"
                    viewBox="0 0 195 195"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
                        stroke="currentColor"
                        stroke-width="12"
                        stroke-linecap="round"
                    />
                    <path
                        d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
                        stroke="currentColor"
                        stroke-width="12"
                        stroke-linecap="round"
                    />
                    <path
                        d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"
                        stroke="currentColor"
                        stroke-width="12"
                        stroke-linecap="round"
                    />
                </svg>
                <span class="hidden sm:block">{{ t("ai-mcp.frontend.tool") }}</span>
                <UAvatarGroup
                    v-if="selectedValidIds.length"
                    :ui="{ base: 'ring-0 -me-2' }"
                    size="2xs"
                >
                    <UAvatar
                        v-for="(id, index) in selectedValidIds"
                        :src="findMcpById(id)?.icon"
                        :style="`z-index: ${index + 1}`"
                        :key="id"
                        :class="`${!findMcpById(id)?.icon ? 'bg-primary' : 'bg-secondary'}`"
                        :ui="{ fallback: 'text-inverted' }"
                        :alt="
                            (() => {
                                const server = findMcpById(id);
                                return server?.name || '';
                            })()
                        "
                    />
                </UAvatarGroup>
                <!-- <span v-if="selectedIds.length">({{ selectedIds.length }})</span> -->
            </span>
            <div class="flex items-center gap-2">
                <UIcon
                    name="i-lucide-x"
                    v-if="selectedValidIds.length > 0 && props.console"
                    @click.stop="clearSelection()"
                />
                <div class="flex items-center">
                    <UIcon name="i-lucide-chevron-down" :class="{ 'rotate-180': isOpen }" />
                </div>
            </div>
        </UButton>

        <template #content>
            <div class="bg-background max-h-[480px] w-90 overflow-hidden rounded-lg shadow-lg">
                <div class="flex items-stretch gap-2 border-b p-3">
                    <UInput
                        v-model="search"
                        :placeholder="t('common.placeholder.mcpSelect')"
                        size="lg"
                        :ui="{ root: 'flex-1' }"
                    >
                        <template #leading><UIcon name="i-lucide-search" /></template>
                    </UInput>
                    <UButton
                        class="w-fit"
                        color="primary"
                        variant="ghost"
                        :ui="{ leadingIcon: 'size-4' }"
                        icon="i-lucide-rotate-ccw"
                        @click="selectedIds = []"
                        >{{ t("ai-mcp.frontend.reset") }}</UButton
                    >
                </div>

                <div class="grid grid-cols-1 gap-3 p-2">
                    <UTabs
                        color="primary"
                        variant="link"
                        :content="false"
                        :items="[
                            {
                                label: t('common.tab.system'),
                                value: 'system',
                            },
                            {
                                label: t('common.tab.custom'),
                                value: 'user',
                            },
                        ]"
                        @update:model-value="handleTabChange($event as McpServerType)"
                        v-model="tab"
                        class="w-full"
                    />
                    <div
                        v-if="loading"
                        class="text-muted-foreground col-span-full py-10 text-center"
                    >
                        {{ t("common.loading") }}...
                    </div>

                    <div
                        v-else-if="!filteredMcpList.length"
                        class="text-muted-foreground col-span-full py-10 text-center"
                    >
                        {{ t("common.empty") }}
                    </div>

                    <section class="max-h-70 space-y-2 overflow-y-auto">
                        <ul class="space-y-1">
                            <li
                                v-for="mcp in filteredMcpList"
                                :key="mcp.id"
                                class="group hover:bg-muted flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors"
                                :class="{
                                    'bg-secondary': selectedIds.includes(mcp.id),
                                    'cursor-not-allowed!': !mcp.connectable,
                                }"
                                @click="mcp.connectable && select(mcp)"
                            >
                                <UPopover
                                    mode="hover"
                                    :open-delay="500"
                                    :content="{
                                        align: 'start',
                                        side: 'right',
                                        sideOffset: 20,
                                    }"
                                >
                                    <div class="flex w-full flex-row items-center justify-between">
                                        <div
                                            class="flex flex-row items-center gap-2 space-y-0.5 overflow-hidden"
                                        >
                                            <UAvatar
                                                v-if="mcp.icon"
                                                :src="mcp.icon"
                                                :alt="mcp.name"
                                                size="lg"
                                                class="bg-secondary"
                                                :ui="{ image: 'rounded-md' }"
                                            />
                                            <div
                                                v-else
                                                class="bg-primary flex size-9 items-center justify-center rounded-md"
                                            >
                                                <svg
                                                    class="size-7 text-white"
                                                    viewBox="0 0 195 195"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
                                                        stroke="currentColor"
                                                        stroke-width="12"
                                                        stroke-linecap="round"
                                                    />
                                                    <path
                                                        d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
                                                        stroke="currentColor"
                                                        stroke-width="12"
                                                        stroke-linecap="round"
                                                    />
                                                    <path
                                                        d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"
                                                        stroke="currentColor"
                                                        stroke-width="12"
                                                        stroke-linecap="round"
                                                    />
                                                </svg>
                                            </div>
                                            <div class="flex flex-1 flex-col overflow-hidden">
                                                <p
                                                    class="text-secondary-foreground truncate text-sm font-medium"
                                                >
                                                    {{ mcp.alias || mcp.name }}
                                                </p>
                                                <p
                                                    v-if="props.showDescription && mcp.description"
                                                    class="text-muted-foreground truncate text-xs"
                                                >
                                                    {{ mcp.description }}
                                                </p>
                                                <div
                                                    v-if="mcp.connectError"
                                                    class="flex items-center gap-1 text-xs text-red-500"
                                                >
                                                    <UIcon
                                                        size="16"
                                                        name="i-lucide-alert-octagon"
                                                    />
                                                    <p class="line-clamp-1">
                                                        {{ mcp.connectError }}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <UIcon
                                            v-if="selectedIds.includes(mcp.id)"
                                            name="i-lucide-check-circle"
                                            class="text-primary flex-none"
                                            size="lg"
                                        />
                                    </div>

                                    <template #content>
                                        <div class="flex h-fit w-96 flex-col items-start gap-4 p-5">
                                            <!-- Header information -->
                                            <div class="flex flex-row justify-center gap-2">
                                                <UAvatar
                                                    v-if="mcp.icon"
                                                    :src="mcp.icon"
                                                    :alt="mcp.name"
                                                    size="2xl"
                                                    class="bg-secondary"
                                                    :ui="{ image: 'rounded-lg' }"
                                                />
                                                <div
                                                    v-else
                                                    class="bg-primary flex size-11 items-center justify-center rounded-lg"
                                                >
                                                    <svg
                                                        class="size-9 text-white"
                                                        viewBox="0 0 195 195"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"
                                                            stroke="currentColor"
                                                            stroke-width="12"
                                                            stroke-linecap="round"
                                                        />
                                                        <path
                                                            d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"
                                                            stroke="currentColor"
                                                            stroke-width="12"
                                                            stroke-linecap="round"
                                                        />
                                                        <path
                                                            d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"
                                                            stroke="currentColor"
                                                            stroke-width="12"
                                                            stroke-linecap="round"
                                                        />
                                                    </svg>
                                                </div>
                                                <div class="flex flex-col gap-1">
                                                    <p
                                                        class="text-secondary-foreground truncate text-sm font-medium"
                                                    >
                                                        {{ mcp.alias || mcp.name }}
                                                    </p>
                                                    <UBadge
                                                        v-if="mcp.connectable"
                                                        size="sm"
                                                        class="w-fit"
                                                        color="success"
                                                    >
                                                        {{ t("ai-mcp.frontend.success") }}
                                                    </UBadge>
                                                    <div
                                                        v-else
                                                        class="flex items-start gap-1 text-sm text-red-500"
                                                    >
                                                        <UIcon
                                                            size="20"
                                                            name="i-lucide-alert-octagon"
                                                        />
                                                        <p>
                                                            {{ mcp.connectError }}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <!-- Connection information -->

                                            <!-- MCP details -->
                                            <div
                                                class="bg-muted-foreground/10 w-full rounded-lg p-2"
                                            >
                                                <p
                                                    class="text-muted-foreground text-xs wrap-break-word"
                                                >
                                                    {{
                                                        mcp.description ||
                                                        t("ai-mcp.frontend.detail.noDescription")
                                                    }}
                                                </p>
                                            </div>

                                            <div v-if="mcp.connectable" class="space-y-2">
                                                <h2 class="text-xs font-bold">
                                                    {{ t("ai-mcp.frontend.detail.tools") }}
                                                </h2>

                                                <div class="flex flex-wrap gap-1">
                                                    <UBadge
                                                        v-for="tool in mcp.tools"
                                                        :key="tool.id"
                                                        color="neutral"
                                                        variant="outline"
                                                    >
                                                        {{ tool.name }}
                                                    </UBadge>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </UPopover>
                            </li>
                        </ul>
                        <div class="bg-muted sticky bottom-0">
                            <UButton
                                color="primary"
                                variant="subtle"
                                class="flex w-full items-center justify-center"
                                @click="
                                    router.push(`/profile/${userStore.userInfo?.id}/mcp-settings`)
                                "
                            >
                                {{ t("ai-mcp.frontend.setMcp") }}
                                <UIcon name="i-lucide-external-link" />
                            </UButton>
                        </div>
                    </section>
                </div>
            </div>
        </template>
    </UPopover>
</template>
