<script setup lang="ts">
import { apiChangePassword } from "@buildingai/service/webapi/user";
import { useI18n } from "vue-i18n";

/**
 * 密码表单数据结构
 */
type PasswordForm = {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
};

/**
 * 密码可见性状态结构
 */
type PasswordVisibility = {
    old: boolean;
    new: boolean;
    confirm: boolean;
};

const props = defineProps<{
    loading?: boolean;
}>();

const emit = defineEmits<{
    (e: "success"): void;
}>();

// 国际化
const { t } = useI18n();

// 响应式状态
const toast = useMessage();
const userStore = useUserStore();
const isOpen = ref(false);

// 表单数据
const formData = ref<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
});

// 显示/隐藏密码状态
const showPassword = ref<PasswordVisibility>({
    old: false,
    new: false,
    confirm: false,
});

/**
 * 字段级实时错误收集
 * 返回对象用于与 UFormField 的 error 绑定
 */

// 计算属性
const errors = computed(() => {
    const result: Record<string, string> = {};

    // 验证旧密码
    if (!formData.value.oldPassword.trim() && userStore.userInfo?.hasPassword) {
        result.oldPassword = t("user.frontend.profile.oldPasswordRequired");
    }

    // 验证新密码
    if (!formData.value.newPassword.trim()) {
        result.newPassword = t("user.frontend.profile.newPasswordRequired");
    } else if (formData.value.newPassword.length < 6) {
        result.newPassword = t("user.frontend.profile.passwordMinLength");
    }

    // 验证确认密码
    if (!formData.value.confirmPassword.trim()) {
        result.confirmPassword = t("user.frontend.profile.confirmPasswordRequired");
    } else if (formData.value.confirmPassword !== formData.value.newPassword) {
        result.confirmPassword = t("user.frontend.profile.passwordMismatch");
    }

    return result;
});

const hasErrors = computed(() => Object.keys(errors.value).length > 0);

const isFormEmpty = computed(() => {
    return (
        !formData.value.oldPassword.trim() &&
        !formData.value.newPassword.trim() &&
        !formData.value.confirmPassword.trim()
    );
});

/**
 * 是否处于提交中状态
 */
const isBusy = computed(() => isSubmitting.value || props.loading === true);

/**
 * 提交按钮禁用逻辑
 */
const isSubmitDisabled = computed(() => isFormEmpty.value || hasErrors.value || isBusy.value);

// 重置表单
function resetForm() {
    formData.value = {
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    };
    showPassword.value = {
        old: false,
        new: false,
        confirm: false,
    };
}

// 监听弹窗开关
watch(
    () => isOpen.value,
    (isOpen: boolean) => {
        if (isOpen) {
            resetForm();
        }
    },
);

// 修改密码逻辑
const { lockFn: changePasswordLockFn, isLock: isSubmitting } = useLockFn(async () => {
    if (hasErrors.value) {
        const firstError = Object.values(errors.value)[0] as string;
        toast.warning(firstError);
        return;
    }

    try {
        await apiChangePassword({
            oldPassword: formData.value.oldPassword,
            newPassword: formData.value.newPassword,
            confirmPassword: formData.value.confirmPassword,
        });

        // 后端返回 null 表示成功，直接显示成功提示
        toast.success(t("user.frontend.profile.passwordChangeSuccess"));
        emit("success");
        isOpen.value = false;
        userStore.logout();
        resetForm();
    } catch (error: unknown) {
        console.error("修改密码失败:", error);
        throw error;
    }
});

// 切换密码显示状态
function togglePasswordVisibility(field: keyof typeof showPassword.value) {
    showPassword.value[field] = !showPassword.value[field];
}
</script>

<template>
    <BdModal
        v-model:open="isOpen"
        :title="t('user.frontend.profile.changePassword')"
        :ui="{ content: 'max-w-md' }"
        :show-footer="true"
    >
        <template #trigger>
            <slot></slot>
        </template>

        <div class="space-y-4 py-2">
            <!-- 旧密码 -->
            <UFormField
                :label="t('user.frontend.profile.oldPassword')"
                size="lg"
                required
                :error="errors.oldPassword"
                v-if="userStore.userInfo!.hasPassword"
            >
                <UInput
                    v-model="formData.oldPassword"
                    :type="showPassword.old ? 'text' : 'password'"
                    :placeholder="t('user.frontend.profile.oldPasswordPlaceholder')"
                    :ui="{ root: 'w-full' }"
                    @keydown.enter.prevent="changePasswordLockFn"
                >
                    <template #trailing>
                        <UButton
                            variant="ghost"
                            size="xs"
                            :icon="showPassword.old ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                            @click="togglePasswordVisibility('old')"
                        />
                    </template>
                </UInput>
            </UFormField>

            <!-- 新密码 -->
            <UFormField
                :label="t('user.frontend.profile.newPassword')"
                size="lg"
                required
                :error="errors.newPassword"
            >
                <UInput
                    v-model="formData.newPassword"
                    :type="showPassword.new ? 'text' : 'password'"
                    :placeholder="t('user.frontend.profile.newPasswordPlaceholder')"
                    :ui="{ root: 'w-full' }"
                    @keydown.enter.prevent="changePasswordLockFn"
                >
                    <template #trailing>
                        <UButton
                            variant="ghost"
                            size="xs"
                            :icon="showPassword.new ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                            @click="togglePasswordVisibility('new')"
                        />
                    </template>
                </UInput>
            </UFormField>

            <!-- 确认新密码 -->
            <UFormField
                :label="t('user.frontend.profile.confirmPassword')"
                size="lg"
                required
                :error="errors.confirmPassword"
            >
                <UInput
                    v-model="formData.confirmPassword"
                    :type="showPassword.confirm ? 'text' : 'password'"
                    :placeholder="t('user.frontend.profile.confirmPasswordPlaceholder')"
                    :ui="{ root: 'w-full' }"
                    @keydown.enter.prevent="changePasswordLockFn"
                >
                    <template #trailing>
                        <UButton
                            variant="ghost"
                            size="xs"
                            :icon="showPassword.confirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                            @click="togglePasswordVisibility('confirm')"
                        />
                    </template>
                </UInput>
            </UFormField>

            <div class="text-muted-foreground text-xs">
                {{ t("user.frontend.profile.passwordRequirement") }}
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton variant="soft" @click="isOpen = false">{{
                    t("console-common.cancel")
                }}</UButton>
                <UButton
                    :disabled="isSubmitDisabled"
                    color="primary"
                    :loading="isBusy"
                    @click="changePasswordLockFn"
                >
                    {{ t("console-common.save") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
