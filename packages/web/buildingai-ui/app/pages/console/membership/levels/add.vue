<script lang="ts" setup>
import {
    apiCreateLevel,
    type LevelCreateRequest,
} from "@buildingai/service/consoleapi/membership-level";
import { useRouter } from "vue-router";

const router = useRouter();
const message = useMessage();

const LevelForm = defineAsyncComponent(() => import("../components/level-form.vue"));

const handleSubmit = async (data: LevelCreateRequest) => {
    try {
        await apiCreateLevel(data);
        message.success($t("membership.console-membership.level.create.submitSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("Create level failed:", error);
    }
};
</script>

<template>
    <div class="level-create-container flex h-full flex-col">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ $t("console-common.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">
                {{ $t("membership.console-membership.level.create.title") }}
            </h1>
        </div>

        <LevelForm @submit-success="handleSubmit" />
    </div>
</template>
