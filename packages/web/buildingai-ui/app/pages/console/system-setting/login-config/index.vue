<script lang="ts" setup>
import type { LoginSettings } from "@buildingai/service/consoleapi/login-settings";
import {
    apiGetLoginSettings,
    apiUpdateLoginSettings,
} from "@buildingai/service/consoleapi/login-settings";
import { array, boolean, number, object } from "yup";

import type { RadioGroupItem } from "#ui/types";

const { t } = useI18n();
const toast = useMessage();

enum LoginMethod {
    ACCOUNT = 1,
    PHONE = 2,
    WEIXIN = 3,
}

// 表单数据
const formData = ref<LoginSettings>({
    allowedLoginMethods: [1, 3],
    allowedRegisterMethods: [1, 3],
    defaultLoginMethod: 1,
    allowMultipleLogin: false,
    showPolicyAgreement: true,
});

// UI表单数据（用于组件绑定）
const uiFormData = ref({
    allowedLoginMethods: ["1", "3"],
    allowedRegisterMethods: ["1", "3"],
    defaultLoginMethod: "1",
});

// 保存从接口获取的原始数据，用于重置表单
const originalFormData = ref<LoginSettings | null>(null);
const originalUiFormData = ref<{
    allowedLoginMethods: string[];
    allowedRegisterMethods: string[];
    defaultLoginMethod: string;
} | null>(null);

// 监听UI表单数据变化，同步到业务表单数据
watch(
    () => uiFormData.value.allowedLoginMethods,
    (newVal) => {
        formData.value.allowedLoginMethods = newVal.map((val) => parseInt(val));
    },
);

watch(
    () => uiFormData.value.allowedRegisterMethods,
    (newVal) => {
        formData.value.allowedRegisterMethods = newVal.map((val) => parseInt(val));
    },
);

watch(
    () => uiFormData.value.defaultLoginMethod,
    (newVal) => {
        formData.value.defaultLoginMethod = parseInt(newVal);
    },
);

// 校验规则
const schema = object({
    allowedLoginMethods: array().min(1, t("system.website.loginConfig.loginType.description")),
    defaultLoginMethod: number().required(
        t("system.website.loginConfig.defaultLoginType.description"),
    ),
    allowMultipleLogin: boolean().required(
        t("system.website.loginConfig.allowMultipleLogin.description"),
    ),
    showPolicyAgreement: boolean().required(
        t("system.website.loginConfig.isAgreement.description"),
    ),
});

// 注册类型
const registerTypeItems = computed(() => [
    {
        value: LoginMethod.ACCOUNT.toString(),
        label: t("system.website.loginConfig.registerType.items.account"),
    },
    {
        value: LoginMethod.WEIXIN.toString(),
        label: t("system.website.loginConfig.registerType.items.weixin"),
    },
]);

// 登录类型
const loginTypeItems = computed(() => [
    {
        value: LoginMethod.ACCOUNT.toString(),
        label: t("system.website.loginConfig.loginType.items.account"),
        disabled: formData.value.defaultLoginMethod === LoginMethod.ACCOUNT,
    },
    {
        value: LoginMethod.WEIXIN.toString(),
        label: t("system.website.loginConfig.loginType.items.weixin"),
        disabled: formData.value.defaultLoginMethod === LoginMethod.WEIXIN,
    },
]);

// 默认登录类型
const defaultLoginMethod = computed(() => {
    const defaultLoginMethod: RadioGroupItem[] = [];
    loginTypeItems.value.forEach((item) => {
        if (formData.value.allowedLoginMethods.includes(Number(item.value))) {
            defaultLoginMethod.push(item);
        }
    });
    return defaultLoginMethod;
});

// 提交表单
const onSubmit = () => {
    updateLoginSettings();
};

/**
 * 重置表单为从接口获取的原始数据
 */
const resetForm = () => {
    if (originalFormData.value && originalUiFormData.value) {
        // 使用深拷贝避免引用问题
        formData.value = { ...originalFormData.value };
        uiFormData.value = { ...originalUiFormData.value };
    }
};

/**
 * 获取登录设置并保存原始数据
 */
const getLoginSettings = async () => {
    try {
        const data = await apiGetLoginSettings();

        // 保存原始数据用于重置
        originalFormData.value = { ...data };
        originalUiFormData.value = {
            allowedLoginMethods: data.allowedLoginMethods.map((method) => method.toString()),
            allowedRegisterMethods: data.allowedRegisterMethods.map((method) => method.toString()),
            defaultLoginMethod: data.defaultLoginMethod.toString(),
        };

        // 设置当前表单数据
        formData.value = data;
        uiFormData.value = {
            allowedLoginMethods: data.allowedLoginMethods.map((method) => method.toString()),
            allowedRegisterMethods: data.allowedRegisterMethods.map((method) => method.toString()),
            defaultLoginMethod: data.defaultLoginMethod.toString(),
        };
    } catch (error) {
        console.error("获取登录设置失败:", error);
    }
};

// 更新登录设置
const updateLoginSettings = async () => {
    try {
        await apiUpdateLoginSettings(formData.value);
        getLoginSettings();
        toast.success(t("system.website.loginConfig.updateSuccess"));
    } catch (error) {
        console.error("更新登录设置失败:", error);
    }
};

onMounted(() => {
    getLoginSettings();
});
</script>
<template>
    <div class="p-2">
        <div>
            <h2 class="text-lg font-semibold">
                {{ t("system.website.loginConfig.title") }}
            </h2>
        </div>
        <div class="p-4">
            <UForm :state="formData" :schema="schema" class="space-y-6" @submit="onSubmit">
                <UFormField
                    name="allowedRegisterMethods"
                    :label="t('system.website.loginConfig.registerType.label')"
                    :help="t('system.website.loginConfig.registerType.description')"
                    :ui="{
                        root: 'flex items-start gap-4',
                        label: 'w-24 text-right mt-1',
                        container: 'flex-1',
                    }"
                >
                    <template #label>
                        <span>
                            {{ t("system.website.loginConfig.registerType.label") }}
                        </span>
                    </template>
                    <UCheckboxGroup
                        v-model="uiFormData.allowedRegisterMethods"
                        :items="registerTypeItems"
                        orientation="horizontal"
                        :ui="{
                            fieldset: 'space-x-4',
                        }"
                    />
                </UFormField>
                <UFormField
                    name="allowedLoginMethods"
                    :label="t('system.website.loginConfig.loginType.label')"
                    :help="t('system.website.loginConfig.loginType.description')"
                    :ui="{
                        root: 'flex items-start gap-4',
                        label: 'w-24 text-right mt-1',
                        container: 'flex-1',
                    }"
                >
                    <template #label>
                        <span class="mr-1 text-red-500">*</span>
                        <span>{{ t("system.website.loginConfig.loginType.label") }}</span>
                    </template>
                    <UCheckboxGroup
                        v-model="uiFormData.allowedLoginMethods"
                        :items="loginTypeItems"
                        orientation="horizontal"
                        :ui="{
                            fieldset: 'space-x-4',
                        }"
                    />
                </UFormField>
                <UFormField
                    name="defaultLoginMethod"
                    :label="t('system.website.loginConfig.defaultLoginType.label')"
                    :help="t('system.website.loginConfig.defaultLoginType.description')"
                    :ui="{
                        root: 'flex items-start gap-4',
                        label: 'w-24 text-right mt-1',
                        container: 'flex-1',
                    }"
                >
                    <template #label>
                        <span class="mr-1 text-red-500">*</span>
                        <span>
                            {{ t("system.website.loginConfig.defaultLoginType.label") }}
                        </span>
                    </template>
                    <URadioGroup
                        v-model="uiFormData.defaultLoginMethod"
                        :items="defaultLoginMethod"
                        orientation="horizontal"
                        :ui="{
                            fieldset: 'space-x-4',
                        }"
                    />
                </UFormField>
                <UFormField
                    name="allowMultipleLogin"
                    :label="t('system.website.loginConfig.isSimultaneouslyOnline.label')"
                    :help="t('system.website.loginConfig.isSimultaneouslyOnline.description')"
                    :ui="{
                        root: 'flex items-start gap-4',
                        label: 'w-24 text-right mt-1',
                        container: 'flex-1',
                    }"
                >
                    <USwitch
                        v-model="formData.allowMultipleLogin"
                        :label="
                            formData.allowMultipleLogin
                                ? t('system.website.loginConfig.open')
                                : t('system.website.loginConfig.close')
                        "
                    />
                </UFormField>
                <UFormField
                    name="showPolicyAgreement"
                    :label="t('system.website.loginConfig.isAgreement.label')"
                    :help="t('system.website.loginConfig.isAgreement.description')"
                    :ui="{
                        root: 'flex items-start gap-4',
                        label: 'w-24 text-right mt-1',
                        container: 'flex-1',
                    }"
                >
                    <USwitch
                        v-model="formData.showPolicyAgreement"
                        :label="
                            formData.showPolicyAgreement
                                ? t('system.website.loginConfig.open')
                                : t('system.website.loginConfig.close')
                        "
                    />
                </UFormField>
                <div class="flex space-x-3 pt-4">
                    <AccessControl :codes="['system-website:setConfig']">
                        <UButton type="submit" color="primary">
                            {{ t("system.website.actions.save") }}
                        </UButton>
                    </AccessControl>
                    <UButton type="reset" color="neutral" variant="outline" @click="resetForm">
                        {{ t("system.website.actions.reset") }}
                    </UButton>
                </div>
            </UForm>
        </div>
    </div>
</template>
