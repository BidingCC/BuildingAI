<script setup lang="ts">
definePage({
    style: {
        navigationBarTitle: "pages.user",
        hiddenHeader: true,
    },
});

const { t } = useI18n();
const userStore = useUserStore();

const userInfo = computed(() => userStore.userInfo);

const toSettings = () => {
    uni.navigateTo({
        url: "/pages/user/settings",
    });
};
</script>

<template>
    <view class="flex h-[calc(100vh-112px)] flex-col px-4">
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
            <view class="bg-background mb-4 rounded-lg p-4">
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

        <view class="bg-background flex flex-col gap-1 rounded-lg px-4 py-2">
            <view flex="~ items-center" justify="between" gap="2" py="2">
                <view flex="~ items-center" gap="2">
                    <image src="@/static/images/user-share.png" class="size-6" />
                    <view>分享有礼</view>
                </view>
                <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
            </view>
            <view flex="~ items-center" justify="between" gap="2" py="2">
                <view flex="~ items-center" gap="2">
                    <image src="@/static/images/user-recharge.png" class="size-6" />
                    <view>充值套餐</view>
                </view>
                <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
            </view>
            <view flex="~ items-center" justify="between" gap="2" py="2">
                <view flex="~ items-center" gap="2">
                    <image src="@/static/images/user-member.png" class="size-6" />
                    <view>会员中心</view>
                </view>
                <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
            </view>
            <view flex="~ items-center" justify="between" gap="2" py="2">
                <view flex="~ items-center" gap="2">
                    <image src="@/static/images/user-account.png" class="size-6" />
                    <view>账户明细</view>
                </view>
                <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
            </view>
            <view flex="~ items-center" justify="between" gap="2" py="2">
                <view flex="~ items-center" gap="2">
                    <image src="@/static/images/user-about.png" class="size-6" />
                    <view>关于我们</view>
                </view>
                <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
            </view>
        </view>

        <view class="text-muted-foreground mt-10 flex items-center justify-center text-xs">
            <text mr="2">{{ t("common.version") }}</text>
            <text>25.2.0 (Build: 20260101)</text>
        </view>
    </view>
</template>

<style scoped>
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
</style>
