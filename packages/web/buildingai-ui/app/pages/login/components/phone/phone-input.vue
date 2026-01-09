<script setup lang="ts">
import { Motion } from "motion-v";
import { reactive, ref } from "vue";
import type { InferType } from "yup";
import { object, string } from "yup";

import type { FormSubmitEvent } from "#ui/types";

// import { SMS_TYPE } from "@buildingai/constants/web";
// import { apiSmsSend } from "@/services/web/user";

const PrivacyTerms = defineAsyncComponent(() => import("../privacy-terms.vue"));

const emit = defineEmits<{
    (e: "next", v: string): void;
    (e: "switchComponent", component: string): void;
}>();

const appStore = useAppStore();
const userStore = useUserStore();
const toast = useMessage();
const areaCodes = ref<{ value: string; label: string }[]>([{ value: "中国大陆", label: "86" }]);
const selected = ref(areaCodes.value[0]);

// 表单验证架构
const phoneSchema = object({
    phone: string()
        .required("请输入手机号")
        .matches(/^1[3-9]\d{9}$/, "请输入正确的手机号码"),
});

type PhoneSchema = InferType<typeof phoneSchema>;

// 表单状态
const phoneState = reactive({
    phone: "",
});

const { lockFn: onPhoneSubmit, isLock } = useLockFn(async (event: FormSubmitEvent<PhoneSchema>) => {
    if (!userStore.isAgreed && !!appStore.loginWay.loginAgreement) {
        toast.warning("请先同意隐私协议和服务条款", {
            title: "温馨提示",
            duration: 3000,
        });
        return;
    }

    try {
        // await apiSmsSend({
        //     scene: SMS_TYPE.LOGIN,
        //     mobile: phoneState.phone,
        // });
        toast.success("验证码已发送，请注意查收", {
            title: "发送成功",
            duration: 3000,
        });
        // 验证成功，进入下一步
        emit("next", event.data.phone);
    } catch (error) {
        console.error("发送验证码失败:", error);
        toast.error("验证码发送失败，请稍后重试", {
            title: "发送失败",
            duration: 3000,
        });
    }
});
</script>

<template>
    <div>
        <Motion
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{
                type: 'tween',
                stiffness: 300,
                damping: 30,
            }"
        >
            <h2 class="mb-2 text-2xl font-bold">手机号登录</h2>
            <p class="text-muted-foreground mb-6 text-sm">请输入手机号码，我们将向您发送验证码</p>
        </Motion>

        <Motion
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{
                type: 'tween',
                stiffness: 300,
                damping: 30,
                delay: 0.4,
            }"
            class="relative"
        >
            <UForm :schema="phoneSchema" :state="phoneState" @submit="onPhoneSubmit">
                <UFormField label="手机号" name="phone" required>
                    <div class="relative">
                        <UInput
                            v-model="phoneState.phone"
                            class="w-full"
                            size="lg"
                            placeholder="请输入手机号码"
                            autocomplete="off"
                            :ui="{ base: '!pl-24' }"
                        >
                            <template #leading>
                                <div class="flex items-center text-sm" @click.stop.prevent>
                                    <span class="mr-px pb-px">+</span>
                                    <UInputMenu
                                        v-model="selected"
                                        trailing-icon="heroicons:chevron-up-down-20-solid"
                                        :ui="{
                                            base: '!ring-0',
                                            content: 'z-999 w-34',
                                        }"
                                        class="w-16"
                                        :items="areaCodes"
                                    >
                                        <template #item="{ item }">
                                            {{ item.value }} +{{ item.label }}
                                        </template>
                                    </UInputMenu>
                                </div>
                                <USeparator class="h-1/2" orientation="vertical" />
                            </template>
                        </UInput>
                    </div>
                </UFormField>

                <div class="mt-8 mb-4 text-left">
                    <PrivacyTerms v-model="userStore.isAgreed" />
                </div>

                <UButton
                    color="primary"
                    type="submit"
                    size="lg"
                    :ui="{ base: 'w-full justify-center' }"
                    :loading="isLock"
                    :disabled="!userStore.isAgreed && !!appStore.loginWay.loginAgreement"
                >
                    下一步
                </UButton>
            </UForm>
        </Motion>
    </div>
</template>
