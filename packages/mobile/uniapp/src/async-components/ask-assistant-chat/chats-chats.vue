<script setup lang="ts">
import { type AiConversation, apiGetAiConversationList } from "@/service/ai-conversation";

const props = withDefaults(
    defineProps<{
        isEditMode?: boolean;
    }>(),
    {
        isEditMode: false,
    },
);

const emit = defineEmits<{
    edit: [item: AiConversation];
    delete: [item: AiConversation];
}>();

const pagingRefs = ref<ZPagingRef>();
const dataList = ref<AiConversation[]>([]);

const queryList = async () => {
    try {
        const res = await apiGetAiConversationList({ page: 1, pageSize: 50 });
        pagingRefs.value?.complete(res.items);
    } catch (error) {
        console.log(error instanceof Error ? error.message : "Unknown error");
        if (
            error instanceof Error &&
            error.message === "User not logged in, please login first and try again"
        ) {
            pagingRefs.value?.complete([]);
        } else {
            pagingRefs.value?.complete(false);
        }
    }
};

const handleEdit = (item: AiConversation) => {
    emit("edit", item);
};

const handleDelete = (item: AiConversation) => {
    emit("delete", item);
};

defineExpose({
    refresh: () => {
        pagingRefs.value?.refresh();
    },
});
</script>

<template>
    <view class="h-full">
        <z-paging
            ref="pagingRefs"
            :fixed="false"
            :show-loading-more-no-more-view="false"
            v-model="dataList"
            @query="queryList"
        >
            <view class="flex flex-col gap-2 p-2">
                <template v-for="(item, index) in dataList" :key="index">
                    <view class="flex w-full items-center gap-2 pr-2">
                        <view class="text-foreground w-full truncate p-2 text-sm">
                            {{ item.title }}
                        </view>
                        <view v-if="props.isEditMode" class="flex flex-none gap-2">
                            <view
                                i-lucide-pencil
                                class="text-primary cursor-pointer text-sm"
                                @click="handleEdit(item)"
                            />
                            <view
                                i-lucide-trash
                                class="text-error cursor-pointer text-sm"
                                @click="handleDelete(item)"
                            />
                        </view>
                    </view>
                </template>
            </view>
        </z-paging>
    </view>
</template>
