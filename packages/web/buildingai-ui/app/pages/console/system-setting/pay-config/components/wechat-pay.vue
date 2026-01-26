<script setup lang="ts">
import {
    Merchant,
    PayConfigPayType,
    type PayConfigType,
    PayVersion,
    type WeChatPayConfig,
    type WeChatPayConfigInfo,
} from "@buildingai/constants/shared";
import { PayConfigPayTypeLabels } from "@buildingai/service/consoleapi/payconfig";
import { apiGetPayconfigById, apiUpdatePayconfig } from "@buildingai/service/consoleapi/payconfig";
import { number, object, string } from "yup";

const message = useMessage();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

type WeChatPayFormType = WeChatPayConfigInfo & { config: WeChatPayConfig };
const formData = shallowReactive<WeChatPayFormType>({
    id: "",
    name: "",
    logo: "",
    isEnable: 0,
    isDefault: 0,
    sort: 0,
    payType: PayConfigPayType.WECHAT,
    config: {
        appId: "",
        mchId: "",
        apiKey: "",
        paySignKey: "",
        cert: "",
        payAuthDir: "",
        merchantType: Merchant.ORDINARY,
        payVersion: PayVersion.V3,
    },
});
const payType = computed(() => {
    const payTypeValue = formData.payType;
    return PayConfigPayTypeLabels[payTypeValue as PayConfigType] ?? "未知支付方式";
});

const payConfigId = computed(() => route.query.id as string);

const { lockFn: getPayConfigDetail, isLock } = useLockFn(async () => {
    if (!payConfigId.value) {
        message.error(t("payment-config.form.getPayconfigDetailFailedHelp"));
        router.back();
        return;
    }
    try {
        const data = await apiGetPayconfigById(payConfigId.value, PayConfigPayType.WECHAT);
        formData.id = data.id;
        formData.name = data.name;
        formData.logo = data.logo;
        formData.isEnable = data.isEnable;
        formData.isDefault = data.isDefault;
        formData.sort = data.sort;
        if (data.config) {
            formData.config = data.config;
        }
    } catch (_error) {
        message.error(t("payment-config.form.getPayconfigDetailFailed"));
        router.back();
    }
});
onMounted(() => {
    getPayConfigDetail();
});
const { lockFn: submitForm, isLock: isSubmitting } = useLockFn(async () => {
    try {
        await apiUpdatePayconfig(formData);
        message.success(t("payment-config.form.updateSuccess"));
        router.back();
    } catch (error) {
        message.error(t("payment-config.form.updateFailed"));
        console.log(error);
    }
});
const schema = object({
    name: string().required(t("payment-config.validation.nameRequired")),
    sort: number().required(t("payment-config.validation.sortRequired")),
    config: object({
        payVersion: string().required(t("payment-config.validation.payVersionRequired")),
        merchantType: string().required(t("payment-config.validation.merchantTypeRequired")),
        mchId: string().required(t("payment-config.validation.mchIdRequired")),
        apiKey: string().required(t("payment-config.validation.apiKeyRequired")),
        paySignKey: string().required(t("payment-config.validation.paySignKeyRequired")),
        cert: string().required(t("payment-config.validation.certRequired")),
        appId: string().required(t("payment-config.validation.appIdRequired")),
    }).required(),
});
</script>
<template>
    <!-- 加载状态 -->
    <div v-if="isLock" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="text-primary-500 h-8 w-8 animate-spin" />
    </div>
    <UForm v-else :state="formData" :schema="schema" class="space-y-8" @submit="submitForm">
        <!-- 主要内容区域 -->
        <div class="grid grid-cols-1 gap-8 p-1 lg:grid-cols-3">
            <!-- 左侧 -->
            <div class="shadow-default h-fit rounded-lg lg:col-span-1">
                <div class="flex flex-col items-center space-y-4" style="padding: 80px 24px 40px">
                    <!-- 上传 -->
                    <div class="flex items-start gap-4">
                        <UAvatar
                            :src="formData.logo"
                            alt="WeChat pay"
                            class="h-32 w-32"
                            :ui="{ root: 'rounded-lg' }"
                        />
                    </div>

                    <!-- 图标说明 -->
                    <div class="mt-6 px-12 text-center text-xs">
                        <p class="text-muted-foreground">
                            {{ t("payment-config.form.avatarFormats") }}
                        </p>
                    </div>

                    <!-- 状态开关 -->
                    <div class="mt-6 flex w-full items-center justify-between">
                        <div>
                            <h4 class="text-secondary-foreground text-sm font-medium">
                                {{ t("payment-config.form.enable") }}
                            </h4>
                            <p class="text-muted-foreground mt-2 text-xs">
                                {{ t("payment-config.form.enableHelp") }}
                            </p>
                        </div>
                        <USwitch
                            :model-value="!!formData.isEnable"
                            unchecked-icon="i-lucide-x"
                            checked-icon="i-lucide-check"
                            @change="
                                (value) => {
                                    formData.isEnable = !formData.isEnable ? 1 : 0;
                                }
                            "
                        />
                    </div>
                    <!-- 是否默认 -->
                    <div class="mt-6 flex w-full items-center justify-between">
                        <div>
                            <h4 class="text-secondary-foreground text-sm font-medium">
                                {{ t("payment-config.form.isDefault") }}
                            </h4>
                            <p class="text-muted-foreground mt-2 text-xs">
                                {{ t("payment-config.form.isDefaultHelp") }}
                            </p>
                        </div>
                        <USwitch
                            :model-value="!!formData.isDefault"
                            unchecked-icon="i-lucide-x"
                            checked-icon="i-lucide-check"
                            @change="
                                (value) => {
                                    formData.isDefault = !formData.isDefault ? 1 : 0;
                                }
                            "
                        />
                    </div>
                </div>
            </div>
            <!-- 右侧表单区域 -->
            <div class="shadow-default space-y-6 rounded-lg p-6 lg:col-span-2">
                <!-- 基本信息 -->
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <!-- 支付方式 -->
                    <UFormField :label="t('payment-config.form.payway')" name="payway">
                        <UInput
                            v-model="payType"
                            :placeholder="t('payment-config.form.payway')"
                            :disabled="true"
                            variant="subtle"
                            class="w-full"
                        />
                    </UFormField>
                    <!-- 自定义显示名称 -->
                    <UFormField :label="t('payment-config.form.name')" name="name" required>
                        <UInput
                            v-model="formData.name"
                            :placeholder="t('payment-config.form.nameInput')"
                            class="w-full"
                        />
                    </UFormField>
                    <!-- 支付接口版本 -->
                    <UFormField
                        :label="t('payment-config.form.payVersion')"
                        :description="t('payment-config.form.payVersionHelp')"
                        name="config.payVersion"
                        required
                    >
                        <URadioGroup v-model="formData.config.payVersion" :items="['V3']" />
                    </UFormField>
                    <!-- 商户类型 -->
                    <UFormField
                        :label="t('payment-config.form.merchantType')"
                        :description="t('payment-config.form.merchantTypeHelp')"
                        name="config.merchantType"
                        required
                    >
                        <URadioGroup
                            v-model="formData.config.merchantType"
                            :items="[
                                {
                                    label: t('payment-config.form.merchantTypeOptions.ordinary'),
                                    value: 'ordinary',
                                },
                            ]"
                        />
                    </UFormField>
                    <!-- 商户号 -->
                    <UFormField
                        :label="t('payment-config.form.mchId')"
                        name="config.mchId"
                        required
                        :description="t('payment-config.form.mchIdHelp')"
                    >
                        <UInput
                            v-model="formData.config.mchId"
                            :placeholder="t('payment-config.form.mchIdInput')"
                            class="w-full"
                        />
                    </UFormField>
                    <!-- 商户api密钥 -->
                    <UFormField
                        :label="t('payment-config.form.apiKey')"
                        name="config.apiKey"
                        required
                        :description="t('payment-config.form.apiKeyHelp')"
                    >
                        <UInput
                            v-model="formData.config.apiKey"
                            :placeholder="t('payment-config.form.apiKeyInput')"
                            class="w-full"
                        />
                    </UFormField>
                    <!-- 微信支付证书 -->
                    <UFormField
                        :label="t('payment-config.form.cert')"
                        name="config.cert"
                        required
                        :description="t('payment-config.form.certHelp')"
                    >
                        <UTextarea
                            v-model="formData.config.cert"
                            :placeholder="t('payment-config.form.certInput')"
                            class="w-full"
                            autoresize
                            :maxrows="3"
                        />
                    </UFormField>
                    <!-- 微信支付密钥 -->
                    <UFormField
                        :label="t('payment-config.form.paySignKey')"
                        name="config.paySignKey"
                        required
                        :description="t('payment-config.form.paySignKeyHelp')"
                    >
                        <UTextarea
                            v-model="formData.config.paySignKey"
                            :placeholder="t('payment-config.form.paySignKeyInput')"
                            class="w-full"
                            autoresize
                            :maxrows="3"
                        />
                    </UFormField>

                    <!-- 支付授权目录 -->
                    <!-- <UFormField
                        :label="t('payment-config.form.payAuthDir')"
                        name="payAuthDir"
                        :description="t('payment-config.form.payAuthDirHelp')"
                    >
                        <UInput
                            v-model="formData.payAuthDir"
                            variant="subtle"
                            :placeholder="t('payment-config.form.payAuthDirHelp')"

                            :disabled="true"
                            class="w-full"
                        >
                            <template #trailing>
                                <span class="text-primary cursor-pointer text-xs">
                                    {{ t("payment-config.form.copy") }}
                                </span>
                            </template>
                        </UInput>
                    </UFormField> -->
                    <!-- appId -->
                    <UFormField
                        :label="t('payment-config.form.appId')"
                        name="config.appId"
                        required
                        :description="t('payment-config.form.appIdHelp')"
                    >
                        <UInput
                            v-model="formData.config!.appId"
                            :placeholder="t('payment-config.form.appIdInput')"
                            class="w-full"
                        />
                    </UFormField>
                    <!-- 排序 -->
                    <UFormField
                        :label="t('payment-config.form.sort')"
                        name="sort"
                        required
                        :description="t('payment-config.form.sortHelp')"
                    >
                        <UInput v-model="formData.sort" class="w-full" />
                    </UFormField>
                </div>
                <!-- 底部操作按钮 -->
                <div class="flex justify-end gap-4">
                    <UButton
                        color="neutral"
                        variant="outline"
                        @click="router.back()"
                        class="px-8"
                        :loading="isLock || isSubmitting"
                    >
                        {{ t("console-common.cancel") }}
                    </UButton>
                    <UButton
                        color="primary"
                        :loading="isLock || isSubmitting"
                        type="submit"
                        class="px-8"
                    >
                        {{ t("console-common.update") }}
                    </UButton>
                </div>
            </div>
        </div>
    </UForm>
</template>
