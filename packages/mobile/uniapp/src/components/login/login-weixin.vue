<script setup lang="ts">
const emits = defineEmits<{
    (e: "getPhoneNumber", value: GetPhoneNumberEvent["detail"]): void;
}>();

const getPhoneNumber = (e: GetPhoneNumberEvent) => {
    emits("getPhoneNumber", e.detail);
};
</script>

<template>
    <button type="primary" open-type="getPhoneNumber" @getphonenumber="getPhoneNumber">
        一键快捷登录
    </button>
</template>

<style scoped></style>
