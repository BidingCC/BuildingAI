<script setup lang="ts">
import { useQuery } from "@uni-helper/uni-use";

const { value: url } = useQuery("url");
</script>

<template>
    <web-view :src="url" />
</template>
