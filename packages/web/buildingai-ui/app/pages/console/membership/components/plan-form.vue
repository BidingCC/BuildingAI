<script setup lang="ts">
import {
    apiGetLevelList,
    type LevelFormData,
} from "@buildingai/service/consoleapi/membership-level";
import {
    type Billing,
    MembershipPlanDuration,
    type PlanCreateRequest,
} from "@buildingai/service/consoleapi/membership-plan";
import type { FormError } from "@nuxt/ui";
import { number, object, string } from "yup";

const props = defineProps<{
    /** 计划 ID，编辑时传入 */
    id?: string | null;
    /** 初始表单数据 */
    initialData?: Partial<PlanCreateRequest>;
}>();

const emit = defineEmits<{
    "submit-success": [data: PlanCreateRequest];
}>();

/** 订阅时长配置选项 */
const durationOptions = [
    {
        value: MembershipPlanDuration.MONTH,
        label: $t("membership.console-membership.plan.duration.month"),
    },
    {
        value: MembershipPlanDuration.QUARTER,
        label: $t("membership.console-membership.plan.duration.quarter"),
    },
    {
        value: MembershipPlanDuration.YEAR,
        label: $t("membership.console-membership.plan.duration.year"),
    },
    {
        value: MembershipPlanDuration.FOREVER,
        label: $t("membership.console-membership.plan.duration.forever"),
    },
    {
        value: MembershipPlanDuration.CUSTOM,
        label: $t("membership.console-membership.plan.duration.custom"),
    },
];

/** 时间单位选项 */
const durationUnitOptions = [
    { value: "day", label: "天" },
    { value: "month", label: "月" },
    { value: "year", label: "年" },
];

const formData = ref<Partial<PlanCreateRequest>>({
    duration: {
        value: 1,
        unit: "day",
    },
});

/** 会员等级列表 */
const levelList = ref<LevelFormData[]>([]);

/** 是否为编辑模式 */
const isEditMode = computed(() => !!props.id);

/** 会员等级选项（用于下拉选择） */
const levelOptions = computed(() =>
    levelList.value.map((level) => ({
        label: level.name,
        value: level.id,
    })),
);

/**
 * 获取指定行可用的会员等级选项
 * 排除已被其他行选中的等级，保留当前行已选的等级
 * @param currentLevelId 当前行已选中的等级ID
 */
const getAvailableLevelOptions = (currentLevelId: string) => {
    const selectedLevelIds = billingList.value
        .map((item) => item.levelId)
        .filter((id) => id && id !== currentLevelId);

    return levelOptions.value.map((option) => ({
        ...option,
        disabled: selectedLevelIds.includes(option.value),
    }));
};

/** 计费规则列表 */
const billingList = ref<Billing[]>([]);

/** 计费表格列配置 */
const billingColumns = [
    {
        accessorKey: "levelId",
        header: $t("membership.console-membership.level.form.labelName"),
    },
    {
        accessorKey: "salesPrice",
        header: $t("membership.console-membership.plan.form.priceSales"),
    },
    {
        accessorKey: "originalPrice",
        header: $t("membership.console-membership.plan.form.priceOriginal"),
    },
    {
        accessorKey: "label",
        header: $t("membership.console-membership.plan.form.labelTag"),
    },
    {
        accessorKey: "status",
        header: $t("membership.console-membership.plan.form.status"),
    },
    {
        accessorKey: "action",
        header: $t("membership.console-membership.plan.table.actions"),
    },
];

/**
 * 获取会员等级列表
 */
const fetchLevelList = async () => {
    try {
        const res = await apiGetLevelList({ page: 1, pageSize: 100 });
        levelList.value = res.items || [];
    } catch (error) {
        console.error("Failed to fetch level list:", error);
    }
};

/**
 * 监听初始数据变化，用于编辑模式下填充表单
 */
watch(
    () => props.initialData,
    (newData) => {
        if (newData && Object.keys(newData).length > 0) {
            formData.value = {
                ...formData.value,
                ...newData,
                duration: newData.duration ? { ...newData.duration } : { value: 1, unit: "day" },
            };
            billingList.value = newData.billing ? [...newData.billing] : [];
        }
    },
    { immediate: true },
);

/**
 * 添加计费规则
 */
const addBillingRule = () => {
    billingList.value.push({
        levelId: "",
        salesPrice: 0,
        originalPrice: 0,
        label: "",
        status: true,
    });
};

/** 表单验证规则 */
const schema = object({
    name: string().required($t("membership.console-membership.plan.form.labelNamePlaceholder")),
    durationConfig: number().required(
        $t("membership.console-membership.plan.form.labelDurationConfig"),
    ),
});

/**
 * 自定义验证函数
 * @param state 表单状态
 * @returns 验证错误列表
 */
const validate = (state: Partial<PlanCreateRequest>): FormError[] => {
    const errors: FormError[] = [];
    // 当选择自定义时长时，验证 duration.value
    if (state.durationConfig === MembershipPlanDuration.CUSTOM) {
        if (!state.duration?.value || state.duration.value < 1) {
            errors.push({
                name: "duration.value",
                message: $t("membership.console-membership.plan.form.durationValuePlaceholder"),
            });
        }
    }
    return errors;
};

/**
 * 删除计费规则
 * @param index 规则索引
 */
const removeBillingRule = (index: number) => {
    billingList.value.splice(index, 1);
};

/** 是否为自定义时长 */
const isCustomDuration = computed(
    () => formData.value.durationConfig === MembershipPlanDuration.CUSTOM,
);

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        const submitData: PlanCreateRequest = {
            ...formData.value,
            duration: isCustomDuration.value ? formData.value.duration : undefined,
            billing: billingList.value,
        } as PlanCreateRequest;
        emit("submit-success", submitData);
    } catch (error) {
        console.error("Update plan failed:", error);
    }
});

onMounted(() => {
    fetchLevelList();
});
</script>

<template>
    <div class="flex-1">
        <UForm
            :state="formData"
            :schema="schema"
            :validate="validate"
            class="flex h-full flex-col space-y-4"
            @submit="submitForm"
        >
            <UFormField
                :label="$t('membership.console-membership.plan.form.labelName')"
                name="name"
                required
                class="sm:w-sm"
            >
                <UInput
                    class="w-full"
                    v-model="formData.name"
                    :placeholder="
                        $t('membership.console-membership.plan.form.labelNamePlaceholder')
                    "
                />
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.plan.form.labelLabel')"
                name="label"
                class="sm:w-sm"
            >
                <UInput
                    class="w-full"
                    v-model="formData.label"
                    :placeholder="
                        $t('membership.console-membership.plan.form.labelLabelPlaceholder')
                    "
                />
            </UFormField>

            <UFormField
                :label="$t('membership.console-membership.plan.form.labelDurationConfig')"
                name="durationConfig"
                required
            >
                <URadioGroup
                    v-model="formData.durationConfig"
                    :items="durationOptions"
                    orientation="horizontal"
                />
            </UFormField>
            <UFormField v-if="isCustomDuration" name="duration.value" class="sm:w-sm">
                <div class="flex items-center gap-2">
                    <UInput
                        class="flex-1"
                        v-model="formData.duration!.value"
                        type="number"
                        :placeholder="
                            $t('membership.console-membership.plan.form.durationValuePlaceholder')
                        "
                        autocomplete="off"
                        :ui="{
                            root: 'w-full',
                            trailing: 'bg-muted-foreground/15 pl-2 rounded-tr-lg rounded-br-lg',
                            base: '!pr-22',
                        }"
                    >
                        <template #trailing>
                            <div class="flex items-center text-sm" @click.stop.prevent>
                                <USelect
                                    v-model="formData.duration!.unit"
                                    :items="durationUnitOptions"
                                    size="sm"
                                    :ui="{
                                        base: '!ring-0 !bg-muted-foreground/1',
                                        content: 'z-999',
                                    }"
                                />
                            </div>
                        </template>
                    </UInput>
                </div>
            </UFormField>

            <!-- 会员计费表格 -->
            <UFormField
                :label="$t('membership.console-membership.plan.form.labelBilling')"
                name="billing"
            >
                <template #hint>
                    <UButton
                        color="primary"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-plus"
                        @click="addBillingRule"
                    >
                        {{ $t("membership.console-membership.plan.form.addBilling") }}
                    </UButton>
                </template>
                <div class="w-full">
                    <!-- 表格 -->
                    <UTable
                        :columns="billingColumns"
                        :data="billingList"
                        :ui="{
                            base: 'table-fixed border-separate border-spacing-0',
                            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                            td: 'border-b border-default px-2',
                            tr: '[&:has(>td[colspan])]:hidden',
                        }"
                    >
                        <!-- 会员等级 -->
                        <template #levelId-cell="{ row }">
                            <USelect
                                v-model="row.original.levelId"
                                :items="getAvailableLevelOptions(row.original.levelId)"
                                :placeholder="
                                    $t(
                                        'membership.console-membership.plan.form.selectLevelPlaceholder',
                                    )
                                "
                                size="sm"
                                class="w-full"
                            />
                        </template>

                        <!-- 销售价格 -->
                        <template #salesPrice-cell="{ row }">
                            <UInput
                                v-model="row.original.salesPrice"
                                type="number"
                                :placeholder="
                                    $t('membership.console-membership.plan.form.inputPlaceholder')
                                "
                                size="sm"
                                class="w-full"
                            />
                        </template>

                        <!-- 原价 -->
                        <template #originalPrice-cell="{ row }">
                            <UInput
                                v-model="row.original.originalPrice"
                                type="number"
                                placeholder="请输入"
                                size="sm"
                                class="w-full"
                            />
                        </template>

                        <!-- 标签 -->
                        <template #label-cell="{ row }">
                            <UInput
                                v-model="row.original.label"
                                :placeholder="
                                    $t('membership.console-membership.plan.form.inputPlaceholder')
                                "
                                size="sm"
                                class="w-full"
                            />
                        </template>

                        <!-- 状态开关 -->
                        <template #status-cell="{ row }">
                            <div class="flex justify-center">
                                <USwitch v-model="row.original.status" />
                            </div>
                        </template>

                        <!-- 删除操作 -->
                        <template #action-cell="{ row }">
                            <div class="flex justify-center">
                                <UButton
                                    color="error"
                                    variant="ghost"
                                    size="xs"
                                    icon="i-lucide-trash-2"
                                    @click="removeBillingRule(row.index)"
                                />
                            </div>
                        </template>

                        <!-- 空状态 -->
                        <template #empty>
                            <div
                                class="text-muted-foreground flex items-center justify-center py-8 text-sm"
                            >
                                {{ $t("membership.console-membership.plan.form.emptyBilling") }}
                            </div>
                        </template>
                    </UTable>
                </div>
            </UFormField>

            <!-- 操作按钮 -->
            <div class="bg-background sticky bottom-0 flex gap-3 py-4">
                <AccessControl :codes="isEditMode ? ['levels:update'] : ['levels:create']">
                    <UButton color="primary" size="lg" type="submit" :loading="isLock">
                        {{ isEditMode ? $t("console-common.save") : $t("console-common.create") }}
                    </UButton>
                </AccessControl>
            </div>
        </UForm>
    </div>
</template>
