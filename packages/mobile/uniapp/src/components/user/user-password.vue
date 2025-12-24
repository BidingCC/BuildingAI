<script lang="ts" setup>
import { apiChangePassword } from "@/service/user";

const emit = defineEmits<{
    "slide-progress": [progress: number];
    open: [];
    close: [];
}>();

const userStore = useUserStore();

const show = shallowRef(false);
const delayFocus = shallowRef(false);

const formData = reactive<{
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
});

const open = () => {
    show.value = true;
    emit("open");

    setTimeout(() => {
        delayFocus.value = true;
    }, 300);
};
const close = () => {
    show.value = false;
    emit("close");
    delayFocus.value = false;
};

const handleSlideProgress = (progress: number) => {
    emit("slide-progress", progress);
};
const customRules = {
    oldPassword: {
        rules: [
            {
                required: true,
                errorMessage: "旧密码不能为空",
            },
        ],
    },
    newPassword: {
        rules: [
            {
                required: true,
                errorMessage: "新密码不能为空",
            },
        ],
    },
    confirmPassword: {
        rules: [
            {
                required: true,
                errorMessage: "确认密码不能为空",
            },
        ],
    },
};

const handleSave = async () => {
    try {
        if (!canSave.value) {
            useToast().error("请填写完整信息");
            return;
        }
        if (formData.newPassword.length < 6) {
            useToast().error("新密码长度不能小于6位");
            return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            useToast().error("新密码与确认密码不一致");
            return;
        }
        await apiChangePassword({
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
        });
        await userStore.getUser();
        useToast().success("保存成功");
        resetForm();
        close();
    } catch (error: unknown) {
        console.error("Save failed:", error);
        const errorMessage =
            error && typeof error === "object" && "message" in error
                ? String(error.message)
                : "保存失败，请重试";
        useToast().error(errorMessage);
    }
};

const canSave = computed(() => {
    for (const key in formData) {
        if (key === "oldPassword" && !userStore.userInfo?.hasPassword) {
            continue;
        }
        if (formData[key as keyof typeof formData].trim() === "") {
            return false;
        }
    }
    return true;
});
const resetForm = () => {
    formData.oldPassword = "";
    formData.newPassword = "";
    formData.confirmPassword = "";
};

defineExpose({
    open,
    close,
});
</script>

<template>
    <half-popup
        v-model="show"
        :z-index="99999"
        height="90vh"
        :close-btn="false"
        :full-screen="false"
        bg-color="var(--background-soft)"
        @close="close"
        @open="open"
        @slide-progress="handleSlideProgress"
    >
        <view flex="~ justify-between items-center" class="relative px-3 py-4">
            <view i-lucide-arrow-left text="lg" @click="close" />
            <view position="absolute" left="50%" class="translate-x-[-50%]"> 登录密码 </view>
            <view
                :class="canSave ? 'text-primary' : 'text-neutral-500'"
                @click="canSave && handleSave()"
            >
                保存
            </view>
        </view>

        <view class="bg-background h-full p-2">
            <view class="bg-background rounded-lg p-2">
                <uni-forms ref="customFormRefs" :rules="customRules" :modelValue="formData">
                    <uni-forms-item
                        label="旧密码"
                        required
                        name="oldPassword"
                        label-align="right"
                        :label-width="80"
                        v-if="userStore.userInfo?.hasPassword"
                    >
                        <uni-easyinput
                            :styles="{
                                color: 'var(--foreground)',
                                backgroundColor: 'transparent',
                                disableColor: 'var(--border)',
                                borderColor: 'var(--background)',
                            }"
                            placeholder="旧密码"
                            :focus="userStore.userInfo?.hasPassword && delayFocus"
                            type="password"
                            v-model="formData.oldPassword"
                        />
                    </uni-forms-item>
                    <uni-forms-item
                        label="新密码"
                        required
                        name="newPassword"
                        label-align="right"
                        :label-width="80"
                    >
                        <uni-easyinput
                            :styles="{
                                color: 'var(--foreground)',
                                backgroundColor: 'transparent',
                                disableColor: 'var(--border)',
                                borderColor: 'var(--background)',
                            }"
                            placeholder="新密码"
                            :focus="!userStore.userInfo?.hasPassword && delayFocus"
                            type="password"
                            v-model="formData.newPassword"
                        />
                    </uni-forms-item>
                    <uni-forms-item
                        label="确认密码"
                        required
                        name="confirmPassword"
                        label-align="right"
                        :label-width="80"
                    >
                        <uni-easyinput
                            :styles="{
                                color: 'var(--foreground)',
                                backgroundColor: 'transparent',
                                disableColor: 'var(--border)',
                                borderColor: 'var(--background)',
                            }"
                            placeholder="确认密码"
                            type="password"
                            v-model="formData.confirmPassword"
                        />
                    </uni-forms-item>
                </uni-forms>
            </view>
        </view>
    </half-popup>
</template>
