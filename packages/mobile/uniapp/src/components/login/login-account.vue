<script setup lang="ts">
import type { SystemLoginAccountParams } from "@buildingai/service/webapi/user";
import type { UniForms } from "@uni-helper/uni-types";

const emits = defineEmits<{
    (e: "login", value: SystemLoginAccountParams): void;
}>();

const customFormRefs = ref<UniForms>();

const formData = reactive<SystemLoginAccountParams>({
    username: "",
    password: "",
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
};

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
                <uni-easyinput
                    v-model="formData.username"
                    :customStyles="{ height: '88rpx' }"
                    placeholder="请输入账号"
                />
            </uni-forms-item>
            <uni-forms-item label="" :labelWidth="0" name="password">
                <uni-easyinput
                    v-model="formData.password"
                    type="password"
                    placeholder="请输入密码"
                    :customStyles="{ height: '88rpx' }"
                />
            </uni-forms-item>
        </uni-forms>
        <view class="mt-8 flex gap-2">
            <button size="mini" plain type="primary" @click="register()">注册账号</button>
            <button size="mini" type="primary" @click="submit()">立即登录</button>
        </view>
    </view>
</template>
