<script setup lang="ts">
import { SmsScene } from "@buildingai/constants/shared";
import { apiSmsSend, apiUserMobileBind } from "@buildingai/service/webapi/user";
import { Motion } from "motion-v";
import { object, string } from "yup";

const emits = defineEmits<{
    (e: "updateStyle", v: { width: string; height: string }): void;
    (e: "update:showLoginMethods", v: boolean): void;
    (e: "success", v: unknown): void;
}>();

const toast = useMessage();
const userStore = useUserStore();

const areaCodes = ref<{ value: string; label: string }[]>([{ value: "中国大陆", label: "86" }]);
const selected = ref(areaCodes.value[0]);
const codeBtnState = ref<{
    isCounting: boolean;
    text: string;
}>({
    isCounting: false,
    text: "获取验证码",
});

// 表单验证架构
const bindSchema = object({
    mobile: string().min(8, "手机号不能少于11位").required("请输入手机号码"),
    code: string().min(4, "验证码不能少于4位").required("请输入验证码"),
});

// 表单状态
const bindState = reactive({
    mobile: "",
    code: "",
});

const { lockFn: onSmsSend, isLock: smsLoading } = useLockFn(async () => {
    if (codeBtnState.value.isCounting === true) return;

    const areaCode = selected.value?.label;
    if (!areaCode) {
        toast.warning("请选择电话区号", {
            title: "温馨提示",
            duration: 3000,
        });
        return;
    }

    codeBtnState.value.text = "正在发送中";
    try {
        await apiSmsSend({
            scene: SmsScene.BIND_MOBILE,
            mobile: bindState.mobile,
            areaCode,
        });
        toast.success("验证码已发送，请注意查收", { title: "发送成功" });
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
    } catch {
        codeBtnState.value.isCounting = false;
        codeBtnState.value.text = "重新发送";
    }
});

// 处理表单提交
const { lockFn: onSubmit, isLock } = useLockFn(async () => {
    try {
        await apiUserMobileBind({
            type: "bind",
            ...bindState,
        });

        emits("success", { token: userStore.token, hasBind: true });
    } catch (error) {
        console.error("绑定失败:", error);
    }
});

onMounted(() => {
    emits("updateStyle", { width: "400px", height: "330px" });
    emits("update:showLoginMethods", false);
});
</script>

<template>
    <div class="p-8">
        <Motion
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{
                type: 'tween',
                stiffness: 300,
                damping: 30,
            }"
        >
            <h2 class="mb-2 text-2xl font-bold">绑定手机号</h2>
            <p class="text-muted-foreground mb-2 text-sm">请输入手机号码，我们将向您发送验证码</p>
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
            <UForm :schema="bindSchema" :state="bindState" @submit="onSubmit">
                <UFormField label="手机号" name="mobile" required>
                    <UInput
                        v-model="bindState.mobile"
                        class="w-full"
                        size="lg"
                        placeholder="请输入手机号码"
                        autocomplete="off"
                        :ui="{ base: '!pl-24' }"
                    >
                        <template #leading>
                            <div class="flex items-center text-sm" @click.stop.prevent>
                                <span class="mr-[1px] pb-[1px]">+</span>
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
                </UFormField>

                <UFormField label="验证码" name="code" class="mt-2" required>
                    <UInput
                        id="code"
                        v-model="bindState.code"
                        size="lg"
                        placeholder="请输入验证码"
                        autocomplete="off"
                        :ui="{ root: 'w-full', trailing: 'pr-0' }"
                    >
                        <template #trailing>
                            <USeparator class="h-1/2" orientation="vertical" />
                            <UButton
                                variant="link"
                                :ui="{
                                    base: 'w-[90px] justify-center',
                                }"
                                :disabled="smsLoading"
                                @click="onSmsSend"
                            >
                                {{ codeBtnState.text }}
                            </UButton>
                        </template>
                    </UInput>
                </UFormField>

                <div class="mt-10">
                    <UButton
                        color="primary"
                        type="submit"
                        size="lg"
                        :ui="{ base: 'w-full justify-center' }"
                        :loading="isLock"
                    >
                        立即绑定
                    </UButton>
                </div>
            </UForm>
        </Motion>
    </div>
</template>
