<script setup lang="ts">
import ChatsChats from "@/async-components/ask-assistant-chat/chats-chats.vue?async";
import ChatsPrompt from "@/async-components/ask-assistant-chat/chats-prompt/chats-prompt.vue?async";
import BdModal from "@/async-components/bd-modal.vue?async";
import BdNavbar from "@/async-components/bd-navbar.vue?async";
import Test from "@/async-components/test.vue?async";
import {
    type AiConversation,
    apiDeleteAiConversation,
    apiUpdateAiConversation,
} from "@/service/ai-conversation";

definePage({
    style: {
        navigationBarTitle: "pages.chat",
        auth: false,
        hiddenHeader: true,
    },
    // middleware: ["auth"],
});

const showDrawer = shallowRef(false);
const inputValue = shallowRef("");
const isEditMode = shallowRef(false);
const chatsChatsRef = ref<InstanceType<typeof ChatsChats>>();
const modalRef = ref<InstanceType<typeof BdModal>>();
const deleteModalRef = ref<InstanceType<typeof BdModal>>();
const editTitle = shallowRef("");
const currentEditItem = shallowRef<AiConversation | null>(null);

const handleEdit = (item: AiConversation) => {
    currentEditItem.value = item;
    editTitle.value = item.title;
    modalRef.value?.open();
};

const handleDelete = (item: AiConversation) => {
    currentEditItem.value = item;
    deleteModalRef.value?.open();
};

const confirmEdit = async () => {
    if (!currentEditItem.value || !editTitle.value.trim()) {
        useToast().error("标题不能为空");
        return;
    }

    try {
        await apiUpdateAiConversation(currentEditItem.value.id, {
            title: editTitle.value.trim(),
        });
        chatsChatsRef.value?.refresh();
    } catch (error) {
        console.error(error);
        useToast().error("修改失败");
    }
};

const confirmDelete = async () => {
    if (!currentEditItem.value) {
        return;
    }

    try {
        await apiDeleteAiConversation(currentEditItem.value.id);
        chatsChatsRef.value?.refresh();
    } catch (error) {
        console.error(error);
        useToast().error("删除失败");
    }
};
</script>

<template>
    <swipe-drawer ref="drawer" v-model="showDrawer" drawerBgColor="var(--background)" h="full">
        <template #drawer>
            <view class="bg-background flex h-full min-h-0 w-full flex-col">
                <BdNavbar title="" :show-back="true" :show-home="true" filter="blur(4px)">
                    <template #left>
                        <text class="text-md font-medium">历史记录</text>
                    </template>
                    <template #right>
                        <text
                            v-if="!isEditMode"
                            class="text-primary text-md cursor-pointer p-1"
                            @click="isEditMode = true"
                        >
                            编辑
                        </text>
                        <text
                            v-else
                            class="text-primary text-md cursor-pointer p-1"
                            @click="isEditMode = false"
                        >
                            完成
                        </text>
                    </template>
                </BdNavbar>

                <view class="h-full">
                    <ChatsChats
                        ref="chatsChatsRef"
                        :is-edit-mode="isEditMode"
                        @edit="handleEdit"
                        @delete="handleDelete"
                    />
                </view>
            </view>
        </template>

        <template #content>
            <view class="flex h-full min-h-0 flex-col">
                <BdNavbar title="BuildingAI" :show-back="true" :show-home="true" filter="blur(4px)">
                    <template #left>
                        <view class="flex items-center gap-1">
                            <view class="p-2" @click="showDrawer = true">
                                <text class="i-tabler-align-left text-lg" />
                            </view>
                            <view class="p-2">
                                <text class="i-tabler-message-circle-plus text-lg" />
                            </view>
                        </view>
                    </template>
                </BdNavbar>
                <view class="h-full" @click="showDrawer = true">
                    <!-- 主要内容区域 -->
                    <Test />
                </view>
            </view>
        </template>

        <template #footer>
            <ChatsPrompt v-model="inputValue" />
        </template>
    </swipe-drawer>

    <bd-modal
        ref="modalRef"
        title="编辑标题"
        :show-cancel="true"
        :show-confirm="true"
        @confirm="confirmEdit"
    >
        <view w="full" py="3">
            <uni-easyinput
                v-model="editTitle"
                placeholder="请输入标题"
                :trim="true"
                :maxlength="100"
            />
        </view>
    </bd-modal>

    <bd-modal
        ref="deleteModalRef"
        title="删除聊天记录"
        content="删除后，聊天记录不可恢复"
        @confirm="confirmDelete"
    />
</template>
