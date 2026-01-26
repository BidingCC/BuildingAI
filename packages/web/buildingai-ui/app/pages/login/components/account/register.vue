<script setup lang="ts">
import type { LoginResponse } from "@buildingai/service/webapi/user";
import { apiAuthRegister } from "@buildingai/service/webapi/user";
import { computed, reactive, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { object, ref as yupRef, string } from "yup";

import { useAgreementModal } from "../../hooks/use-agreement-modal";

const PrivacyTerms = defineAsyncComponent(() => import("../privacy-terms.vue"));

const emits = defineEmits<{
    (e: "switchComponent", component: string): void;
    (e: "success", v: LoginResponse): void;
}>();

const appStore = useAppStore();
const userStore = useUserStore();
const { t } = useI18n();

const { ensureAgreementAccepted } = useAgreementModal(
    { width: "!w-[420px]" },
    resolveComponent("UIcon") as unknown as Component,
);

// 表单验证架构
const registerSchema = object({
    username: string()
        .required(t("login.validation.accountRequired"))
        .min(3, t("login.validation.accountMinLength"))
        .max(20, t("login.validation.accountMaxLength")),
    // email: string()
    //   .required(t("login.validation.emailRequired"))
    //   .email(t("login.validation.emailInvalid")),
    password: string()
        .required(t("login.validation.passwordRequired"))
        .min(6, t("login.validation.passwordMinLength"))
        .max(25, t("login.validation.passwordMaxLength"))
        .matches(
            /^(?=.*[a-z])(?=.*[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
            t("login.validation.passwordFormat"),
        ),
    confirmPassword: string()
        .required(t("login.validation.confirmPasswordRequired"))
        .oneOf([yupRef("password")], t("login.validation.passwordMismatch")),
});

// 表单状态
const registerState = reactive({
    username: "",
    // email: '',
    password: "",
    confirmPassword: "",
});

const { lockFn: onRegisterSubmit, isLock } = useLockFn(async () => {
    const canProceed = await ensureAgreementAccepted();
    if (!canProceed) {
        return;
    }
    try {
        // TODO: 调用注册接口
        const data = await apiAuthRegister({
            terminal: "1",
            ...registerState,
        });

        // 注册成功后跳转到登录页
        emits("success", { ...data, ...data.user });
    } catch (error: unknown) {
        console.log(t("login.messages.registerFailed"), error);
    }
});

/**
 * Compute password strength requirements.
 * Returns a list of requirement checks with their met state and description.
 */
function checkPasswordStrength(str: string) {
    const requirements = [
        { regex: /.{8,}/, text: t("login.requirements.minLength8") },
        { regex: /\d/, text: t("login.requirements.number") },
        { regex: /[a-z]/, text: t("login.requirements.lowercase") },
        { regex: /[A-Z]/, text: t("login.requirements.uppercase") },
    ];
    return requirements.map((req) => ({ met: req.regex.test(str), text: req.text }));
}

/** Compute the list of met/unmet requirements for the current password. */
const passwordStrength = computed(() => checkPasswordStrength(registerState.password));

/** Compute numeric score [0..4] for the current password. */
const passwordScore = computed(() => passwordStrength.value.filter((req) => req.met).length);

/** Map score to color token for UI components. */
const passwordColor = computed(() => {
    if (passwordScore.value === 0) return "neutral";
    if (passwordScore.value <= 1) return "error";
    if (passwordScore.value <= 2) return "warning";
    if (passwordScore.value === 3) return "warning";
    return "success";
});

/** Compute localized text label for current password strength. */
const passwordStrengthText = computed(() => {
    if (passwordScore.value === 0) return "";
    if (passwordScore.value <= 1) return t("login.strength.weak");
    if (passwordScore.value <= 3) return t("login.strength.medium");
    return t("login.strength.strong");
});

/** Match the strength label color to the progress color. */
const passwordTextClass = computed(() => {
    const c = passwordColor.value;
    if (c === "error") return "text-error";
    if (c === "warning") return "text-warning";
    if (c === "success") return "text-success";
    return "text-muted";
});
</script>

<template>
    <UForm :schema="registerSchema" :state="registerState" @submit="onRegisterSubmit">
        <UFormField :label="$t('login.account')" name="username" required>
            <UInput
                v-model="registerState.username"
                class="w-full"
                size="lg"
                :ui="{ base: 'bg-transparent p-3' }"
                :placeholder="$t('login.placeholders.enterAccount')"
            />
        </UFormField>

        <UFormField :label="$t('login.password')" name="password" class="mt-2" required>
            <BdInputPassword
                v-model="registerState.password"
                class="w-full"
                type="password"
                size="lg"
                :ui="{ base: 'bg-transparent p-3' }"
                :placeholder="$t('login.placeholders.enterPassword')"
            />

            <div class="mt-2" v-if="registerState.password">
                <UProgress :color="passwordColor" :model-value="passwordScore" :max="4" size="sm" />
                <div
                    v-if="passwordStrengthText"
                    class="mt-1 flex items-center gap-1 text-xs font-medium"
                    :class="passwordTextClass"
                >
                    <span>{{ passwordStrengthText }}</span>
                    <UPopover mode="hover">
                        <span
                            class="inline-flex cursor-help items-center"
                            aria-label="Password requirements"
                        >
                            <UIcon name="i-lucide-help-circle" class="size-3.5" />
                        </span>
                        <template #content>
                            <ul class="space-y-1 p-2" aria-label="Password requirements">
                                <li
                                    v-for="(req, index) in passwordStrength"
                                    :key="index"
                                    class="flex items-center gap-0.5"
                                    :class="req.met ? 'text-success' : 'text-muted'"
                                >
                                    <UIcon
                                        :name="
                                            req.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'
                                        "
                                        class="size-4 shrink-0"
                                    />
                                    <span class="text-xs font-light">
                                        {{ req.text }}
                                        <span class="sr-only">
                                            {{
                                                req.met
                                                    ? t("login.strength.met")
                                                    : t("login.strength.notMet")
                                            }}
                                        </span>
                                    </span>
                                </li>
                            </ul>
                        </template>
                    </UPopover>
                </div>
            </div>
        </UFormField>

        <UFormField
            :label="$t('login.confirmPassword')"
            name="confirmPassword"
            class="mt-2"
            required
        >
            <BdInputPassword
                v-model="registerState.confirmPassword"
                class="w-full"
                type="password"
                size="lg"
                :ui="{ base: 'bg-transparent p-3' }"
                :placeholder="$t('login.placeholders.enterPasswordAgain')"
            />
            <template #help>
                <div class="flex items-center gap-1 text-xs">
                    <UIcon name="tabler:alert-circle" size="14" />
                    {{ $t("login.passwordRule") }}
                </div>
            </template>
        </UFormField>

        <div v-if="appStore.loginSettings?.showPolicyAgreement" class="mt-8 mb-4 text-left">
            <PrivacyTerms v-model="userStore.isAgreed" />
        </div>

        <div
            class="flex flex-1 gap-4 pb-8"
            :class="{ 'mt-8': !appStore.loginSettings?.showPolicyAgreement }"
        >
            <UButton
                variant="outline"
                color="primary"
                size="lg"
                :ui="{ base: 'flex-1 justify-center p-3' }"
                @click="emits('switchComponent', 'account-login')"
            >
                {{ $t("login.backToLogin") }}
            </UButton>
            <UButton
                color="primary"
                type="submit"
                size="lg"
                :loading="isLock"
                :ui="{ base: 'flex-1 justify-center p-3' }"
            >
                {{ $t("login.registerNow") }}
            </UButton>
        </div>
    </UForm>
</template>
