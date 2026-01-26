<script lang="ts" setup>
import {
    apiGetLevelDetail,
    apiUpdateLevel,
    type LevelCreateRequest,
    type LevelUpdateRequest,
} from "@buildingai/service/consoleapi/membership-level";
import { useRoute, useRouter } from "vue-router";
const router = useRouter();
const route = useRoute();
const message = useMessage();

const levelId = computed(() => route.query.id as string);

const levelForm = defineAsyncComponent(() => import("../components/level-form.vue"));

// 初始数据
const initialData = ref({});

/** 获取等级详情 */
const { lockFn: getLevelDetail, isLock } = useLockFn(async () => {
    if (!levelId.value) {
        message.error($t("membership.console-membership.level.edit.getDetailFailed"));
        router.back();
        return;
    }

    try {
        const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            status: _status,
            ...response
        } = await apiGetLevelDetail(levelId.value);
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
const handleSubmit = async (data: LevelCreateRequest) => {
    try {
        await apiUpdateLevel(levelId.value, data as LevelUpdateRequest);
        message.success($t("membership.console-membership.level.edit.submitSuccess"));
        setTimeout(() => router.back(), 1000);
    } catch (error) {
        console.error("Update level failed:", error);
    }
};

// 初始化
onMounted(() => getLevelDetail());
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
                {{ $t("membership.console-membership.level.edit.title") }}
            </h1>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLock" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="text-primary-500 h-8 w-8 animate-spin" />
        </div>

        <levelForm
            v-else
            :id="levelId"
            :initial-data="initialData"
            @submit-success="handleSubmit"
        />
    </div>
</template>
