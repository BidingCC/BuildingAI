<script setup lang="ts">
import {
    apiGetExtensionList,
    type ExtensionFormData,
} from "@buildingai/service/consoleapi/extensions";

const searchForm = reactive({
    name: "",
    page: 1,
    isInstalled: true,
    pageSize: 15,
    status: undefined,
});

const overlay = useOverlay();

const ExtensionCard = defineAsyncComponent(() => import("./components/extension-card.vue"));
const ExtensionEdit = defineAsyncComponent(() => import("./components/extension-edit.vue"));
const AppsDecorate = defineAsyncComponent(() => import("./components/apps-decorate.vue"));

const { paging, getLists } = usePaging({
    fetchFun: apiGetExtensionList,
    params: searchForm,
});

const hasMore = computed(() => paging.items.length < paging.total);

const loadMore = () => {
    if (paging.loading) return;
    paging.page++;
    getLists({ append: true });
};

const handleEdit = async (extension: ExtensionFormData) => {
    const modal = overlay.create(ExtensionEdit);
    const instance = modal.open({
        isEdit: true,
        id: extension.id,
        initialData: {
            name: extension.name,
            packName: extension.identifier,
            description: extension.description,
            version: extension.version,
            icon: extension.icon,
            type: extension.type,
            alias: extension.alias,
            aliasDescription: extension.aliasDescription,
            aliasIcon: extension.aliasIcon,
            aliasShow: extension.aliasShow,
            supportTerminal: extension.supportTerminal || [],
            author: extension.author || {
                avatar: "",
                name: "",
                homepage: "",
            },
        },
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        paging.page = 1;
        getLists();
    }
};

const handleAppsDecorate = () => {
    overlay.create(AppsDecorate).open();
};

onMounted(() => getLists());
</script>

<template>
    <div class="flex w-full flex-col items-center justify-center">
        <div
            class="bg-background sticky top-0 z-10 flex w-full flex-wrap justify-between gap-4 pb-2"
        >
            <div class="flex items-center gap-4">
                <UInput
                    v-model="searchForm.name"
                    placeholder="请输入应用标识符"
                    class="w-80"
                    @change="getLists()"
                />

                <USelect
                    v-model="searchForm.status"
                    :items="[
                        { label: '全部', value: undefined },
                        { label: '启用', value: 1 },
                        { label: '禁用', value: 0 },
                    ]"
                    :placeholder="$t('ai-agent.backend.search.filterByStatus')"
                    label-key="label"
                    value-key="value"
                    class="w-48"
                    @change="getLists()"
                />
            </div>

            <div>
                <UButton
                    color="primary"
                    variant="ghost"
                    icon="i-lucide-package"
                    :label="$t('decorate.openDecorateSettings')"
                    @click.stop="handleAppsDecorate"
                />
            </div>
        </div>
        <BdScrollArea class="h-[calc(100vh-9rem)] min-h-0 w-full">
            <BdInfiniteScroll
                :loading="paging.loading"
                :has-more="hasMore"
                :loading-text="$t('extensions.manage.loadingText')"
                :no-more-text="paging.page !== 1 ? $t('extensions.manage.noMoreText') : ' '"
                @load-more="loadMore"
            >
                <div
                    class="grid grid-cols-1 gap-6 pt-2 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    <ExtensionCard
                        v-for="extension in paging.items"
                        :key="extension.identifier"
                        :extension="extension"
                        @select-extension="handleEdit(extension)"
                    />
                </div>
            </BdInfiniteScroll>
        </BdScrollArea>
    </div>
</template>
