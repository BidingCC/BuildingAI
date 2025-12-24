<script lang="ts" setup>
import type { UpdateUserFieldRequest } from "@buildingai/service/webapi/user";
import { apiUpdateUserField } from "@buildingai/service/webapi/user";

type UpdateUserField = UpdateUserFieldRequest["field"];

const NicknameModal = defineAsyncComponent(() => import("../components/nickname-modal.vue"));
const PasswordModal = defineAsyncComponent(() => import("../components/password-modal.vue"));

const { copy } = useClipboard();
const { t } = useI18n();
const toast = useMessage();
const userStore = useUserStore();

const { lockFn: updateUserData, isLock: isLoading } = useLockFn(
    async (field: UpdateUserField, value: string) => {
        try {
            const res = await apiUpdateUserField({ field, value });
            userStore.getUser();
            toast.success(res.message);
        } catch (error) {
            console.error("修改失败:", error);
        }
    },
);

async function copyUserNo() {
    if (!userStore.userInfo?.userNo) return;

    await copy(userStore.userInfo.userNo);
    toast.success(t("console-common.messages.copySuccess"));
}

async function copyUser() {
    if (!userStore.userInfo?.username) return;

    await copy(userStore.userInfo.username);
    toast.success(t("console-common.messages.copySuccess"));
}

function unrealized() {
    toast.info(t("user.frontend.profile.featureNotAvailable"));
}

definePageMeta({
    title: "menu.profile",
    inSystem: true,
    inLinkSelector: true,
});
</script>

<template>
    <div class="mx-auto md:w-[600px] lg:w-[750px] xl:w-[850px]">
        <section>
            <h2 class="mt-8 mb-6 text-lg font-medium">
                {{ t("user.frontend.profile.myAccount") }}
            </h2>

            <div class="bg-accent mb-6 flex items-center rounded-xl p-6">
                <div>
                    <BdUploader
                        v-model="userStore.userInfo!.avatar"
                        class="size-16 overflow-hidden !rounded-full"
                        :text="t('user.frontend.profile.uploadAvatar')"
                        icon="i-lucide-user"
                        accept=".jpg,.png,.jpeg"
                        :maxCount="1"
                        :single="true"
                        @success="updateUserData('avatar', $event.url)"
                    />
                </div>
                <div class="ml-4">
                    <div class="text-foreground text-md font-semibold">
                        {{ userStore.userInfo?.nickname || t("user.frontend.profile.notSet") }}
                    </div>
                    <div class="text-muted-foreground mt-1 text-sm">
                        {{ userStore.userInfo?.phone || userStore.userInfo?.email || "-" }}
                    </div>
                </div>
            </div>

            <div class="space-y-8">
                <!-- User Nickname -->
                <UFormField :label="t('user.frontend.profile.nickname')" required name="nickname">
                    <div class="flex items-center gap-2">
                        <UInput
                            v-model="userStore.userInfo!.nickname"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <div class="flex-none">
                            <NicknameModal
                                :loading="isLoading"
                                :current-value="userStore.userInfo?.nickname"
                                class="flex-none"
                                size="lg"
                                @success="(e) => updateUserData('nickname', e)"
                            >
                                <UButton variant="soft"> {{ t("console-common.edit") }} </UButton>
                            </NicknameModal>
                        </div>
                    </div>
                </UFormField>

                <!-- User No -->
                <UFormField :label="t('user.frontend.profile.userNo')" name="userNo">
                    <div class="flex items-center gap-2">
                        <UInput
                            v-model="userStore.userInfo!.userNo"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <UButton size="lg" class="flex-none" variant="soft" @click="copyUserNo">
                            {{ t("console-common.copy") }}
                        </UButton>
                    </div>
                </UFormField>

                <!-- Username -->
                <UFormField :label="t('user.frontend.profile.username')" name="username">
                    <div class="flex items-center gap-2">
                        <UInput
                            v-model="userStore.userInfo!.username"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <UButton size="lg" class="flex-none" variant="soft" @click="copyUser">
                            {{ t("console-common.copy") }}
                        </UButton>
                    </div>
                </UFormField>

                <!-- Email -->
                <UFormField :label="t('user.frontend.profile.email')" name="email">
                    <div class="flex items-center gap-2">
                        <UInput
                            :model-value="userStore.userInfo!.email || '-'"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <UButton size="lg" class="flex-none" variant="soft" @click="unrealized">
                            {{ t("console-common.update") }}
                        </UButton>
                    </div>
                </UFormField>

                <!-- Phone -->
                <UFormField :label="t('user.frontend.profile.phone')" name="phone">
                    <div class="flex items-center gap-2">
                        <UInput
                            :model-value="userStore.userInfo!.phone || '-'"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <UButton size="lg" class="flex-none" variant="soft" @click="unrealized">
                            {{ t("console-common.update") }}
                        </UButton>
                    </div>
                </UFormField>

                <!-- Registration Time -->
                <UFormField :label="t('user.frontend.profile.registrationTime')" name="createdAt">
                    <div class="flex items-center gap-2">
                        <UInput
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        >
                            <template #leading>
                                <TimeDisplay
                                    v-if="userStore.userInfo?.createdAt"
                                    :datetime="userStore.userInfo.createdAt as unknown as Date"
                                    mode="datetime"
                                />
                                <span v-else>-</span>
                            </template>
                        </UInput>
                    </div>
                </UFormField>
            </div>
        </section>

        <!-- Account Security -->
        <section>
            <h2 class="mt-8 mb-6 text-lg font-medium">
                {{ t("user.frontend.profile.accountSecurity") }}
            </h2>

            <div class="space-y-8">
                <!-- Change Password -->
                <UFormField :label="t('user.frontend.profile.loginPassword')" name="password">
                    <div class="flex items-center gap-2">
                        <UInput
                            :model-value="
                                userStore.userInfo!.hasPassword
                                    ? t('user.frontend.profile.passwordSet')
                                    : t('user.frontend.profile.passwordNotSet')
                            "
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <div class="flex-none">
                            <PasswordModal :loading="isLoading" class="flex-none" size="lg">
                                <UButton size="lg" variant="soft">
                                    {{ t("console-common.update") }}
                                </UButton>
                            </PasswordModal>
                        </div>
                    </div>
                </UFormField>

                <!-- Deactivate Account -->
                <UFormField :label="t('user.frontend.profile.deactivateAccount')" name="deactivate">
                    <div class="flex items-center gap-2">
                        <UInput
                            :model-value="t('user.frontend.profile.deactivateWarning')"
                            variant="soft"
                            color="neutral"
                            size="lg"
                            disabled
                            :ui="{ root: 'w-full' }"
                        />
                        <UButton
                            size="lg"
                            class="flex-none"
                            variant="soft"
                            color="error"
                            @click="unrealized"
                        >
                            {{ t("user.frontend.profile.deactivate") }}
                        </UButton>
                    </div>
                </UFormField>
            </div>
        </section>
    </div>
</template>
