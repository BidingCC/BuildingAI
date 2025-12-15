<script setup lang="ts">
import { LoginMethod } from "@buildingai/service/consoleapi/login-settings";
import type { LoginResponse, SystemLoginAccountParams } from "@buildingai/service/webapi/user";

import BdModal from "@/components/bd-modal.vue";
import Agreement from "@/components/login/agreement.vue";
import LoginAccount from "@/components/login/login-account.vue";
import LoginWeixin from "@/components/login/login-weixin.vue";
import WebsiteInfo from "@/components/login/website-info.vue";
import { apiAuthLogin } from "@/service/user";
import { isApp, isH5, isMp, isWechatOa } from "@/utils/env";

const { t } = useI18n();

definePage({
    style: {
        navigationBarTitle: "pages.login",
        auth: false,
    },
});

const { value: redirect } = useQuery("redirect");
const appStore = useAppStore();
const userStore = useUserStore();

const modalRef = ref<InstanceType<typeof BdModal> | null>(null);
const loginSettings = computed(() => appStore.loginSettings);
// 默认登录方式(处理不同平台登录方式的差异)
const defaultLoginMethod = computed(() => {
    if (
        (isMp || isApp || isWechatOa) &&
        loginSettings.value?.allowedLoginMethods.includes(LoginMethod.WEIXIN)
    ) {
        return LoginMethod.WEIXIN;
    }
    return LoginMethod.ACCOUNT;
});

// 当前登录方式
const currentLoginMethod = shallowRef(defaultLoginMethod.value);
// 是否同意隐私协议及用户协议
const checked = shallowRef<boolean>(false);
// 微信小程序获取手机号
const wxMpPhoneNumber = shallowRef<GetPhoneNumberEvent["detail"]>();
// 账号登录参数
const accountLoginParams = shallowRef<SystemLoginAccountParams>();

const handleLoginPreset = async (
    e: GetPhoneNumberEvent["detail"] | SystemLoginAccountParams | undefined,
) => {
    // 小程序获取手机号
    if (e && "iv" in e && "encryptedData" in e) {
        wxMpPhoneNumber.value = e;
    }

    // 账号登录信息
    if (e && "username" in e && "password" in e) {
        accountLoginParams.value = e;
    }

    if (!checked.value && loginSettings.value?.showPolicyAgreement) {
        modalRef.value?.open();
        return;
    } else {
        handleLogin();
    }
};

const handleAccountLogin = async () => {
    try {
        const data = unref(accountLoginParams);
        loginResult(await apiAuthLogin(data));
    } catch (error) {
        console.log("AccountLogin error", error);
    }
    //
};

const handleLogin = async () => {
    const method = unref(currentLoginMethod);
    useToast().loading(t("login.loading"));
    if (!checked.value) checked.value = true;
    if (method === LoginMethod.WEIXIN) {
        // const { code } = await uni.login({ provider: "weixin" });
        // console.log("code", code);
        // // 调用微信登录接口
        // // wxMpPhoneNumber 手机号获取加密的相关，这边需要看看接口怎么设计的
    }
    if (method === LoginMethod.ACCOUNT) {
        handleAccountLogin();
    }
};

const loginResult = (res: LoginResponse) => {
    uni.hideToast();
    userStore.login(res.token, redirect.value);
};

watch(defaultLoginMethod, (newVal) => {
    currentLoginMethod.value = newVal;
});

const handleAgreement = (type: "service" | "privacy") => {
    useRouter().navigate({
        url: `/pages/agreement/index?url=${type}`,
    });
};
</script>

<template>
    <view class="flex h-[calc(100vh-112px)] flex-col items-center justify-center px-8">
        <!-- 网站信息 -->
        <WebsiteInfo class="mb-4" />
        <!-- 微信登录 -->
        <template v-if="(!isH5 || isWechatOa) && currentLoginMethod === LoginMethod.WEIXIN">
            <LoginWeixin class="mt-14 w-full" @getPhoneNumber="handleLoginPreset" />
        </template>
        <!-- 账号登录 -->
        <template v-else-if="currentLoginMethod === LoginMethod.ACCOUNT">
            <LoginAccount class="mt-14 w-full" @login="handleLoginPreset" />
        </template>
        <!-- 隐私协议及用户协议 -->
        <Agreement v-if="loginSettings?.showPolicyAgreement" class="mt-6" v-model="checked" />
        <!-- 其他登录方式 -->
        <BdSeparator
            v-if="
                (currentLoginMethod === LoginMethod.ACCOUNT && (!isH5 || isWechatOa)) ||
                currentLoginMethod === LoginMethod.WEIXIN
            "
            :text="t('login.otherLoginMethods')"
            margin="30px 0"
            w="full"
        />
        <view flex="~ col gap-2" w="full">
            <button
                v-if="currentLoginMethod === LoginMethod.ACCOUNT && (!isH5 || isWechatOa)"
                size="mini"
                type="default"
                plain
                @click="currentLoginMethod = LoginMethod.WEIXIN"
            >
                <view i-tabler-brand-wechat />
                {{ t("login.continueWithWechat") }}
            </button>
            <button
                v-if="currentLoginMethod === LoginMethod.WEIXIN"
                size="mini"
                type="default"
                plain
                @click="currentLoginMethod = LoginMethod.ACCOUNT"
            >
                <view i-tabler-lock />
                {{ t("login.continueWithAccount") }}
            </button>
        </view>
        <!-- 隐私协议及用户协议模态框 -->
        <BdModal
            ref="modalRef"
            :title="t('login.serviceAgreementAndPrivacy')"
            @confirm="handleLogin"
        >
            <view class="px-2 py-4">
                <text>{{ t("login.agreementConfirmText") }}</text>
                <text class="text-primary" @click="handleAgreement('service')">
                    {{ t("login.userAgreement") }}
                </text>
                <text>{{ t("login.and") }}</text>
                <text class="text-primary" @click="handleAgreement('privacy')">
                    {{ t("login.privacyPolicy") }}
                </text>
            </view>
        </BdModal>
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
