<script setup lang="ts">
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";

import { apiGetConversations } from "@/service/agent";

const props = withDefaults(
    defineProps<{
        publishToken: string;
        accessToken: string;
        isEditMode?: boolean;
        currentConversationId?: string | null;
    }>(),
    {
        isEditMode: false,
        currentConversationId: null,
    },
);

const emit = defineEmits<{
    edit: [item: AiConversation];
    delete: [item: AiConversation];
    select: [item: AiConversation];
}>();

const pagingRefs = ref<ZPagingRef>();
const dataList = ref<AiConversation[]>([]);

const queryList = async (page: number, pageSize: number) => {
    if (!props.accessToken || !props.publishToken) {
        pagingRefs.value?.complete([]);
        return;
    }

    try {
        const res = await apiGetConversations(props.publishToken, props.accessToken, {
            page,
            pageSize,
        });
        pagingRefs.value?.complete(res.items || []);
    } catch (error) {
        console.error("加载对话列表失败:", error);
        pagingRefs.value?.complete(false);
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
                    <text class="text-foreground text-sm">暂无历史记录</text>
                </view>
            </template>
            <view class="flex flex-col gap-2 p-2">
                <template v-for="(item, index) in dataList" :key="index">
                    <view
                        class="flex w-full items-center gap-2 rounded-lg pr-2 transition-colors"
                        @click="handleSelect(item)"
                    >
                        <view
                            class="w-full truncate p-2 text-sm"
                            :class="{
                                'text-primary font-medium': props.currentConversationId === item.id,
                                'text-foreground': props.currentConversationId !== item.id,
                            }"
                        >
                            {{ item.title || "未命名对话" }}
                        </view>
                        <view v-if="props.isEditMode" class="flex flex-none gap-2">
                            <view
                                i-lucide-pencil
                                class="text-primary text-sm"
                                @click.stop="handleEdit(item)"
                            />
                            <view
                                i-lucide-trash
                                class="text-error text-sm"
                                @click.stop="handleDelete(item)"
                            />
                        </view>
                    </view>
                </template>
            </view>
        </z-paging>
    </view>
</template>
