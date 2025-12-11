<script setup lang="ts">
import { useVModel } from "@vueuse/core";

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

const checked = useVModel(props, "modelValue", emits);

const handleAgreement = (type: "service" | "privacy") => {
    useRouter().navigate({
        url: `/pages/agreement/index?url=${type}`,
    });
};
</script>

<template>
    <view>
        <BdCheckbox v-model="checked" :value="true">
            <template #label>
                <view class="flex items-center" text-xs text-muted-foreground>
                    <text ml-1>已阅读并同意</text>
                    <text class="text-primary" @click="handleAgreement('service')">
                        《用户协议》
                    </text>
                    <text>和</text>
                    <text class="text-primary" @click="handleAgreement('privacy')">
                        《隐私政策》
                    </text>
                </view>
            </template>
        </BdCheckbox>
    </view>
</template>
