<script setup lang="ts">
import {
    apiCreatePlan,
    type PlanCreateRequest,
} from "@buildingai/service/consoleapi/membership-plan";

const message = useMessage();
const router = useRouter();

const PlanForm = defineAsyncComponent(() => import("../components/plan-form.vue"));

const handleSubmit = async (data: PlanCreateRequest) => {
    try {
        await apiCreatePlan(data);
        message.success($t("membership.console-membership.plan.create.submitSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("Create level failed:", error);
    }
};
</script>

<template>
    <div class="level-add-container flex h-full flex-col">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ $t("console-common.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">
                {{ $t("membership.console-membership.plan.create.title") }}
            </h1>
        </div>

        <PlanForm @submit-success="handleSubmit" />
    </div>
</template>
