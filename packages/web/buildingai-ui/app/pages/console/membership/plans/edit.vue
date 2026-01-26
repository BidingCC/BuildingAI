<script setup lang="ts">
import {
    apiGetPlanDetail,
    apiUpdatePlan,
    type PlanCreateRequest,
    type PlanUpdateRequest,
} from "@buildingai/service/consoleapi/membership-plan";
import { useRoute, useRouter } from "vue-router";

const message = useMessage();
const router = useRouter();
const route = useRoute();

const planId = computed(() => route.query.id as string);

const PlanForm = defineAsyncComponent(() => import("../components/plan-form.vue"));

// 初始数据
const initialData = ref({});

/** 获取等级详情 */
const { lockFn: getPlanDetail, isLock } = useLockFn(async () => {
    if (!planId.value) {
        message.error($t("membership.console-membership.plan.edit.getDetailFailed"));
        router.back();
        return;
    }

    try {
        const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            status: _status,
            sort: _sort,
            ...response
        } = await apiGetPlanDetail(planId.value);
        // 转换数据格式以适配表单
        initialData.value = {
            ...response,
        };
    } catch (error) {
        console.error("Get level detail failed:", error);
        router.back();
    }
});

/** 处理表单提交 */
const handleSubmit = async (data: PlanCreateRequest) => {
    try {
        await apiUpdatePlan(planId.value, data as PlanUpdateRequest);
        message.success($t("membership.console-membership.plan.edit.submitSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("Update level failed:", error);
    }
};

// 初始化
onMounted(() => getPlanDetail());
</script>

<template>
    <div class="level-edit-container flex h-full flex-col">
        <div
            class="bg-background sticky top-0 z-10 mb-4 flex w-full items-center justify-baseline pb-2"
        >
            <UButton color="neutral" variant="soft" @click="router.back()">
                <UIcon name="i-lucide-arrow-left" class="size-5 cursor-pointer" />
                <span class="text-base font-medium">{{ $t("console-common.back") }}</span>
            </UButton>

            <h1 class="ml-4 text-xl font-bold">
                {{ $t("membership.console-membership.plan.edit.title") }}
            </h1>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLock" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="text-primary-500 h-8 w-8 animate-spin" />
        </div>

        <PlanForm :id="planId" :initialData="initialData" @submit-success="handleSubmit" />
    </div>
</template>
