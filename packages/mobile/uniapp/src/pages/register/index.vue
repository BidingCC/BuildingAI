<script setup lang="ts">
import type { SystemRegisrerAccountParams } from "@buildingai/service/webapi/user";
import type { UniForms } from "@uni-helper/uni-types";

import BdModal from "@/components/bd-modal.vue";
import Agreement from "@/components/login/agreement.vue";
import WebsiteInfo from "@/components/login/website-info.vue";
import { apiAuthRegister } from "@/service/user";

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

const customRules = {
    username: {
        rules: [
            { required: true, errorMessage: "请输入账号" },
            { minLength: 3, errorMessage: "账号长度不得低于3个字符" },
        ],
    },
    password: {
        rules: [
            { required: true, errorMessage: "请输入密码" },
            { minLength: 6, errorMessage: "密码长度不能少于6个字符" },
            { maxLength: 25, errorMessage: "密码长度不能超过25个字符" },
        ],
    },
    confirmPassword: {
        rules: [
            { required: true, errorMessage: "请确认密码" },
            {
                validateFunction: (rule: object, value: string, _data: object) => {
                    // 返回 Promise 对象
                    return new Promise<void>((resolve, reject) => {
                        if (value !== formData.password) {
                            // 不通过返回 reject
                            reject(new Error("两次输入的密码不一致"));
                        } else {
                            // 通过返回 resolve
                            resolve();
                        }
                    });
                },
            },
        ],
    },
};

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

    useToast().loading("注册中");

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
                        账号
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.username"
                        :customStyles="{ height: '88rpx' }"
                        placeholder="请输入账号"
                    />
                </uni-forms-item>
                <uni-forms-item label="" :labelWidth="0" name="password">
                    <view class="text-accent-foreground text-sm">
                        密码
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.password"
                        type="password"
                        placeholder="请输入密码"
                        :customStyles="{ height: '88rpx' }"
                    />
                </uni-forms-item>
                <uni-forms-item label="" :labelWidth="0" name="confirmPassword">
                    <view class="text-accent-foreground text-sm">
                        确认密码
                        <text text="error">*</text>
                    </view>
                    <uni-easyinput
                        v-model="formData.confirmPassword"
                        type="password"
                        placeholder="请确认密码"
                        :customStyles="{ height: '88rpx' }"
                    />
                </uni-forms-item>
            </uni-forms>

            <view class="mt-8">
                <button size="mini" type="primary" @click="handleLoginPreset()">立即注册</button>
            </view>
        </view>
        <!-- 隐私协议及用户协议 -->
        <Agreement v-if="loginSettings?.showPolicyAgreement" class="mt-6" v-model="checked" />
        <!-- 隐私协议及用户协议模态框 -->
        <BdModal ref="modalRef" title="服务协议及隐私保护" @confirm="handleRegister">
            <view class="px-2 py-4">
                <text>确认即表示你已阅读并同意BuildingAI的</text>
                <text class="text-primary" @click="handleAgreement('service')">用户协议</text>
                <text>和</text>
                <text class="text-primary" @click="handleAgreement('privacy')">隐私政策</text>
            </view>
        </BdModal>
    </view>
</template>

<style>
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
