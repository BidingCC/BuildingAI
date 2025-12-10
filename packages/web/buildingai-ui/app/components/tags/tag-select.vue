<script setup lang="ts">
import type { TagTypeType } from "@buildingai/constants";
import { apiGetTagList, type TagFormData } from "@buildingai/service/consoleapi/tag";

const ManagePopup = defineAsyncComponent(() => import("./manage-popup.vue"));

const emits = defineEmits<{
    (e: "update:modelValue", value: string[]): void;
    (e: "change", value: TagFormData): void;
    (e: "close"): void;
}>();

const props = withDefaults(
    defineProps<{
        modelValue: string[];
        type?: TagTypeType;
    }>(),
    {
        modelValue: () => [],
        type: "app",
    },
);

const valueIds = useVModel(props, "modelValue", emits);
const overlay = useOverlay();

const tags = shallowRef<TagFormData[]>([]);
const selectedTags = shallowRef<TagFormData[]>([]);
const inputValue = shallowRef("");
const isOpen = shallowRef(false);

const getTags = async () => {
    const res = await apiGetTagList({
        type: props.type,
    });
    tags.value = res;
    syncSelectedTags();
};

const handleSelectTag = (tag: TagFormData) => {
    if (selectedTags.value.includes(tag)) {
        selectedTags.value = selectedTags.value.filter((item) => item.id !== tag.id);
    } else {
        selectedTags.value.push(tag);
    }
    valueIds.value = selectedTags.value.map((item) => item.id);
    emits("change", tag);
};

const openManagePopup = async () => {
    const modal = overlay.create(ManagePopup);
    const instance = modal.open({ type: props.type });
    await instance.result;
    await getTags();
};

const syncSelectedTags = () => {
    if (!tags.value?.length) {
        selectedTags.value = [];
        return;
    }
    selectedTags.value = tags.value.filter((t) => valueIds.value?.includes(t.id));
};

const clearSelectedTags = () => {
    valueIds.value = [];
    selectedTags.value = [];
    emits("change", [] as unknown as TagFormData);
};

watch(
    () => valueIds.value,
    () => {
        syncSelectedTags();
    },
    { deep: false },
);

watch(isOpen, (val) => {
    if (!val) {
        emits("close");
    } else {
        getTags();
    }
});
</script>

<template>
    <UPopover
        v-model:open="isOpen"
        :content="{
            align: 'center',
            side: 'bottom',
            sideOffset: 8,
        }"
    >
        <slot name="trigger">
            <UButton color="neutral" variant="outline" :ui="{ base: 'gap-2' }">
                <UIcon name="i-lucide-tag" class="size-4" />
                <span v-if="valueIds.length > 0" class="text-sm">
                    {{ valueIds.length }}{{ $t("common.tag.tags") }}
                </span>
                <span v-else class="text-dimmed flex-none text-sm">
                    {{ $t("common.tag.allTags") }}
                </span>
                <UButton
                    v-if="valueIds.length > 0"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-x"
                    size="xs"
                    @click="clearSelectedTags"
                />
                <UIcon name="i-lucide-chevron-down" class="text-dimmed size-4 shrink-0" />
            </UButton>
        </slot>

        <template #content>
            <div class="flex flex-col gap-2 p-2">
                <UInput
                    v-model="inputValue"
                    :placeholder="$t('common.search')"
                    clearable
                    icon="i-lucide-search"
                    variant="soft"
                    color="neutral"
                    :ui="{
                        root: 'w-full',
                        base: 'w-full',
                        trailing: 'pr-1',
                    }"
                />
                <div>
                    <div v-if="tags.length > 0" class="flex flex-col gap-1">
                        <template v-for="tag in tags" :key="tag.id">
                            <UButton
                                color="neutral"
                                variant="ghost"
                                :ui="{ base: 'justify-between' }"
                                @click="handleSelectTag(tag)"
                            >
                                {{ tag.name }}
                                <UIcon
                                    v-if="valueIds.includes(tag.id)"
                                    name="i-lucide-check"
                                    class="size-4"
                                />
                            </UButton>
                        </template>
                    </div>

                    <div
                        v-if="tags.length === 0"
                        class="flex h-30 flex-col items-center justify-center gap-2"
                    >
                        <UIcon name="i-lucide-tags" class="size-5" />
                        <span class="text-muted text-sm">
                            {{ $t("common.tag.noTags") }}
                        </span>
                    </div>
                </div>
                <USeparator type="dashed" />
                <div>
                    <UButton
                        :label="$t('common.tag.manageTags')"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-tags"
                        :ui="{ base: 'w-full' }"
                        @click="openManagePopup"
                    />
                </div>
            </div>
        </template>
    </UPopover>
</template>
