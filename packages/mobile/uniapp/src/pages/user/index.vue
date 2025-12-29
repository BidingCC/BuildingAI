<script setup lang="ts">
import BdNavbar from "@/components/bd-navbar.vue?async";
import UserBanner from "@/components/widget/user-banner/user-banner.vue?async";
import UserService from "@/components/widget/user-service/user-service.vue?async";
import UserVersion from "@/components/widget/user-version/user-version.vue?async";
import type { PagesConfig } from "@/service/decorate";
import { apiGetPagesConfig } from "@/service/decorate";

definePage({
    style: {
        navigationBarTitle: "pages.user",
        hiddenHeader: true,
    },
});

const { t } = useI18n();
const userStore = useUserStore();

const userInfo = computed(() => userStore.userInfo);

const pagesConfig = ref<PagesConfig | null>(null);

const toSettings = () => {
    uni.navigateTo({
        url: "/packages/user-settings/index",
    });
};

const fetchPagesConfig = async () => {
    try {
        const config = await apiGetPagesConfig("user");
        if (config) {
            // 处理 user-service 数据，将 title 映射为 name
            if (config["user-service"]?.data) {
                config["user-service"].data = config["user-service"].data.map(
                    (item: Record<string, unknown>) => ({
                        ...item,
                        name: item.title || item.name || "",
                    }),
                );
            }
            pagesConfig.value = config;
        }
    } catch (error) {
        console.error("获取页面配置失败:", error);
    }
};

onMounted(() => {
    fetchPagesConfig();
});
</script>

<template>
    <view class="flex h-[calc(100vh-112px)] flex-col px-4">
        <BdNavbar
            :title="t('pages.user')"
            :show-back="false"
            :show-home="false"
            filter="blur(4px)"
        />
        <view flex="~ items-center" gap="3" py="8" px="2" @click="toSettings">
            <image v-if="userStore.isLogin" :src="userInfo?.avatar" class="size-14 rounded-full" />
            <image v-else src="@/static/images/default-avatar.png" class="size-14 rounded-full" />
            <view flex="~ col" v-if="userStore.isLogin">
                <view text="foreground lg" font="medium">{{ userInfo?.nickname }}</view>
                <view text="muted-foreground sm">
                    {{ userInfo?.email || userInfo?.phone || "admin" }}
                </view>
            </view>
            <view flex="~ col items-center" v-else>
                <view text="foreground md" font="medium">登录</view>
                <view text="muted-foreground sm">登录解锁更多精彩内容～</view>
            </view>
        </view>
        <!-- 能量积分 -->
        <view class="">
            <!-- <view class="bg-primary-200 w-full rounded-t-lg">
                <view class="flex items-center justify-between p-2">
                    <view class="text-foreground text-sm font-medium"> 开通会员 </view>

                    <view class="flex items-center text-xs">
                        <text>去开通</text>
                        <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
                    </view>
                </view>
            </view> -->
            <view class="bg-background rounded-lg p-4">
                <view class="mb-2 flex items-center justify-between">
                    <view class="text-foreground text-sm font-medium"> 积分余额 </view>

                    <view class="text-muted-foreground flex items-center text-xs">
                        <text>明细</text>
                        <view i-carbon-chevron-right class="ml-1" />
                    </view>
                </view>
                <view flex="~ items-center justify-between" gap="2">
                    <view text="muted-foreground sm">
                        <view text="warning-600 lg" font="medium">{{ userInfo?.power }}</view>
                    </view>
                    <view class="text-background bg-primary rounded-full px-2 py-1 text-xs">
                        充值积分
                    </view>
                </view>
            </view>
        </view>

        <!-- User Service -->
        <UserService v-if="pagesConfig?.['user-service']" :content="pagesConfig['user-service']" />

        <!-- User Banner -->
        <UserBanner v-if="pagesConfig?.['user-banner']" :content="pagesConfig['user-banner']" />

        <UserVersion />
    </view>
</template>

<style scoped>
/* #ifdef H5 */
page {
    background-image:
        url("@/static/images/background.png"),
        linear-gradient(
            to bottom,
            var(--primary-300) 0%,
            var(--primary-200) 10%,
            var(--primary-50) 25%,
            var(--background-soft) 30%,
            var(--background-soft) 100%
        );
    background-size: 100%, cover;
    background-position: top, top;
    background-repeat: no-repeat, no-repeat;
    z-index: 0;
}
/* #endif */
</style>

<style>
/* #ifndef H5 */
page {
    background-image:
        url("@/static/images/background.png"),
        linear-gradient(
            to bottom,
            var(--primary-300) 0%,
            var(--primary-200) 10%,
            var(--primary-50) 25%,
            var(--background-soft) 30%,
            var(--background-soft) 100%
        );
    background-size: 100%, cover;
    background-position: top, top;
    background-repeat: no-repeat, no-repeat;
    z-index: 0;
}
/* #endif */
</style>
