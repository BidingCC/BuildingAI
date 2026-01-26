<script lang="ts" setup>
import { apiGetLevelListAll } from "@buildingai/service/consoleapi/membership-level";
import { apiGetUserRolesList } from "@buildingai/service/consoleapi/user";
import type { UserCreateRequest } from "@buildingai/service/webapi/user";
import {
    getDefaultAreaCode,
    PHONE_AREA_CODES,
    validatePhoneNumber,
} from "@buildingai/web-config/phone-area";
import { number, object, string } from "yup";

const EditPassword = defineAsyncComponent(() => import("./edit-password.vue"));
const EditPower = defineAsyncComponent(() => import("./edit-power.vue"));
const UserSubscriptionRecordsModal = defineAsyncComponent(
    () => import("./user-subscription-records-modal.vue"),
);

const props = withDefaults(
    defineProps<{
        /** 是否编辑模式 */
        isEdit?: boolean;
        /** 编辑的ID */
        id?: string | null;
        /** 初始数据 */
        initialData?: Partial<UserCreateRequest>;
    }>(),
    {
        isEdit: false,
        id: null,
        initialData: () => ({}),
    },
);

const emit = defineEmits<{
    /** 提交成功事件 */
    (e: "submit-success", data: UserCreateRequest): void;
    /** 取消事件 */
    (e: "cancel"): void;
    /** 刷新事件 */
    (e: "refresh"): void;
}>();

const { t } = useI18n();
const message = useMessage();
const overlay = useOverlay();

const { userNo: _userNo, ...filteredInitialData } = props.initialData || {};

const formData = shallowReactive<UserCreateRequest>({
    username: "",
    nickname: "",
    email: "",
    phone: "",
    phoneAreaCode: getDefaultAreaCode(), // 自动检测当前地区区号
    avatar: "",
    password: "",
    roleId: undefined,
    status: 1,
    source: 0,
    level: "",
    levelEndTime: "",
    ...filteredInitialData,
});

const roleOptions = shallowRef<{ label: string; value: string }[]>([]);
const levelOptions = shallowRef<{ label: string; value: string | null }[]>([]);

// 区号选项 - 使用公共配置
const areaCodeOptions = computed(() => {
    return PHONE_AREA_CODES.map((item) => ({
        label: `${item.flag} ${t(item.i18nKey)} +${item.areaCode}`,
        value: item.areaCode,
    }));
});

const schema = computed(() => {
    const baseSchema = {
        username: string()
            .required(t("user.backend.form.usernameRequired"))
            .matches(/^[a-zA-Z0-9_]*$/, t("user.backend.form.usernameFormat")),
        nickname: string().required(t("user.backend.form.nicknameRequired")),
        email: string().email(t("user.backend.form.emailFormat")).nullable(),

        phone: string()
            .test("phone-format", t("user.backend.form.phoneFormat"), function (value) {
                if (!value) return true; // 可选字段
                // 根据选择的区号获取对应的国家代码
                const areaCodeConfig = PHONE_AREA_CODES.find(
                    (item) => item.areaCode === formData.phoneAreaCode,
                );
                if (!areaCodeConfig) return false;
                return validatePhoneNumber(value, areaCodeConfig.code);
            })
            .nullable(),
        phoneAreaCode: string()
            .matches(/^\d{1,4}$/, t("user.backend.form.areaCodeFormat"))
            .nullable(),
        status: number().required(t("user.backend.form.statusRequired")),
        source: number().required(t("user.backend.form.sourceRequired")),
    };

    // 如果是新增模式，添加密码验证
    if (!props.isEdit) {
        return object({
            ...baseSchema,
            password: string()
                .required(t("user.backend.form.passwordRequired"))
                .min(6, t("user.backend.form.passwordMinLength")),
        });
    }

    return object(baseSchema);
});

const getRoleList = async () => {
    try {
        const response = await apiGetUserRolesList();
        roleOptions.value = [
            { label: t("user.backend.form.noRole"), value: "null" }, // 添加无角色选项，使用空字符串
            ...response.map((role: { name: string; id: string }) => ({
                label: role.name,
                value: role.id,
            })),
        ];
    } catch (error) {
        console.error("Get role list failed:", error);
        message.error(t("user.backend.form.getRoleListFailed"));
    }
};

const getLevelList = async () => {
    try {
        const response = await apiGetLevelListAll();
        levelOptions.value = [
            { label: "普通用户", value: null }, // 添加普通用户选项，使用 null 作为值
            ...response
                .filter((level) => level.status) // 只显示启用状态的等级
                .map((level) => ({
                    label: level.name,
                    value: level.id,
                })),
        ];
    } catch (error) {
        console.error("Get level list failed:", error);
        message.error("获取会员等级列表失败");
    }
};

const resetForm = () => {
    Object.keys(formData).forEach((key) => {
        const typedKey = key as keyof UserCreateRequest;
        if (typeof formData[typedKey] === "string") {
            (formData[typedKey] as string) = "";
        } else if (typeof formData[typedKey] === "number") {
            (formData[typedKey] as number) = key === "status" ? 1 : 0;
        }
    });
    message.info(t("user.backend.form.formReset"));
};

const mountEditPowerModal = async (): Promise<void> => {
    if (!props.id) return;

    const modal = overlay.create(EditPower);
    const instance = modal.open({
        user: { id: props.id, power: formData.power },
    });

    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        emit("refresh");
    }
};

const mountEditPasswordModal = async (): Promise<void> => {
    if (!props.id) return;

    const modal = overlay.create(EditPassword);

    const instance = modal.open({
        userid: props.id,
    });
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        // emit("refresh");
    }
};

const handleEditPassword = () => {
    mountEditPasswordModal();
};

const { isLock, lockFn: submitForm } = useLockFn(async () => {
    try {
        if (formData.roleId === "null") {
            formData.roleId = undefined;
        }
        // // 处理会员等级：如果为 null 或空字符串，则设置为 undefined
        // if (formData.level === null || formData.level === "") {
        //     formData.level = undefined;
        //     formData.levelEndTime = undefined;
        // }
        // 发送事件，由父组件处理提交逻辑
        emit("submit-success", { ...formData });
    } catch (error) {
        console.error(t("user.backend.form.formValidationFailed") + ":", error);
        return false;
    }
});

const handleOpenSubscriptionRecords = () => {
    if (!props.id) return;
    const modal = overlay.create(UserSubscriptionRecordsModal);
    modal.open({ userId: props.id });
};

onMounted(() => {
    getRoleList();
    getLevelList();
});
</script>

<template>
    <div>
        <UForm :state="formData" :schema="schema" class="space-y-8" @submit="submitForm">
            <!-- 主要内容区域 -->
            <div class="grid grid-cols-1 gap-8 p-1 lg:grid-cols-3">
                <!-- 左侧头像上传区域 -->
                <div class="shadow-default h-fit rounded-lg lg:col-span-1">
                    <div
                        class="flex flex-col items-center space-y-4"
                        style="padding: 80px 24px 40px"
                    >
                        <!-- 头像上传 -->
                        <div class="border-default relative rounded-full border border-dashed p-2">
                            <BdUploader
                                v-model="formData.avatar"
                                class="bg-muted h-32 w-32 overflow-hidden rounded-full! border-none!"
                                :text="t('user.backend.form.addAvatar')"
                                icon="i-lucide-camera"
                                accept=".jpg,.png,.jpeg"
                                :maxCount="1"
                                :single="true"
                            />
                        </div>

                        <!-- 头像说明 -->
                        <div class="mt-6 px-12 text-center text-xs">
                            <p class="text-muted-foreground">
                                {{ t("user.backend.form.avatarFormats") }}
                            </p>
                        </div>

                        <!-- 用户状态开关 -->
                        <div class="mt-6 flex w-full items-center justify-between">
                            <div>
                                <h4 class="text-secondary-foreground text-sm font-medium">
                                    {{ t("user.backend.form.statusLabel") }}
                                </h4>
                                <p class="text-muted-foreground mt-2 text-xs">
                                    {{ t("user.backend.form.statusHelp") }}
                                </p>
                            </div>
                            <USwitch
                                :model-value="!!formData.status"
                                unchecked-icon="i-lucide-x"
                                checked-icon="i-lucide-check"
                                size="xl"
                                @change="(value) => (formData.status = !formData.status ? 1 : 0)"
                            />
                        </div>

                        <!-- 剩余积分 -->
                        <div v-if="props.isEdit" class="mt-4 w-full">
                            <UFormField :label="t('user.backend.form.power')" name="power">
                                <UInput
                                    v-model="formData.power"
                                    :disabled="true"
                                    variant="subtle"
                                    size="xl"
                                    class="w-full"
                                    type="number"
                                >
                                    <template #trailing>
                                        <UButton
                                            class="cursor-pointer"
                                            color="primary"
                                            variant="link"
                                            size="sm"
                                            icon="i-lucide-edit"
                                            aria-label="Clear input"
                                            @click="mountEditPowerModal"
                                        />
                                    </template>
                                </UInput>
                            </UFormField>
                        </div>
                    </div>
                </div>

                <!-- 右侧表单区域 -->
                <div class="shadow-default space-y-6 rounded-lg p-6 lg:col-span-2">
                    <!-- 基本信息 -->
                    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <!-- 用户名 -->
                        <UFormField
                            :label="t('user.backend.form.username')"
                            name="username"
                            required
                        >
                            <UInput
                                v-model="formData.username"
                                :placeholder="t('user.backend.form.usernameInput')"
                                size="xl"
                                :disabled="props.isEdit"
                                class="w-full"
                            />
                            <template #hint v-if="!props.isEdit">
                                <span class="text-muted-foreground text-xs">{{
                                    t("user.backend.form.usernameHelp")
                                }}</span>
                            </template>
                        </UFormField>

                        <!-- 昵称 -->
                        <UFormField
                            :label="t('user.backend.form.nickname')"
                            name="nickname"
                            required
                        >
                            <UInput
                                v-model="formData.nickname"
                                :placeholder="t('user.backend.form.nicknameInput')"
                                size="xl"
                                class="w-full"
                            />
                        </UFormField>
                    </div>

                    <!-- 手机号和昵称 -->
                    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <!-- 手机号 -->
                        <UFormField :label="t('user.backend.form.phone')" name="phone">
                            <UInput
                                v-model="formData.phone"
                                :placeholder="t('user.backend.form.phoneInput')"
                                size="xl"
                                autocomplete="off"
                                :ui="{ root: 'w-full', base: '!pl-28' }"
                            >
                                <template #leading>
                                    <div class="flex items-center text-sm" @click.stop.prevent>
                                        <USelectMenu
                                            v-model="formData.phoneAreaCode"
                                            :items="areaCodeOptions"
                                            trailing-icon="heroicons:chevron-up-down-20-solid"
                                            class="w-fit"
                                            size="lg"
                                            :ui="{
                                                base: '!ring-0',
                                                content: 'z-999 w-64',
                                            }"
                                            value-key="value"
                                        >
                                            <template #default>
                                                +
                                                {{ formData.phoneAreaCode }}
                                            </template>
                                            <template #item="{ item }">
                                                {{ item.label }}
                                            </template>
                                        </USelectMenu>
                                    </div>
                                    <USeparator class="h-1/2" orientation="vertical" />
                                </template>
                            </UInput>
                            <!-- <template #hint>
                                <span class="text-muted-foreground text-xs">{{
                                    t("user.backend.form.phoneOrEmailHint")
                                }}</span>
                            </template> -->
                        </UFormField>

                        <!-- 邮箱 -->
                        <UFormField :label="t('user.backend.form.email')" name="email">
                            <UInput
                                v-model="formData.email"
                                :placeholder="t('user.backend.form.emailInput')"
                                size="xl"
                                type="email"
                                class="w-full"
                            />
                            <!-- <template #hint>
                                <span class="text-muted-foreground text-xs">{{
                                    t("user.backend.form.emailOrPhoneHint")
                                }}</span>
                            </template> -->
                        </UFormField>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <!-- 密码字段 - 仅新增时显示 -->
                        <template v-if="!props.isEdit">
                            <UFormField
                                :label="t('user.backend.form.password')"
                                name="password"
                                required
                            >
                                <BdInputPassword
                                    v-model="formData.password"
                                    :placeholder="t('user.backend.form.passwordInput')"
                                    size="xl"
                                    type="password"
                                    class="w-full"
                                />
                                <template #hint>
                                    <span class="text-muted-foreground text-xs">{{
                                        t("user.backend.form.passwordHelp")
                                    }}</span>
                                </template>
                            </UFormField>
                        </template>

                        <!-- 角色 -->
                        <UFormField :label="t('user.backend.form.role')" name="roleId">
                            <USelect
                                v-model="formData.roleId"
                                label-key="label"
                                value-key="value"
                                :items="roleOptions"
                                :placeholder="t('user.backend.form.roleSelect')"
                                size="xl"
                                class="w-full"
                            />
                        </UFormField>

                        <!-- 真实姓名 -->
                        <UFormField :label="t('user.backend.form.realName')" name="realName">
                            <UInput
                                v-model="formData.realName"
                                :placeholder="t('user.backend.form.realNameInput')"
                                size="xl"
                                class="w-full"
                            />
                        </UFormField>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <!-- 会员等级 -->
                        <UFormField :label="t('user.backend.membership.level')" name="level">
                            <USelect
                                v-model="formData.level"
                                :items="levelOptions"
                                label-key="label"
                                value-key="value"
                                :placeholder="t('user.backend.membership.normalUser')"
                                size="xl"
                                class="w-full"
                                :disabled="true"
                            />
                        </UFormField>

                        <!-- 有效期 -->
                        <UFormField
                            :label="t('user.backend.membership.validity')"
                            name="levelEndTime"
                        >
                            <BdDatePicker
                                v-model="formData.levelEndTime"
                                show-time
                                size="xl"
                                class="w-full"
                                :ui="{ root: 'w-full' }"
                                :disabled="true"
                            />
                        </UFormField>
                    </div>

                    <!-- 底部操作按钮 -->
                    <div class="flex justify-end gap-4">
                        <UButton
                            color="neutral"
                            variant="outline"
                            size="lg"
                            @click="emit('cancel')"
                            class="px-8"
                        >
                            {{ t("console-common.cancel") }}
                        </UButton>
                        <UButton
                            v-if="props.id"
                            color="neutral"
                            variant="outline"
                            size="lg"
                            @click="handleOpenSubscriptionRecords"
                            class="px-8"
                        >
                            {{ t("user.backend.subscriptionRecords.title") }}
                        </UButton>
                        <UButton
                            v-if="props.id"
                            color="neutral"
                            size="lg"
                            @click="handleEditPassword"
                            class="px-8"
                        >
                            {{ t("user.backend.password.resetTab") }}
                        </UButton>
                        <UButton v-else color="neutral" size="lg" @click="resetForm" class="px-8">
                            {{ t("console-common.reset") }}
                        </UButton>
                        <UButton
                            color="primary"
                            size="lg"
                            :loading="isLock"
                            type="submit"
                            class="px-8"
                        >
                            {{
                                props.isEdit
                                    ? t("console-common.update")
                                    : t("console-common.create")
                            }}
                        </UButton>
                    </div>
                </div>
            </div>
        </UForm>
    </div>
</template>
