<script lang="ts" setup>
import { apiGetLevelListAll } from "@buildingai/service/consoleapi/membership-level";
import { apiCreateSystemAdjustmentOrder } from "@buildingai/service/consoleapi/order-membership";
import { number, object, string } from "yup";

const props = defineProps<{
    user: { id: string; membershipLevel?: { id: string; name: string } | null } | null;
}>();

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();

const formData = shallowReactive({
    levelId: null as string | null,
    durationType: "custom" as "1" | "3" | "12" | "forever" | "custom",
    customValue: 7,
    customUnit: "day" as "day" | "month" | "year",
});

const levelOptions = shallowRef<{ label: string; value: string | null }[]>([]);

const schema = computed(() =>
    object({
        levelId: string().nullable(),
        durationType: string().required(),
        customValue: number()
            .when("durationType", {
                is: "custom",
                then: (schema) =>
                    schema
                        .required(
                            t("user.backend.membership.adjust.validation.customDurationRequired"),
                        )
                        .min(1, t("user.backend.membership.adjust.validation.customDurationMin")),
                otherwise: (schema) => schema.optional(),
            })
            .nullable(),
    }),
);

const durationOptions = computed(() => [
    { label: t("user.backend.membership.adjust.durationOptions.oneMonth"), value: "1" },
    { label: t("user.backend.membership.adjust.durationOptions.threeMonths"), value: "3" },
    { label: t("user.backend.membership.adjust.durationOptions.oneYear"), value: "12" },
    { label: t("user.backend.membership.adjust.durationOptions.forever"), value: "forever" },
    { label: t("user.backend.membership.adjust.durationOptions.custom"), value: "custom" },
]);

const getLevelList = async () => {
    try {
        const response = await apiGetLevelListAll();
        levelOptions.value = [
            { label: t("user.backend.membership.adjust.noLevel"), value: null },
            ...response
                .filter((level) => level.status)
                .map((level) => ({
                    label: level.name,
                    value: level.id,
                })),
        ];
    } catch (error) {
        console.error("Get level list failed:", error);
        toast.error(t("user.backend.membership.adjust.messages.getLevelListFailed"));
    }
};

const handleConfirm = async () => {
    try {
        if (!props.user?.id) {
            toast.error(t("user.backend.membership.adjust.messages.userIdMissing"));
            return;
        }

        await apiCreateSystemAdjustmentOrder({
            userId: props.user.id,
            levelId: formData.levelId,
            durationType: formData.durationType,
            customValue: formData.durationType === "custom" ? formData.customValue : undefined,
            customUnit: formData.durationType === "custom" ? formData.customUnit : undefined,
        });

        toast.success(t("user.backend.membership.adjust.messages.adjustSuccess"));
        emits("close", true);
    } catch (error) {
        console.error("调整会员失败:", error);
        toast.error(t("user.backend.membership.adjust.messages.adjustFailed"));
    }
};

onMounted(() => {
    getLevelList();
    // 初始化当前用户的会员等级
    if (props.user?.membershipLevel) {
        formData.levelId = props.user.membershipLevel.id;
    }
});
</script>

<template>
    <BdModal
        :title="t('user.backend.membership.adjust.title')"
        :ui="{
            content: 'max-w-md overflow-y-auto h-fit',
        }"
        @close="emits('close', false)"
    >
        <UForm :state="formData" :schema="schema" class="space-y-4" @submit="handleConfirm">
            <UFormField :label="t('user.backend.membership.adjust.levelLabel')" name="levelId">
                <USelectMenu
                    v-model="formData.levelId"
                    :items="levelOptions"
                    value-key="value"
                    :placeholder="t('user.backend.membership.adjust.levelPlaceholder')"
                    size="lg"
                    class="w-full"
                >
                    <template #default>
                        {{
                            levelOptions.find((opt) => opt.value === formData.levelId)?.label ||
                            t("user.backend.membership.adjust.levelPlaceholder")
                        }}
                    </template>
                    <template #item="{ item }">
                        {{ item.label }}
                    </template>
                </USelectMenu>
            </UFormField>

            <UFormField
                v-if="formData.levelId"
                :label="t('user.backend.membership.adjust.durationLabel')"
                name="durationType"
            >
                <URadioGroup
                    v-model="formData.durationType"
                    :items="durationOptions"
                    orientation="horizontal"
                    color="primary"
                    class="flex-wrap"
                />
            </UFormField>

            <UFormField
                v-if="formData.levelId && formData.durationType === 'custom'"
                label=""
                name="customValue"
            >
                <div class="flex items-center gap-2">
                    <UInput
                        v-model.number="formData.customValue"
                        type="number"
                        min="1"
                        size="lg"
                        class="w-24"
                    />
                    <USelectMenu
                        v-model="formData.customUnit"
                        :items="[
                            {
                                label: t('user.backend.membership.adjust.customUnit.day'),
                                value: 'day',
                            },
                            {
                                label: t('user.backend.membership.adjust.customUnit.month'),
                                value: 'month',
                            },
                            {
                                label: t('user.backend.membership.adjust.customUnit.year'),
                                value: 'year',
                            },
                        ]"
                        value-key="value"
                        size="lg"
                        class="w-24"
                    >
                        <template #default>
                            {{
                                formData.customUnit === "day"
                                    ? t("user.backend.membership.adjust.customUnit.day")
                                    : formData.customUnit === "month"
                                      ? t("user.backend.membership.adjust.customUnit.month")
                                      : t("user.backend.membership.adjust.customUnit.year")
                            }}
                        </template>
                        <template #item="{ item }">
                            {{ item.label }}
                        </template>
                    </USelectMenu>
                </div>
            </UFormField>

            <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="soft" @click="emits('close', false)">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" type="submit">
                    {{ t("console-common.confirm") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
