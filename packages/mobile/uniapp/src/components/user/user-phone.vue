<script lang="ts" setup>
import { apiUpdateUserField } from "@/service/user";

const emit = defineEmits<{
    "slide-progress": [progress: number];
    open: [];
    close: [];
}>();

const userStore = useUserStore();

const show = shallowRef(false);
const delayFocus = shallowRef(false);

const formData = reactive({
    nickname: userStore.userInfo?.nickname || "",
    avatar: userStore.userInfo?.avatar || "",
});

const initFormData = () => {
    formData.nickname = userStore.userInfo?.nickname || "";
    formData.avatar = userStore.userInfo?.avatar || "";
};

const open = () => {
    show.value = true;
    emit("open");

    initFormData();

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

const hasChanges = computed(() => {
    const originalNickname = userStore.userInfo?.nickname || "";
    const originalAvatar = userStore.userInfo?.avatar || "";
    return formData.nickname !== originalNickname || formData.avatar !== originalAvatar;
});

const handleSave = async () => {
    try {
        const updatePromises: Promise<unknown>[] = [];

        if (formData.avatar !== userStore.userInfo?.avatar) {
            updatePromises.push(
                apiUpdateUserField({
                    field: "avatar",
                    value: formData.avatar,
                }),
            );
        }

        if (formData.nickname !== userStore.userInfo?.nickname) {
            if (!formData.nickname || formData.nickname.trim() === "") {
                useToast().error("昵称不能为空");
                return;
            }
            if (formData.nickname.length < 2 || formData.nickname.length > 20) {
                useToast().error("昵称长度必须在2-20个字符之间");
                return;
            }

            updatePromises.push(
                apiUpdateUserField({
                    field: "nickname",
                    value: formData.nickname.trim(),
                }),
            );
        }

        if (updatePromises.length === 0) {
            return;
        }

        await Promise.all(updatePromises);

        await userStore.getUser();

        useToast().success("保存成功");
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
            <view position="absolute" left="50%" class="translate-x-[-50%]"> Edit Phone </view>
            <view
                :class="hasChanges ? 'text-primary' : 'text-neutral-500'"
                @click="hasChanges && handleSave()"
            >
                保存
            </view>
        </view>

        <view class="p-4">
            <view class="bg-background rounded-lg p-2">
                <uni-easyinput
                    :styles="{
                        color: 'var(--foreground)',
                        backgroundColor: 'transparent',
                        disableColor: 'var(--border)',
                        borderColor: 'var(--background)',
                    }"
                    placeholder="昵称"
                    type="text"
                    :focus="delayFocus"
                    v-model="formData.nickname"
                />
            </view>
        </view>
    </half-popup>
</template>
