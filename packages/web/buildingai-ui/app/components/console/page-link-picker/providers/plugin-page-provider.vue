<script lang="ts" setup>
import { apiGetPluginLinks, type PluginLinkInfo } from "@buildingai/service/consoleapi/decorate";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { type LinkItem, LinkType } from "../layout.d";

const props = withDefaults(
    defineProps<{
        /** 搜索查询 */
        searchQuery?: string;
        /** 当前选中的链接 */
        selected?: LinkItem | null;
    }>(),
    {
        searchQuery: "",
        selected: null,
    },
);

const emit = defineEmits<{
    (e: "select", link: LinkItem): void;
}>();

const { t } = useI18n();

const pluginPages = ref<LinkItem[]>([]);

const filteredPages = computed(() => {
    if (!props.searchQuery) return pluginPages.value;

    const query = props.searchQuery.toLowerCase();
    return pluginPages.value.filter(
        (page) =>
            page.name?.toLowerCase().includes(query) || page.path?.toLowerCase().includes(query),
    );
});

const groupedPages = computed(() => {
    const groups: Record<string, LinkItem[]> = {};

    for (const page of filteredPages.value) {
        const pluginName = page.pluginName || extractPluginName(page.path ?? "");
        if (!groups[pluginName]) {
            groups[pluginName] = [];
        }
        groups[pluginName].push(page);
    }

    return groups;
});

const extractPluginName = (path: string): string => {
    const segments = path.replace(/^\//, "").split("/");
    return segments[0] || t("console-common.linkPicker.emptyState.unknownGroup");
};

/**
 * Load plugin pages
 */
const getPluginPages = async () => {
    try {
        // Call backend API to get plugin links list
        const response = await apiGetPluginLinks();

        if (response && response.error) {
            console.error("Failed to load plugin pages:", response.error);
            pluginPages.value = [];
            return;
        }

        if (!response || !response.data) {
            console.error("Invalid response format:", response);
            pluginPages.value = [];
            return;
        }

        const pages: LinkItem[] = response.data.map((link: PluginLinkInfo) => ({
            type: LinkType.PLUGIN,
            pluginName: link.pluginName,
            name: link.linkName,
            path: link.linkPath,
            query: {},
        }));

        pages.sort((a: LinkItem, b: LinkItem) => {
            const nameA = a.name || "";
            const nameB = b.name || "";
            return nameA.localeCompare(nameB);
        });

        pluginPages.value = pages;
    } catch (error) {
        console.error("Error loading plugin pages:", error);
        pluginPages.value = [];
    }
};

const selectPage = (page: LinkItem) => {
    emit("select", page);
};

const isSelected = (page: LinkItem) => {
    return props.selected?.path === page.path && props.selected?.type === LinkType.PLUGIN;
};

onMounted(() => getPluginPages());
</script>

<template>
    <div class="plugin-page-provider flex h-full flex-col">
        <div v-if="filteredPages.length === 0" class="flex flex-1 items-center justify-center">
            <div class="mx-auto max-w-md text-center">
                <div
                    class="from-muted/50 to-muted/20 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br"
                >
                    <UIcon
                        name="i-heroicons-puzzle-piece"
                        class="text-muted-foreground h-12 w-12"
                    />
                </div>
                <h3 class="text-foreground mb-3 text-xl font-bold">
                    {{
                        searchQuery
                            ? t("console-common.linkPicker.emptyState.noMatchingPages")
                            : t("console-common.linkPicker.emptyState.noPluginPages")
                    }}
                </h3>
                <p class="text-muted-foreground text-base leading-relaxed">
                    {{
                        searchQuery
                            ? t("console-common.linkPicker.emptyState.tryOtherKeywords")
                            : t("console-common.linkPicker.emptyState.contactAdmin")
                    }}
                </p>
            </div>
        </div>

        <div v-else class="flex-1 overflow-y-auto p-6">
            <template v-for="(pages, pluginName) in groupedPages" :key="pluginName">
                <div class="mb-4 flex items-center gap-3">
                    <UIcon name="i-heroicons-puzzle-piece" class="text-primary h-5 w-5" />
                    <h4 class="text-foreground text-lg font-semibold">
                        {{ pluginName }}
                    </h4>
                    <span
                        class="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
                    >
                        {{ pages.length }} {{ t("console-common.linkPicker.pageCount") }}
                    </span>
                </div>

                <div class="mb-4 flex flex-wrap gap-2">
                    <div
                        v-for="page in pages"
                        :key="page.path"
                        :class="[
                            'group relative flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200',
                            isSelected(page)
                                ? 'bg-primary/5 shadow-sm'
                                : 'bg-accent hover:bg-primary/5',
                        ]"
                        @click="selectPage(page)"
                    >
                        <div class="min-w-0 flex-1">
                            <div class="text-foreground truncate text-base font-semibold">
                                {{ page.name }}
                            </div>
                        </div>

                        <div v-if="isSelected(page)" class="absolute top-0 right-0 flex-none">
                            <div
                                class="bg-primary flex size-3 items-center justify-center rounded-full"
                            ></div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
