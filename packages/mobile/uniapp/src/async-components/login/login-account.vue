<script setup lang="ts">
import type { SystemLoginAccountParams } from "@buildingai/service/webapi/user";
import type { UniForms } from "@uni-helper/uni-types";

const { t } = useI18n();

const emits = defineEmits<{
    (e: "login", value: SystemLoginAccountParams): void;
}>();

const customFormRefs = ref<UniForms>();

const formData = reactive<SystemLoginAccountParams>({
    username: "",
    password: "",
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
}));

const register = () => {
    useRouter().navigate({ url: "/pages/register/index" });
};

const submit = async () => {
    await customFormRefs.value?.validate();
    emits("login", formData);
};
</script>

<template>
    <view w="full">
        <uni-forms ref="customFormRefs" :rules="customRules" :modelValue="formData">
            <uni-forms-item label="" :labelWidth="0" name="username">
                <view class="text-accent-foreground text-sm">
                    {{ t("login.form.account") }}
                    <text text="error">*</text>
                </view>
                <uni-easyinput
                    v-model="formData.username"
                    :customStyles="{ height: '86rpx' }"
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
                    :customStyles="{ height: '86rpx' }"
                />
            </uni-forms-item>
        </uni-forms>
        <view class="mt-8 flex gap-2">
            <button size="mini" plain type="primary" @click="register()">
                {{ t("login.form.registerAccount") }}
            </button>
            <button size="mini" type="primary" @click="submit()">
                {{ t("login.form.loginNow") }}
            </button>
        </view>
    </view>
</template>
