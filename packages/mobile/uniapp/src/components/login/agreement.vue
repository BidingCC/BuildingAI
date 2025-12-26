<script setup lang="ts">
import { useVModel } from "@vueuse/core";

import BdCheckbox from "@/components/bd-checkbox.vue?async";

const { t } = useI18n();

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

const checked = useVModel(props, "modelValue", emits);

const handleAgreement = (type: "service" | "privacy") => {
    useRouter().navigate({
        url: `/packages/agreement/index?url=${type}`,
    });
};
</script>

<template>
    <view>
        <BdCheckbox v-model="checked" :value="true">
            <template #label>
                <view class="flex items-center" text-xs text-muted-foreground>
                    <text ml-1>{{ t("login.agreement.readAndAgree") }}</text>
                    <text class="text-primary" @click="handleAgreement('service')">
                        {{ t("login.agreement.userAgreementBrackets") }}
                    </text>
                    <text>{{ t("login.and") }}</text>
                    <text class="text-primary" @click="handleAgreement('privacy')">
                        {{ t("login.agreement.privacyPolicyBrackets") }}
                    </text>
                </view>
            </template>
        </BdCheckbox>
    </view>
</template>
