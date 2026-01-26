<script setup lang="ts">
import { SMS_TYPE } from "@buildingai/constants/web/auth.constant";
import { apiPostResetPassword, apiSmsSend } from "@buildingai/service/webapi/user";
import { Motion } from "motion-v";
import { reactive, ref } from "vue";
import { object, ref as yupRef, string } from "yup";

const emits = defineEmits<{
    (e: "switchComponent", component: string): void;
}>();

const toast = useMessage();
const { t } = useI18n();
const areaCodes = ref<{ value: string; label: string }[]>([
    { value: t("console-common.phoneAreaCodes.china"), label: "86" },
]);
const selected = ref(areaCodes.value[0]);

// Reset password form validation schema
const forgetchema = object({
    mobile: string()
        .required(t("login.forget.validation.mobileRequired"))
        .matches(/^1[3-9]\d{9}$/, t("login.forget.validation.mobileInvalid")),
    code: string().required(t("login.forget.validation.codeRequired")),
    password: string()
        .required(t("login.forget.validation.passwordRequired"))
        .min(6, t("login.forget.validation.passwordMinLength"))
        .max(25, t("login.forget.validation.passwordMaxLength"))
        .matches(
            /^(?=.*[a-z])(?=.*[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
            t("login.forget.validation.passwordFormat"),
        ),
    password_confirm: string()
        .required(t("login.forget.validation.confirmPasswordRequired"))
        .oneOf([yupRef("password")], t("login.forget.validation.passwordMismatch")),
});

// Reset password form state
const forgetState = reactive({
    mobile: "",
    code: "",
    password: "",
    password_confirm: "",
});

const codeBtnState = reactive<{
    isCounting: boolean;
    text: string;
}>({
    isCounting: false,
    text: t("login.forget.getCode"),
});

const { lockFn: onSmsSend, isLock: smsLoading } = useLockFn(async () => {
    if (codeBtnState.isCounting === true) return;
    codeBtnState.text = t("login.forget.sending");

    try {
        await apiSmsSend({
            scene: SMS_TYPE.FIND_PASSWORD,
            mobile: forgetState.mobile,
        });
        codeBtnState.isCounting = true;
        let count = 60;
        codeBtnState.text = `${count}s`;
        const interval = setInterval(() => {
            count--;
            codeBtnState.text = `${count}s`;
            if (count === 0) {
                clearInterval(interval);
                codeBtnState.isCounting = false;
                codeBtnState.text = t("login.forget.resend");
            }
        }, 1000);
        toast.success(t("login.forget.messages.sendSuccess"), {
            title: t("login.forget.messages.sendSuccessTitle"),
            duration: 3000,
        });
    } catch (error) {
        console.error("Send verification code failed:", error);
        codeBtnState.isCounting = false;
        codeBtnState.text = t("login.forget.resend");
        toast.error(t("login.forget.messages.sendFailed"), {
            title: t("login.forget.messages.sendFailedTitle"),
            duration: 3000,
        });
    }
});

// Handle reset password form submit
const { lockFn: onForgetSubmit, isLock } = useLockFn(async () => {
    try {
        await apiPostResetPassword(forgetState);
    } catch (error) {
        console.log("Reset password failed =>", error);
    }
});
</script>

<template>
    <div class="px-8 pt-8">
        <Motion
            :initial="{ opacity: 0, y: 10 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{
                type: 'tween',
                stiffness: 300,
                damping: 30,
                delay: 0.2,
            }"
            class="relative"
        >
            <h2 class="mb-2 text-2xl font-bold">{{ $t("login.forget.title") }}</h2>

            <p class="text-muted-foreground mb-4 text-sm">{{ $t("login.forget.subtitle") }}</p>
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
            <UForm :schema="forgetchema" :state="forgetState" @submit="onForgetSubmit">
                <UFormField :label="$t('login.forget.mobile')" name="mobile" required>
                    <UInput
                        v-model="forgetState.mobile"
                        class="w-full"
                        size="lg"
                        :placeholder="$t('login.forget.mobilePlaceholder')"
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
                </UFormField>

                <UFormField :label="$t('login.forget.code')" name="code" class="mt-2" required>
                    <UInput
                        id="code"
                        v-model="forgetState.code"
                        size="lg"
                        :placeholder="$t('login.forget.codePlaceholder')"
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

                <UFormField
                    :label="$t('login.forget.newPassword')"
                    name="password"
                    class="mt-3"
                    required
                >
                    <BdInputPassword
                        v-model="forgetState.password"
                        class="w-full"
                        type="password"
                        size="lg"
                        :placeholder="$t('login.forget.newPasswordPlaceholder')"
                    />
                    <template #help>
                        <div class="flex items-center gap-1 text-xs">
                            <UIcon name="tabler:alert-circle" size="14" />
                            {{ $t("login.forget.passwordHint") }}
                        </div>
                    </template>
                </UFormField>

                <UFormField
                    :label="$t('login.forget.confirmPassword')"
                    name="password_confirm"
                    class="mt-3"
                    required
                >
                    <BdInputPassword
                        v-model="forgetState.password_confirm"
                        class="w-full"
                        type="password"
                        size="lg"
                        :placeholder="$t('login.forget.confirmPasswordPlaceholder')"
                    />
                    <template #help>
                        <div class="flex items-center gap-1 text-xs">
                            <UIcon name="tabler:alert-circle" size="14" />
                            {{ $t("login.forget.passwordHint") }}
                        </div>
                    </template>
                </UFormField>

                <div class="flex flex-1 gap-2 py-8">
                    <UButton
                        variant="outline"
                        color="primary"
                        size="lg"
                        :ui="{ base: 'flex-1 justify-center' }"
                        @click="emits('switchComponent', 'account-login')"
                    >
                        {{ $t("login.forget.backToLogin") }}
                    </UButton>
                    <UButton
                        color="primary"
                        type="submit"
                        size="lg"
                        :ui="{ base: 'flex-1 justify-center' }"
                        :loading="isLock"
                    >
                        {{ $t("login.forget.confirmChange") }}
                    </UButton>
                </div>
            </UForm>
        </Motion>
    </div>
</template>
