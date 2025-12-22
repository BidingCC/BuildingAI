<script lang="ts" setup>
import type { UniPopupInstance } from "@uni-helper/uni-ui-types";

import { useUpload } from "@/hooks/use-request";
import { apiUpdateUserField } from "@/service/user";
import Logo from "@/static/logo.png";

const appStore = useAppStore();

const websiteInfo = computed(() => {
    return appStore.siteConfig?.webinfo;
});
const emit = defineEmits<{
    open: [];
    close: [];
}>();
const userStore = useUserStore();
const formData = reactive<{ nickname: string; avatar: string }>({
    nickname: "",
    avatar: "",
});

const popupRef = ref<UniPopupInstance>();
const customRules = {
    name: {
        rules: [
            {
                required: true,
                errorMessage: "昵称不能为空",
            },
        ],
    },
    avatar: {
        rules: [
            {
                required: true,
                errorMessage: "头像不能为空",
            },
        ],
    },
};

const open = () => {
    popupRef.value?.open?.();
    emit("open");
};

const close = () => {
    popupRef.value?.close?.();
    emit("close");
};
const onChooseAvatar = (e: any) => {
    uni.showLoading({
        title: "上传中...",
    });
    useUpload({
        data: {
            file: e.detail.avatarUrl,
        },
        success: (uploadRes) => {
            formData.avatar = uploadRes.url;
        },
        fail: (errMsg) => {
            useToast().error(errMsg);
        },
        complete: () => {
            uni.hideLoading();
        },
    });
};

const handleSave = async () => {
    try {
        const updatePromises: Promise<unknown>[] = [];
        if (formData.avatar.trim() === "") {
            useToast().error("请上传头像");
            return;
        }
        if (formData.nickname.trim() === "") {
            useToast().error("昵称不能为空");
            return;
        }
        updatePromises.push(
            apiUpdateUserField({
                field: "avatar",
                value: formData.avatar,
            }),
        );
        updatePromises.push(
            apiUpdateUserField({
                field: "nickname",
                value: formData.nickname.trim(),
            }),
        );

        if (updatePromises.length === 0) {
            return;
        }

        await Promise.all(updatePromises);
        useToast().success("保存成功");
        await userStore.getUser();
        close();
    } catch (error) {
        console.error("Save failed:", error);
    }
};
defineExpose({
    open,
    close,
});
</script>

<template>
    <uni-popup ref="popupRef" type="bottom" :safe-area="false" z-index="99" :is-mask-click="false">
        <view class="bg-background rounded-t-5 safe-area-bottom overflow-hidden px-4 py-6">
            <view class="flex gap-2">
                <image :src="websiteInfo?.logo || Logo" size="108rpx" class="flex-shrink-0" />
                <view class="flex flex-col justify-around">
                    <text class="font-bold">{{ websiteInfo?.name }}</text>
                    <view class="text-muted-foreground text-xs">
                        建议使用您的微信头像和昵称，以便获得更好的体验
                    </view>
                </view>
            </view>

            <view flex="~ col" gap="2" class="mt-8">
                <uni-forms ref="customFormRefs" :rules="customRules" :modelValue="formData">
                    <uni-forms-item label="头像" required name="name">
                        <view class="flex justify-start">
                            <button
                                pos-relative
                                hover-class="none"
                                open-type="chooseAvatar"
                                class="rounded-4 !ml-0 size-12 !px-0"
                                style="background: var(--background) !important"
                                @chooseavatar="onChooseAvatar"
                            >
                                <image
                                    v-if="formData.avatar"
                                    :src="formData.avatar"
                                    class="rounded-4 size-12"
                                    mode="aspectFill"
                                />
                                <view
                                    v-else
                                    class="rounded-4 box-border size-12 border border-solid border-gray-300"
                                >
                                    <view
                                        class="absolute top-1/2 left-1/2 mb-px flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-gray-500"
                                        i-lucide-camera
                                    />
                                </view>
                            </button>
                        </view>
                    </uni-forms-item>
                    <uni-forms-item label="昵称" required name="name">
                        <uni-easyinput
                            type="nickname"
                            v-model="formData.nickname"
                            placeholder="请输入昵称"
                        />
                    </uni-forms-item>
                </uni-forms>
            </view>
            <view class="mt-8 space-y-4">
                <button type="primary" @click="handleSave">保存</button>
                <view class="text-muted-foreground text-center text-sm" @click="close"
                    >暂不处理</view
                >
            </view>
        </view>
    </uni-popup>
</template>
<style scoped>
/* 安全区域适配 */
.safe-area-bottom {
    /* #ifndef APP-NVUE */
    padding-bottom: env(safe-area-inset-bottom);
    /* #endif */
}
</style>
