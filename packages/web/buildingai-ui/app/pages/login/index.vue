<script setup lang="ts">
import { LOGIN_TYPE } from "@buildingai/constants/shared";
import { LOGIN_STATUS } from "@buildingai/constants/web/auth.constant";
import type { WebsiteCopyright } from "@buildingai/service/common";
import type { LoginResponse } from "@buildingai/service/webapi/user";

import LogoFull from "../../../public/logo-full.svg";
import AccountLogin from "./components/account/account.vue";
import LoginBind from "./components/login-bind.vue";
// import PhoneLogin from "@/co/components/phone/index.vue";
import WechatLogin from "./components/wechat/wechat.vue";

definePageMeta({ layout: "full-screen", auth: false, guest: true });

const appStore = useAppStore();
const userStore = useUserStore();

const { t } = useI18n();

interface LoginComponentConfig {
    component: Component;
    icon: string;
    label: string;
}

const LOGIN_COMPONENTS = computed<Record<string | number, LoginComponentConfig>>(() => ({
    [LOGIN_TYPE.ACCOUNT]: {
        component: AccountLogin,
        icon: "tabler:lock",
        label: t("login.continueWithAccount"),
    },
    // [LOGIN_TYPE.PHONE]: {
    //     component: PhoneLogin,
    //     icon: "tabler:phone",
    //     label: "手机号登录",
    // },
    [LOGIN_TYPE.WECHAT]: {
        component: WechatLogin,
        icon: "tabler:brand-wechat",
        label: t("login.continueWithWechat"),
    },
    [LOGIN_STATUS.BIND]: {
        component: LoginBind,
        icon: "",
        label: t("login.bindMobile"),
    },
}));

const DEFAULT_LOGIN_METHOD = appStore?.loginSettings?.defaultLoginMethod || LOGIN_TYPE.ACCOUNT;
const currentLoginMethod = ref<string | number>(DEFAULT_LOGIN_METHOD);
const showLoginMethods = ref<boolean>(true);

const allowedLoginMethods = computed(() => {
    const result = Object.fromEntries(
        Object.entries(LOGIN_COMPONENTS.value).filter(([k]) =>
            appStore?.loginSettings?.allowedLoginMethods.includes(Number(k)),
        ),
    );
    return result;
});

const loginMethods = computed(() =>
    Object.entries(allowedLoginMethods.value)
        .filter(([key]) => key !== LOGIN_STATUS.BIND && key !== LOGIN_STATUS.SUCCESS)
        .map(([key, config]) => ({ name: key, ...config })),
);
const currentComponent = computed(
    () => LOGIN_COMPONENTS.value[currentLoginMethod.value]?.component,
);
const currentComponentConfig = computed(() => LOGIN_COMPONENTS.value[currentLoginMethod.value]);

function switchLoginMethod(methodName: string | number): void {
    if (LOGIN_COMPONENTS.value[methodName]) {
        currentLoginMethod.value = methodName;
    }
}

function loginHandle(data: LoginResponse & { hasBind: boolean }): void {
    if (appStore.loginWay.coerceMobile * 1 && !data.hasBind && !data.mobile) {
        userStore.tempLogin(data.token);
        currentLoginMethod.value = LOGIN_STATUS.BIND;
        return;
    }
    userStore.login(data.token);
}

onMounted(() => {
    if (!appStore.loginSettings) {
        appStore.getLoginSettings();
    }
});

onUnmounted(() => {
    userStore.isAgreed = false;
});
</script>

<template>
    <div class="login-container flex h-screen flex-col overflow-y-auto bg-[#f9f9f9] dark:bg-[#000]">
        <h1 class="fixed top-8 left-8 flex items-center">
            <template v-if="appStore.siteConfig?.webinfo.logo">
                <NuxtImg :src="appStore.siteConfig?.webinfo.logo" alt="Logo" class="size-12" />
                <span class="ml-2 text-3xl font-bold">
                    {{ appStore.siteConfig?.webinfo.name }}
                </span>
            </template>
            <!-- 没有logo的时候显示全称 -->
            <LogoFull v-else class="text-foreground h-8" filled :fontControlled="false" />
        </h1>
        <div class="flex h-auto items-center justify-center pt-[15vh]">
            <div class="w-[370px] px-4">
                <!-- Header -->
                <div class="mb-8 space-y-3 text-center">
                    <h1 class="text-3xl font-bold">{{ t("login.title") }}</h1>
                    <p class="text-muted-foreground">
                        {{ t("login.subtitle") }}
                    </p>
                </div>
                <div class="flex flex-col justify-center gap-4">
                    <template v-for="(method, mIndex) in loginMethods" :key="mIndex">
                        <UButton
                            v-if="method.name != currentLoginMethod"
                            :leading-icon="method.icon"
                            variant="outline"
                            color="neutral"
                            size="lg"
                            :ui="{ base: 'flex-1 justify-center bg-transparent p-3' }"
                            @click="switchLoginMethod(method.name)"
                        >
                            {{ method.label }}
                        </UButton>
                    </template>
                    <!-- <UButton
                        leading-icon="tabler:brand-wechat"
                        variant="outline"
                        color="neutral"
                        size="lg"
                        :ui="{
                            base: 'flex-1 justify-center bg-transparent p-3',
                            leadingIcon: 'text-3xl text-green-500',
                        }"
                    >
                        继续使用 微信二维码 登录
                    </UButton>
                    <UButton
                        leading-icon="i-logos-google-icon"
                        variant="outline"
                        color="neutral"
                        size="lg"
                        :ui="{ base: 'flex-1 justify-center bg-transparent p-3' }"
                    >
                        继续使用 Google 登录
                    </UButton>
                    <UButton
                        leading-icon="i-lucide-mail"
                        variant="outline"
                        color="neutral"
                        size="lg"
                        :ui="{ base: 'flex-1 justify-center bg-transparent p-3' }"
                    >
                        继续使用 电子邮件地址 登录
                    </UButton> -->
                </div>
                <USeparator
                    v-if="loginMethods.length > 1"
                    :label="$t('login.orLoginTo')"
                    :ui="{
                        root: 'py-5',
                        label: 'text-xs text-foreground/60',
                    }"
                />
                <div>
                    <component
                        :is="currentComponent"
                        v-if="currentComponent"
                        v-bind="currentComponentConfig"
                        @success="loginHandle"
                        @switch-to="switchLoginMethod"
                        @update:show-login-methods="showLoginMethods = $event"
                    />
                </div>
                <FooterCopyright
                    :copyright="appStore.siteConfig?.copyright as unknown as WebsiteCopyright[]"
                />
            </div>
        </div>
    </div>
</template>
