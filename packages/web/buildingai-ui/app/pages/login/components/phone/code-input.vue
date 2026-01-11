<script setup lang="ts">
import { SmsScene, UserTerminal } from "@buildingai/constants/shared";
import { apiSmsLogin, apiSmsSend, type LoginResponse } from "@buildingai/service/webapi/user";

const props = defineProps<{
    phone: string;
    areaCode: string;
}>();

const emits = defineEmits<{
    (e: "back"): void;
    (e: "success", v: LoginResponse): void;
}>();

const toast = useMessage();

const loginState = reactive({
    checking: false,
    succeed: true,
    error: "",
});
const codeState = reactive<{ phone: string; code: number[] }>({
    phone: "",
    code: [],
});
const codeBtnState = ref({
    isCounting: false,
    text: "获取验证码",
});

// 重新发送验证码
function startCountDown() {
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
}

async function handleResendCode() {
    if (codeBtnState.value.isCounting === true) return;
    codeBtnState.value.text = "正在发送中";

    try {
        await apiSmsSend({
            scene: SmsScene.LOGIN,
            mobile: props.phone,
            areaCode: props.areaCode,
        });
        toast.success("验证码已发送，请注意查收", {
            title: "发送成功",
            duration: 3000,
        });
        startCountDown();
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
    if (Array.isArray(codeState.code) && codeState.code.length === 6) {
        try {
            loginState.checking = true;

            const data: LoginResponse = await apiSmsLogin({
                terminal: UserTerminal.PC,
                mobile: props.phone,
                code: codeState.code.join(""),
                areaCode: props.areaCode,
            });
            loginState.error = "";
            loginState.succeed = true;
            loginState.checking = false;

            setTimeout(() => {
                emits("success", data);
            }, 200);
        } catch (error) {
            loginState.error = error as string;
            loginState.succeed = false;
            loginState.checking = false;
        }
    }
}

// 组件挂载时自动开始倒计时
onMounted(() => {
    startCountDown();
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
                        <UFormField
                            label=""
                            name="code"
                            :error="!loginState.succeed && loginState.error"
                        >
                            <UPinInput
                                v-model="codeState.code"
                                :length="6"
                                size="xl"
                                type="number"
                                class="mb-6"
                                :highlight="true"
                                @update:model-value="handlePinInputComplete"
                            />
                        </UFormField>
                    </UForm>

                    <UButton
                        size="lg"
                        class="inline-block text-sm"
                        :disabled="codeBtnState.isCounting || loginState.checking"
                        @click="handleResendCode"
                    >
                        {{ codeBtnState.text }}
                    </UButton>
                </div>
            </div>
        </div>
    </div>
</template>
