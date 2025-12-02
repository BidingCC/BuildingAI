<script setup lang="ts">
defineProps<{
    url: string;
}>();
</script>

<template>
    <web-view :src="url" />
</template>
