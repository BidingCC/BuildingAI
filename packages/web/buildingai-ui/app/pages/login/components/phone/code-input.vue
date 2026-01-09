<script setup lang="ts">
// import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

import { SMS_TYPE } from "@buildingai/constants/web";
import { apiAuthLogin, type LoginResponse } from "@buildingai/service/webapi/user";
import { apiSmsSend } from "@buildingai/service/webapi/user";

const props = defineProps<{
    phone: string;
}>();

const emits = defineEmits<{
    (e: "back"): void;
    (e: "success", v: LoginResponse): void;
}>();

const toast = useMessage();

const loginState = reactive({
    succeed: false,
    error: "",
});
const codeState = reactive<{
    phone: string;
    code: number[];
}>({
    phone: "",
    code: [],
});
const codeBtnState = ref<{
    isCounting: boolean;
    text: string;
}>({
    isCounting: false,
    text: "获取验证码",
});

// 重新发送验证码
async function sendCode() {
    if (codeBtnState.value.isCounting === true) return;
    codeBtnState.value.text = "正在发送中";

    try {
        await apiSmsSend({
            scene: SMS_TYPE.LOGIN,
            mobile: props.phone,
        });
        toast.success("验证码已发送，请注意查收", {
            title: "发送成功",
            duration: 3000,
        });
        codeBtnState.value.isCounting = true;
        let count = 60;
        codeBtnState.value.text = `${count}s`;
        const interval = setInterval(() => {
            count--;
            codeBtnState.value.text = `${count}s`;
            if (count === 0) {
                clearInterval(interval);
                codeBtnState.value.isCounting = false;
                codeBtnState.value.text = "重新发送";
            }
        }, 1000);
    } catch (error) {
        console.error("发送验证码失败:", error);
        toast.error("验证码发送失败，请稍后重试", {
            title: "发送失败",
            duration: 3000,
        });
        codeBtnState.value.isCounting = false;
        codeBtnState.value.text = "重新发送";
    }
}

/**
 * 监听验证码输入完成
 * 当验证码输入完成后，自动触发表单验证
 */
async function handlePinInputComplete() {
    if (Array.isArray(codeState.code) && codeState.code.length === 4) {
        // try {
        //     const data: LoginResponse = await apiAuthLogin({
        //         // terminal: 4,
        //         // scene: 2,
        //         // account: props.phone,
        //         // code: codeState.code.join(""),
        //     });
        //     loginState.error = "";
        //     loginState.succeed = true;
        //     setTimeout(() => {
        //         emits("success", data);
        //     }, 200);
        // } catch (error) {
        //     loginState.error = error as string;
        // }
    }
}

// 组件挂载时自动开始倒计时
onMounted(() => {
    sendCode();
});
</script>

<template>
    <div class="grid h-full grid-cols-2">
        <div class="flex w-[300px] flex-col justify-between">
            <div>
                <div class="mb-6">
                    <UButton icon="i-lucide-chevron-left" @click="emits('back')" />
                </div>
                <h2 class="mt-8 mb-2 text-2xl font-bold">输入验证码</h2>
                <p class="text-muted-foreground mb-8 text-sm">验证码已发送至 {{ phone }}</p>

                <div class="flex flex-col">
                    <UForm ref="form" :state="codeState">
                        <UFormField label="" name="code" :error="loginState.error">
                            <UPinInput
                                v-model="codeState.code"
                                :length="4"
                                size="xl"
                                type="number"
                                class="mb-6"
                                :highlight="true"
                                :color="loginState.succeed ? 'success' : 'neutral'"
                                @update:model-value="handlePinInputComplete"
                            />
                        </UFormField>
                    </UForm>

                    <UButton
                        variant="link"
                        size="lg"
                        class="text-sm"
                        :disabled="codeBtnState.isCounting"
                        :ui="{ base: 'pl-0' }"
                        @click="sendCode"
                    >
                        {{ codeBtnState.text }}
                    </UButton>
                </div>
            </div>
        </div>

        <Motion
            :initial="{ opacity: 0, x: 20 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{
                type: 'spring',
                stiffness: 300,
                damping: 50,
                delay: 0.2,
            }"
            class="relative h-full w-full"
        >
            <!-- <DotLottieVue
                class="absolute top-[-150px] left-[-130px] z-10 h-[756px] w-[504px]"
                autoplay
                src="assets/lottie/verification-code.lottie"
            /> -->
        </Motion>
    </div>
</template>
