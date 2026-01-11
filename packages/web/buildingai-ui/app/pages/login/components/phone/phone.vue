<script setup lang="ts">
import type { LoginResponse } from "@buildingai/service/webapi/user";

const CodeInput = defineAsyncComponent(() => import("./code-input.vue"));
const PhoneInput = defineAsyncComponent(() => import("./phone-input.vue"));

interface PhoneLoginContainers {
    width: string;
    height: string;
}

interface PhoneLoginContainer {
    phone: PhoneLoginContainers;
    code: PhoneLoginContainers;
}

const emits = defineEmits<{
    (e: "success", v: LoginResponse): void;
    (e: "updateStyle", v: PhoneLoginContainers): void;
    (e: "update:showLoginMethods", v: boolean): void;
    (e: "switchLoginMethod", v: string): void;
}>();

const step = ref<"phone" | "code">("phone");
const phaseCachedPhone = ref({ phone: "", areaCode: "" });
const container: PhoneLoginContainer = {
    phone: { width: "420px", height: "396px" },
    code: { width: "660px", height: "450px" },
};

// 处理手机号验证完成
function handlePhoneNext(phone: string, areaCode: string) {
    step.value = "code";
    phaseCachedPhone.value = { phone, areaCode };

    emits("update:showLoginMethods", false);
    emits("updateStyle", container[step.value]);
}

// 处理返回到手机号输入
function handleCodeBack() {
    step.value = "phone";

    emits("update:showLoginMethods", true);
    emits("updateStyle", container[step.value]);
}

// 处理验证码验证完成
function handleSuccess(v: LoginResponse) {
    emits("success", v);
}

// 处理切换登录方式
function handleSwitchComponent(component: string) {
    emits("switchLoginMethod", component);
}

onMounted(() => {
    emits("updateStyle", container[step.value]);
    emits("update:showLoginMethods", true);
});
</script>

<template>
    <!-- 手机号输入步骤 -->
    <PhoneInput
        v-if="step === 'phone'"
        @next="handlePhoneNext"
        @switch-component="handleSwitchComponent"
    />

    <!-- 验证码输入步骤 -->
    <CodeInput
        v-else
        :phone="phaseCachedPhone.phone"
        :area-code="phaseCachedPhone.areaCode"
        @back="handleCodeBack"
        @success="handleSuccess"
    />
</template>
