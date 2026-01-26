<script setup lang="ts">
import { LOGIN_TYPE } from "@buildingai/constants/shared";
import type { LoginResponse } from "@buildingai/service/webapi/user";
import { apiAuthLogin } from "@buildingai/service/webapi/user";
import { object, string } from "yup";

import { useAgreementModal } from "../../hooks/use-agreement-modal";

const PrivacyTerms = defineAsyncComponent(() => import("../privacy-terms.vue"));

const emits = defineEmits<{
    (e: "switchComponent", component: string): void;
    (e: "success", v: LoginResponse): void;
}>();

const { ensureAgreementAccepted } = useAgreementModal(
    { width: "!w-[420px]" },
    resolveComponent("UIcon") as unknown as Component,
);

const appStore = useAppStore();
const userStore = useUserStore();
const toast = useMessage();
const { t } = useI18n();

// 表单验证架构
const loginSchema = object({
    username: string()
        .required(t("login.validation.accountRequired"))
        .min(3, t("login.validation.accountMinLength")),
    password: string()
        .required(t("login.validation.passwordRequired"))
        .min(6, t("login.validation.passwordMinLength"))
        .max(25, t("login.validation.passwordMaxLength")),
    // .matches(
    //     /^(?=.*[a-z])(?=.*[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
    //     t("login.validation.passwordFormat"),
    // ),
});

// 表单状态
const loginState = shallowReactive({
    username: "",
    password: "",
    terminal: "1",
});

const { lockFn: onLoginSubmit, isLock } = useLockFn(async () => {
    const canProceed = await ensureAgreementAccepted();
    if (!canProceed) {
        return;
    }
    try {
        const data = await apiAuthLogin(loginState);
        emits("success", data);
    } catch (error: unknown) {
        toast.error(t("login.messages.loginFailed"));
        console.error(t("login.messages.loginFailed"), error);
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
const passwordStrength = computed(() => checkPasswordStrength(loginState.password));

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
    <UForm :schema="loginSchema" :state="loginState" @submit="onLoginSubmit">
        <UFormField :label="$t('login.account')" name="username" required>
            <UInput
                v-model="loginState.username"
                class="w-full"
                size="lg"
                :ui="{ base: 'bg-transparent p-3' }"
                :placeholder="$t('login.usernamePlaceholder')"
            />
        </UFormField>

        <UFormField :label="$t('login.password')" name="password" class="mt-2" required>
            <div class="flex">
                <BdInputPassword
                    v-model="loginState.password"
                    class="w-full"
                    type="password"
                    size="lg"
                    :ui="{ base: 'bg-transparent p-3' }"
                    :placeholder="$t('login.passwordPlaceholder')"
                />
                <!-- <UButton
                    class="flex-none"
                    variant="link"
                    size="lg"
                    color="primary"
                    @click="emits('switchComponent', 'account-forget')"
                >
                    {{ $t("login.forgotPassword") }}
                </UButton> -->
            </div>
            <div class="mt-2" v-if="loginState.password">
                <UProgress :color="passwordColor" :model-value="passwordScore" :max="4" size="sm" />
                <div
                    v-if="passwordStrengthText"
                    class="mt-1 flex items-center gap-1 text-xs font-medium"
                    :class="passwordTextClass"
                >
                    <span>{{ passwordStrengthText }}</span>
                    <UPopover mode="hover" :open-delay="0">
                        <span class="inline-flex items-center" aria-label="Password requirements">
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

        <div v-if="appStore.loginSettings?.showPolicyAgreement" class="mt-8 mb-4 text-left">
            <PrivacyTerms v-model="userStore.isAgreed" />
        </div>

        <div
            class="flex flex-1 gap-4 pb-8"
            :class="{ 'mt-8': !appStore.loginSettings?.showPolicyAgreement }"
        >
            <UButton
                v-if="appStore.loginSettings?.allowedRegisterMethods.includes(LOGIN_TYPE.ACCOUNT)"
                variant="outline"
                color="primary"
                size="lg"
                :ui="{ base: 'flex-1 justify-center p-3' }"
                @click="emits('switchComponent', 'account-register')"
            >
                {{ $t("login.register") }}
            </UButton>
            <UButton
                color="primary"
                type="submit"
                size="lg"
                :ui="{ base: 'flex-1 justify-center p-3' }"
                :loading="isLock"
            >
                {{ $t("login.loginNow") }}
            </UButton>
        </div>
    </UForm>
</template>
