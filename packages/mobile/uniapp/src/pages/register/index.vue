<script setup lang="ts">
import type { SystemRegisrerAccountParams } from "@buildingai/service/webapi/user";
import type { UniForms } from "@uni-helper/uni-types";

import BdModal from "@/components/bd-modal.vue";
import Agreement from "@/components/login/agreement.vue";
import WebsiteInfo from "@/components/login/website-info.vue";
import { apiAuthRegister } from "@/service/user";

const { t } = useI18n();

definePage({
    style: {
        navigationBarTitle: "pages.register",
        auth: false,
    },
});

const { value: redirect } = useQuery("redirect");
const appStore = useAppStore();
const userStore = useUserStore();

const customFormRefs = ref<UniForms>();
const modalRef = ref<InstanceType<typeof BdModal> | null>(null);
const loginSettings = computed(() => appStore.loginSettings);

// 是否同意隐私协议及用户协议
const checked = shallowRef<boolean>(false);
const formData = reactive<SystemRegisrerAccountParams & { confirmPassword: string }>({
    username: "",
    password: "",
    confirmPassword: "",
    terminal: getTerminal().toString(),
});

const customRules = computed(() => ({
    username: {
        rules: [
            { required: true, errorMessage: t("login.validation.accountRequired") },
            { minLength: 3, errorMessage: t("login.validation.accountMinLength") },
        ],
    },
    password: {
        rules: [
            { required: true, errorMessage: t("login.validation.passwordRequired") },
            { minLength: 6, errorMessage: t("login.validation.passwordMinLength") },
            { maxLength: 25, errorMessage: t("login.validation.passwordMaxLength") },
        ],
    },
    confirmPassword: {
        rules: [
            { required: true, errorMessage: t("login.validation.confirmPasswordRequired") },
            {
                validateFunction: (rule: object, value: string, _data: object) => {
                    // 返回 Promise 对象
                    return new Promise<void>((resolve, reject) => {
                        if (value !== formData.password) {
                            // 不通过返回 reject
                            reject(new Error(t("login.validation.passwordMismatch")));
                        } else {
                            // 通过返回 resolve
                            resolve();
                        }
                    });
                },
            },
        ],
    },
}));

const handleLoginPreset = async () => {
    if (!checked.value && loginSettings.value?.showPolicyAgreement) {
        modalRef.value?.open();
        return;
    } else {
        handleRegister();
    }
};

const handleRegister = async () => {
    if (!checked.value && loginSettings.value?.showPolicyAgreement) {
        if (!checked.value) checked.value = true;
        return;
    }

    try {
        await customFormRefs.value?.validate();
    } catch (err) {
        console.log("表单校验失败：", err);
        return;
    }

    useToast().loading(t("login.registering"));

    const data = unref(formData);
    const res = await apiAuthRegister(data);
    useToast().clear();
    await uni.navigateBack({ delta: 1 });
    userStore.login(res.token, redirect.value);
};

const handleAgreement = (type: "service" | "privacy") => {
    useRouter().navigate({
        url: `/pages/agreement/index?url=${type}`,
    });
};
</script>

<template>
    <view class="flex h-[calc(100vh-112px)] flex-col items-center justify-center px-8">
        <!-- 网站信息 -->
        <WebsiteInfo class="mb-14" />
        <!-- 账号注册 -->
        <view w="full">
            <uni-forms ref="customFormRefs" :rules="customRules" :modelValue="formData">
                <uni-forms-item label="" :labelWidth="0" name="username">
                    <view class="text-accent-foreground text-sm">
                        {{ t("login.form.account") }}
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.username"
                        :customStyles="{ height: '88rpx' }"
                        :placeholder="t('login.form.accountPlaceholder')"
                    />
                </uni-forms-item>
                <uni-forms-item label="" :labelWidth="0" name="password">
                    <view class="text-accent-foreground text-sm">
                        {{ t("login.form.password") }}
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.password"
                        type="password"
                        :placeholder="t('login.form.passwordPlaceholder')"
                        :customStyles="{ height: '88rpx' }"
                    />
                </uni-forms-item>
                <uni-forms-item label="" :labelWidth="0" name="confirmPassword">
                    <view class="text-accent-foreground text-sm">
                        {{ t("login.form.confirmPassword") }}
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.confirmPassword"
                        type="password"
                        :placeholder="t('login.form.confirmPasswordPlaceholder')"
                        :customStyles="{ height: '88rpx' }"
                    />
                </uni-forms-item>
            </uni-forms>

            <view class="mt-8">
                <button size="mini" type="primary" @click="handleLoginPreset()">
                    {{ t("login.form.registerNow") }}
                </button>
            </view>
        </view>
        <!-- 隐私协议及用户协议 -->
        <Agreement v-if="loginSettings?.showPolicyAgreement" class="mt-6" v-model="checked" />
        <!-- 隐私协议及用户协议模态框 -->
        <BdModal
            ref="modalRef"
            :title="t('login.serviceAgreementAndPrivacy')"
            @confirm="handleRegister"
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
            var(--primary-100) 10%,
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
