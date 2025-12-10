<script setup lang="ts">
import type { TagTypeType } from "@buildingai/constants";
import {
    apiCreateTag,
    apiDeleteTag,
    apiGetTagList,
    apiUpdateTag,
    type TagFormData,
} from "@buildingai/service/consoleapi/tag";

const emits = defineEmits<{
    (e: "close"): void;
}>();

const props = defineProps<{
    type: TagTypeType;
}>();

const tags = shallowRef<TagFormData[]>([]);
const newTagName = shallowRef("");
const editingTag = shallowRef(-1);
const getTags = async () => {
    const res = await apiGetTagList({
        type: props.type,
    });
    tags.value = res;
};

const handleAddTag = async () => {
    if (!newTagName.value.trim()) return;
    await apiCreateTag({
        name: newTagName.value,
        type: props.type,
    });
    newTagName.value = "";
    getTags();
};

const handleEditTag = async (tag: TagFormData) => {
    if (!tag.name.trim()) return;
    await apiUpdateTag(tag.id, {
        name: tag.name,
        type: props.type,
    });
    editingTag.value = -1;
    getTags();
};

const { t } = useI18n();

const handleDeleteTag = async (tag: TagFormData) => {
    const res = await useModal({
        title: t("common.tag.deleteTag"),
        description: t("common.tag.confirmDeleteTag"),
        color: "error",
    });
    if (res) {
        await apiDeleteTag(tag.id);
        getTags();
    }
};

onMounted(() => {
    getTags();
});
</script>

<template>
    <BdModal
        :title="$t('common.tag.manageTags')"
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close')"
    >
        <div class="flex flex-wrap gap-2">
            <UInput
                v-model="newTagName"
                :placeholder="$t('common.tag.createNewTag')"
                @keydown.enter="handleAddTag"
                @blur="handleAddTag"
            />

            <template v-for="(tag, tIndex) in tags" :key="tag.id">
                <UButton
                    v-if="editingTag !== tIndex"
                    color="neutral"
                    variant="outline"
                    :ui="{ base: 'gap-2' }"
                >
                    <span>{{ tag.name }}</span>
                    <span>{{ tag.bindingCount }}</span>
                    <UBadge
                        color="neutral"
                        icon="i-lucide-pen-line"
                        variant="soft"
                        size="xs"
                        @click="editingTag = tIndex"
                    />
                    <UBadge
                        color="neutral"
                        icon="i-lucide-trash"
                        variant="soft"
                        size="xs"
                        @click="handleDeleteTag(tag)"
                    />
                </UButton>
                <UInput
                    v-else
                    v-model="tag.name"
                    autofocus
                    color="primary"
                    @keydown.enter="handleAddTag"
                    @blur="handleEditTag(tag)"
                />
            </template>
        </div>
    </BdModal>
</template>
