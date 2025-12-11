<script setup lang="ts">
const { t } = useI18n();

const emits = defineEmits<{
    (e: "getPhoneNumber", value: GetPhoneNumberEvent["detail"]): void;
}>();

const getPhoneNumber = (e: GetPhoneNumberEvent) => {
    emits("getPhoneNumber", e.detail);
};
</script>

<template>
    <button type="primary" open-type="getPhoneNumber" @getphonenumber="getPhoneNumber">
        {{ t("login.quickLogin") }}
    </button>
</template>

<style scoped></style>
