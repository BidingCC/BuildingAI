<script setup lang="ts">
import { useVModel } from "@vueuse/core";

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

const checked = useVModel(props, "modelValue", emits);
</script>

<template>
    <view>
        <BdCheckbox v-model="checked" :value="true">
            <template #label>
                <view class="flex items-center" text-xs text-muted-foreground>
                    <text ml-1>已阅读并同意</text>
                    <text class="text-primary">《用户协议》</text>
                    <text>和</text>
                    <text class="text-primary">《隐私政策》</text>
                </view>
            </template>
        </BdCheckbox>
    </view>
</template>
