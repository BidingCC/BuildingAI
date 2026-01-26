<script lang="ts" setup>
import { PayConfigPayType, type PayConfigType } from "@buildingai/constants/shared";
import {
    type BooleanNumberType,
    type PayconfigTableData,
} from "@buildingai/service/consoleapi/payconfig";
import {
    apiGetPayconfigList,
    apiUpdatePayconfigStatus,
} from "@buildingai/service/consoleapi/payconfig";

const message = useMessage();
const router = useRouter();
const { t } = useI18n();

const payconfigList = shallowRef<PayconfigTableData[]>([]);

const columns = computed(() => {
    return [
        {
            accessorKey: "logo",
            header: t("payment-config.logo"),
        },
        {
            accessorKey: "payType",
            header: t("payment-config.payType"),
        },
        {
            accessorKey: "name",
            header: t("payment-config.name"),
        },

        {
            accessorKey: "isEnable",
            header: t("payment-config.isEnable"),
        },
        {
            accessorKey: "isDefault",
            header: t("payment-config.isDefault"),
        },
        {
            accessorKey: "sort",
            header: t("payment-config.sort"),
        },
        {
            accessorKey: "action",
            header: t("payment-config.action"),
        },
    ];
});

const updatePayconfigStatus = useThrottleFn(async (id: string, isEnable: BooleanNumberType) => {
    try {
        await apiUpdatePayconfigStatus(id, isEnable);
        message.success(t("system.website.messages.saveSuccess"));
        getPayconfigList();
    } catch (_error) {
        message.error(t("system.website.messages.saveFailed"));
    }
}, 1000);

const getPayconfigList = async () => {
    const data = await apiGetPayconfigList();
    payconfigList.value = data.map(({ id, name, payType, isEnable, logo, isDefault, sort }) => ({
        id,
        name,
        payType,
        isEnable,
        logo,
        isDefault,
        sort,
    }));
};

const edit = (id: string, type: PayConfigType) => {
    router.push({
        path: useRoutePath("system-payconfig:update"),
        query: { id, type },
    });
};

onMounted(() => getPayconfigList());
</script>

<template>
    <div class="system-payConfig p-2">
        <!-- 页面头部 -->
        <div class="mb-6">
            <h1 class="text-secondary-foreground text-2xl font-bold">
                {{ $t("payment-config.title") }}
            </h1>
        </div>
        <UTable
            :columns="columns"
            :data="payconfigList"
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: '[&:has(>td[colspan])]:hidden',
            }"
        >
            <template #logo-cell="{ row }">
                <UAvatar
                    :src="row.original.logo"
                    :alt="
                        row.original.payType === PayConfigPayType.WECHAT
                            ? t('payment-config.wxPay')
                            : t('payment-config.alipayPay')
                    "
                    size="md"
                    :ui="{ root: 'rounded-lg' }"
                />
            </template>
            <template #payType-cell="{ row }">
                {{
                    row.original.payType === PayConfigPayType.WECHAT
                        ? t("payment-config.wxPay")
                        : t("payment-config.aliPay")
                }}
            </template>
            <template #isEnable-cell="{ row }">
                <USwitch
                    :model-value="row.original.isEnable === 1"
                    @update:model-value="updatePayconfigStatus(row.original.id, $event ? 1 : 0)"
                    size="md"
                />
            </template>
            <template #isDefault-cell="{ row }">
                <UBadge
                    v-if="row.original.isDefault === 1"
                    :label="t('console-common.default')"
                    color="success"
                />
                <div v-else></div>
            </template>
            <template #action-cell="{ row }">
                <AccessControl :codes="['system-payconfig:update']">
                    <UButton
                        size="md"
                        variant="ghost"
                        color="primary"
                        @click="edit(row.original.id, row.original.payType)"
                    >
                        {{ $t("console-common.edit") }}
                    </UButton>
                </AccessControl>
            </template>
        </UTable>
    </div>
</template>
