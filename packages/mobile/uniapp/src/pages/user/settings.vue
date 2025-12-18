<script setup lang="ts">
import BdNavbar from "@/async-components/bd-navbar.vue?async";
import UserProfile from "@/async-components/user/user-profile.vue?async";
import UserVersion from "@/async-components/widget/user-version/user-version.vue?async";

const { t, currentLocaleLabel, locales, setLocale } = useLocale();

definePage({
    style: {
        navigationBarTitle: "pages.settings",
        hiddenHeader: true,
    },
});

const router = useRouter();
const userStore = useUserStore();

const userProfileRefs = ref<InstanceType<typeof UserProfile>>();

const shake = shallowRef(true);

const slideProgress = ref(0);
const isPopupOpen = ref(false);

const handleSlideProgress = (progress: number) => {
    slideProgress.value = progress;
};

const handlePopupOpen = () => {
    isPopupOpen.value = true;
    slideProgress.value = 1;
};

const handlePopupClose = () => {
    isPopupOpen.value = false;
    slideProgress.value = 0;
};

// 计算页面transform样式
const pageTransform = computed(() => {
    if (!isPopupOpen.value && slideProgress.value === 0) {
        return {
            transform: "none",
            transition: "transform 0.2s ease-out",
        };
    }

    const scale = 0.92;
    const maxBorderRadius = 24; // 最大圆角值（px）
    const maxTranslateY = 40; // 最大向下移动距离（px）

    // 直接使用进度值，不使用缓动函数，确保实时跟随
    // 进度为1时scale为0.92（缩小），进度为0时scale为1（正常）
    const finalScale = 1 - (1 - scale) * slideProgress.value;
    // 圆角根据进度动态变化，进度为1时圆角最大
    const borderRadius = maxBorderRadius * slideProgress.value;
    // 向下移动距离，进度为1时移动最大
    const translateY = maxTranslateY * slideProgress.value;

    // 只要进度不在边界值（0或1），就禁用transition实现实时跟随
    // 使用更小的阈值，确保从一开始滑动就能实时跟随
    const isSliding = slideProgress.value > 0.001 && slideProgress.value < 0.999;

    return {
        transform: `scale(${finalScale}) translateY(${translateY}px)`,
        transformOrigin: "center center",
        borderRadius: `${borderRadius}px`,
        overflow: "hidden",
        transition: isSliding
            ? "none"
            : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    };
});

function showLocalePicker() {
    uni.showActionSheet({
        itemList: locales.map((l) => l.label),
        success: (res) => {
            setLocale(locales[res.tapIndex].value);
        },
    });
}
</script>

<template>
    <view>
        <view class="settings-page-container" :style="pageTransform">
            <bd-navbar
                :title="t('pages.settings')"
                :fixed="true"
                :show-back="true"
                :show-home="true"
                :style="{ opacity: isPopupOpen ? 0 : 1 }"
                :filter="isPopupOpen ? 'none' : 'blur(4px)'"
            />
            <view class="p-4">
                <view
                    class="bg-background mb-6 flex items-center justify-between rounded-lg py-3 pr-2 pl-4"
                    @click="userProfileRefs?.open()"
                >
                    <view class="flex items-center gap-3">
                        <image :src="userStore.userInfo?.avatar" class="size-11 rounded-full" />
                        <view class="flex flex-col gap-1">
                            <view class="text-foreground text-sm font-medium">
                                {{ userStore.userInfo?.nickname }}
                            </view>
                            <view class="text-muted-foreground truncate text-xs">
                                {{
                                    userStore.userInfo?.email ||
                                    userStore.userInfo?.phone ||
                                    "admin"
                                }}
                            </view>
                        </view>
                    </view>
                    <view i-carbon-chevron-right class="text-muted-foreground ml-1" />
                </view>

                <view class="text-muted-foreground mb-2 ml-4 text-xs"> 账户 </view>
                <view class="bg-background mb-6 rounded-lg">
                    <view class="flex items-center justify-between pl-2" @click="showLocalePicker">
                        <view i-lucide-user-round w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{ t("common.account") }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm mr="1">{{ userStore.userInfo?.username }}</text>
                            </view>
                        </view>
                    </view>
                    <view class="flex items-center justify-between pl-2">
                        <view i-lucide-smartphone w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{ t("common.phone") }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm :class="{ 'mr-1': userStore.userInfo?.phone }">
                                    {{ userStore.userInfo?.phone || t("common.notBind") }}
                                </text>
                                <text
                                    v-if="!userStore.userInfo?.phone"
                                    class="i-carbon-chevron-right mt-px"
                                />
                            </view>
                        </view>
                    </view>
                    <view class="flex items-center justify-between pl-2">
                        <view i-tabler-brand-wechat w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{
                                t("common.wechatBind")
                            }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm :class="{ 'mr-1': userStore.userInfo?.phone }">
                                    {{ userStore.userInfo?.phone || t("common.notBind") }}
                                </text>
                                <text
                                    v-if="!userStore.userInfo?.phone"
                                    class="i-carbon-chevron-right mt-px"
                                />
                            </view>
                        </view>
                    </view>
                    <view class="flex items-center justify-between pl-2">
                        <view i-tabler-mail w="10" text="muted-foreground" />
                        <view w="full" flex="~ justify-between items-center" class="py-3 pr-2">
                            <view class="text-foreground text-sm">{{ t("common.emailBind") }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm :class="{ 'mr-1': userStore.userInfo?.phone }">
                                    {{ userStore.userInfo?.phone || t("common.notBind") }}
                                </text>
                                <text
                                    v-if="!userStore.userInfo?.phone"
                                    class="i-carbon-chevron-right mt-px"
                                />
                            </view>
                        </view>
                    </view>
                </view>

                <view class="text-muted-foreground mb-2 ml-4 text-xs"> 通用 </view>
                <view class="bg-background mb-6 rounded-lg">
                    <view class="flex items-center justify-between pl-2" @click="showLocalePicker">
                        <view i-lucide-languages w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{ t("common.language") }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm>{{ currentLocaleLabel }}</text>
                                <text class="i-carbon-chevron-right mt-px" />
                            </view>
                        </view>
                    </view>
                    <view class="flex items-center justify-between pl-2">
                        <view i-lucide-shirt w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{ t("common.theme") }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text text-sm mr="1">{{ t("common.systemMode") }}</text>
                            </view>
                        </view>
                    </view>
                    <view class="flex items-center justify-between pl-2">
                        <view v-if="shake" i-lucide-vibrate w="10" text="muted-foreground xl" />
                        <view v-else i-lucide-vibrate-off w="10" text="muted-foreground xl" />
                        <view w="full" flex="~ justify-between items-center" class="py-3 pr-2">
                            <view class="text-foreground text-sm">{{
                                t("common.hapticFeedback")
                            }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <view text-sm mr="-2">
                                    <switch
                                        :checked="shake"
                                        color="var(--primary)"
                                        style="transform: scale(0.7)"
                                    />
                                </view>
                            </view>
                        </view>
                    </view>
                </view>

                <view class="text-muted-foreground mb-2 ml-4 text-xs">
                    {{ t("common.about") }}
                </view>
                <view class="bg-background mb-6 rounded-lg">
                    <view
                        class="flex items-center justify-between pl-2"
                        @click="router.navigate({ url: '/pages/agreement/index?url=service' })"
                    >
                        <view i-lucide-clipboard-pen-line w="10" text="muted-foreground" />
                        <view
                            w="full"
                            flex="~ justify-between items-center"
                            class="border-b-solid border-muted border-b py-3 pr-2"
                        >
                            <view class="text-foreground text-sm">{{
                                t("login.userAgreement")
                            }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text class="i-carbon-chevron-right mt-px" />
                            </view>
                        </view>
                    </view>
                    <view
                        class="flex items-center justify-between pl-2"
                        @click="router.navigate({ url: '/pages/agreement/index?url=privacy' })"
                    >
                        <view i-lucide-file-lock-2 w="10" text="muted-foreground" />
                        <view w="full" flex="~ justify-between items-center" class="py-3 pr-2">
                            <view class="text-foreground text-sm">{{
                                t("login.privacyPolicy")
                            }}</view>
                            <view class="text-muted-foreground flex items-center">
                                <text class="i-carbon-chevron-right mt-px" />
                            </view>
                        </view>
                    </view>
                </view>

                <view class="bg-background rounded-lg">
                    <view
                        class="text-error flex items-center justify-between pl-2"
                        @click="userStore.logout()"
                    >
                        <view i-lucide-log-out w="10" />
                        <view w="full" flex="~ justify-between items-center" class="py-3">
                            <view class="text-sm">{{ t("login.logout") }}</view>
                        </view>
                    </view>
                </view>

                <UserVersion />
            </view>
        </view>
        <UserProfile
            ref="userProfileRefs"
            @slide-progress="handleSlideProgress"
            @open="handlePopupOpen"
            @close="handlePopupClose"
        />
    </view>
</template>

<style>
page {
    background-color: var(--foreground);
}

.settings-page-container {
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform-style: preserve-3d;

    background-color: var(--background-soft);
}
</style>
