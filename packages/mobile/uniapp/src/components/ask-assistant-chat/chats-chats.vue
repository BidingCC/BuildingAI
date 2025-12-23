<script setup lang="ts">
import { userInfo } from "os";

import { type AiConversation, apiGetAiConversationList } from "@/service/ai-conversation";

const props = withDefaults(
    defineProps<{
        isEditMode?: boolean;
        currentConversationId?: string;
    }>(),
    {
        isEditMode: false,
        currentConversationId: undefined,
    },
);

const emit = defineEmits<{
    edit: [item: AiConversation];
    delete: [item: AiConversation];
    select: [item: AiConversation];
}>();

const userStore = useUserStore();
const pagingRefs = ref<ZPagingRef>();
const dataList = ref<AiConversation[]>([]);

const queryList = async (page: number, pageSize: number) => {
    try {
        const res = await apiGetAiConversationList({ page, pageSize });
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

const handleSelect = (item: AiConversation) => {
    if (!props.isEditMode) {
        emit("select", item);
    }
};

onShow(() => {
    pagingRefs.value?.refresh();
});

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
            inside-more
            :show-loading-more-no-more-view="false"
            v-model="dataList"
            @query="queryList"
        >
            <template #empty>
                <view class="flex h-full flex-col items-center justify-center">
                    <text class="text-foreground text-sm">
                        {{ userStore.isLogin ? "暂无历史记录" : "请先登录" }}
                    </text>
                </view>
            </template>
            <view class="flex flex-col gap-2 p-2">
                <template v-for="(item, index) in dataList" :key="index">
                    <view
                        class="flex w-full items-center gap-2 rounded-lg pr-2 transition-colors"
                        :class="{
                            'cursor-pointer': !props.isEditMode,
                            'bg-primary/10': props.currentConversationId === item.id,
                        }"
                        @click="handleSelect(item)"
                    >
                        <view
                            class="w-full truncate p-2 text-sm"
                            :class="{
                                'text-primary font-medium': props.currentConversationId === item.id,
                                'text-foreground': props.currentConversationId !== item.id,
                            }"
                        >
                            {{ item.title }}
                        </view>
                        <view v-if="props.isEditMode" class="flex flex-none gap-2">
                            <view
                                i-lucide-pencil
                                class="text-primary cursor-pointer text-sm"
                                @click.stop="handleEdit(item)"
                            />
                            <view
                                i-lucide-trash
                                class="text-error cursor-pointer text-sm"
                                @click.stop="handleDelete(item)"
                            />
                        </view>
                    </view>
                </template>
            </view>
        </z-paging>
    </view>
</template>
