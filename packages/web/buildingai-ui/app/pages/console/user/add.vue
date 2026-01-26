<script lang="ts" setup>
import { apiCreateUser } from "@buildingai/service/consoleapi/user";
import type { UserCreateRequest, UserUpdateRequest } from "@buildingai/service/webapi/user";

const UserForm = defineAsyncComponent(() => import("./components/user-form.vue"));

const router = useRouter();
const message = useMessage();
const formRef = ref(null);

/** 处理表单提交 */
const handleSubmit = async (formData: UserCreateRequest | UserUpdateRequest) => {
    try {
        // 移除确认密码字段，后端不需要
        // const { confirmPassword, ...submitData } = formData;
        const { level, levelEndTime, ...submitData } = formData;

        await apiCreateUser(submitData as UserCreateRequest);
        message.success(t("user.backend.messages.createSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("Create user failed:", error);
        message.error(t("user.backend.messages.createFailed"));
    }
};

/** 处理取消操作 */
const handleCancel = () => {
    router.back();
};

const { t } = useI18n();
</script>

<template>
    <div class="user-add-container">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ $t("console-common.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">{{ $t("user.backend.addTitle") }}</h1>
        </div>

        <UserForm
            ref="formRef"
            :is-edit="false"
            @submit-success="handleSubmit"
            @cancel="handleCancel"
        />
    </div>
</template>
