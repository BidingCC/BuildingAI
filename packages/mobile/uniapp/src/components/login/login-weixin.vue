<script setup lang="ts">
const { t } = useI18n();

const emits = defineEmits<{
    (e: "getPhoneNumber", value: GetPhoneNumberEvent["detail"]): void;
    (e: "handleLogin"): void;
}>();

const getPhoneNumber = (e: GetPhoneNumberEvent) => {
    emits("getPhoneNumber", e.detail);
};
</script>

<template>
    <!-- #ifdef MP -->
    <button type="primary" open-type="getPhoneNumber" @getphonenumber="getPhoneNumber">
        {{ t("login.quickLogin") }}
    </button>
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <button type="primary" @click="emits('handleLogin')">
        {{ t("login.quickLogin") }}
    </button>
    <!-- #endif -->
</template>

<style scoped></style>
