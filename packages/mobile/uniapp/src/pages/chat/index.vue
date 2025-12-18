<script setup lang="ts">
import { useRouter } from "@uni-helper/uni-use";

import ChatsPrompt from "@/components/ask-assistant-chat/chats-prompt/chats-prompt.vue";

const { t, currentLocale, currentLocaleLabel, locales, setLocale } = useLocale();

definePage({
    style: {
        navigationBarTitle: "pages.chat",
        auth: false,
        hiddenHeader: true,
    },
    // middleware: ["auth"],
});

const router = useRouter();
const showDrawer = shallowRef(false);
const inputValue = shallowRef("");
const handleClick = () => {
    router.navigate({
        url: "/pages/about_us/index",
    });
};

const showLocalePicker = () => {
    uni.showActionSheet({
        itemList: locales.map((l) => l.label),
        success: (res) => {
            setLocale(locales[res.tapIndex ?? 0]?.value ?? "en");
            updateTabBarTitles(t);
        },
    });
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
                        <text class="text-primary text-md p-2"> 编辑 </text>
                    </template>
                </BdNavbar>

                <scroll-view class="h-full" scroll-y>
                    <view class="space-y-2 p-4">
                        <view v-for="item in 60" :key="item" class="px-4 py-2">
                            {{ item }}
                        </view>
                    </view>
                </scroll-view>
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
                </view>
            </view>
        </template>

        <template #footer>
            <ChatsPrompt v-model="inputValue" />
        </template>
    </swipe-drawer>
</template>
