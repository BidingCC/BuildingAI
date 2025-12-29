<script setup lang="ts">
import Chat from "./components/chat.vue";

definePage({
    style: {
        navigationBarTitle: "智能体聊天",
        auth: false,
        hiddenHeader: true,
    },
});
</script>

<template>
    <Chat h="full" billingMode="creator" />
</template>
