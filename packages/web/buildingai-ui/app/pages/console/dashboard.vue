<script setup lang="ts">
import { apiGetDashboard } from "@buildingai/service/consoleapi/common";
import type { DashboardData } from "@buildingai/types";
import { type ColorName, getColor } from "@buildingai/web-config/theme";
import { useColorMode } from "@vueuse/core";
import { useI18n } from "vue-i18n";

import { formatCompactNumber } from "@/utils/helper";

const appConfig = useAppConfig();
const colorMode = useColorMode();
const toast = useMessage();
const { t } = useI18n();

const currentColor = computed(() => getColor(appConfig.ui.colors.primary as ColorName, 500));
// 图表中第二组数据的颜色
const secondDataColor = computed(() => "#ffb433");

// Dashboard 数据
const dashboardData = shallowRef<DashboardData | null>(null);
// 数据请求时间
const dataFetchTime = ref<Date | null>(null);

const fetchDashboardData = async () => {
    try {
        // 传递时间范围参数
        const data = await apiGetDashboard({
            userDays: userChartTimeRange.value,
            revenueDays: revenueChartTimeRange.value,
            tokenDays: tokenUsageTimeRange.value,
        });
        dashboardData.value = data;
        // 记录数据请求时间
        dataFetchTime.value = new Date();
    } catch (error) {
        console.error(t("dashboard.errors.fetchFailed"), error);
        toast.error(t("dashboard.errors.fetchFailedMessage"));
    }
};

// 时间范围选择（使用数字类型）
const userChartTimeRange = ref(15);
const revenueChartTimeRange = ref(15);
const tokenUsageTimeRange = ref(15);

// Token 使用排行显示类型（模型/供应商）
const tokenUsageViewType = ref<"model" | "provider">("model");

// 页面加载时获取数据
onMounted(() => {
    fetchDashboardData();
});

// 监听时间范围变化，重新获取数据
watch([userChartTimeRange, revenueChartTimeRange, tokenUsageTimeRange], () => {
    fetchDashboardData();
});

// 时间范围选项
const timeRangeOptions = computed(() => [
    { label: t("dashboard.timeRange.last7Days"), value: 7 },
    { label: t("dashboard.timeRange.last15Days"), value: 15 },
    { label: t("dashboard.timeRange.last30Days"), value: 30 },
]);

/**
 * 获取时间范围的起始日期和结束日期
 */
const getTimeRangeDates = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    return { startDate, endDate: today };
};

// 计算属性：获取各图表的时间范围日期
const userChartTimeRangeDates = computed(() => getTimeRangeDates(userChartTimeRange.value));
const revenueChartTimeRangeDates = computed(() => getTimeRangeDates(revenueChartTimeRange.value));

/**
 * 安全地获取数字值，处理NaN、null、undefined
 */
const safeNumber = (value: number | null | undefined): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

/**
 * 根据百分比和今天数据计算变化量
 */
const calculateChange = (todayValue: number, changePercent: number): number => {
    // 确保输入是有效数字
    const today = safeNumber(todayValue);
    const change = safeNumber(changePercent);

    // 如果变化百分比为0，返回0
    if (change === 0) return 0;

    // 昨天数据 = 今天数据 / (1 + 变化百分比/100)
    // 变化量 = 今天数据 - 昨天数据
    const yesterdayValue = today / (1 + change / 100);
    const result = today - yesterdayValue;

    // 确保结果不是NaN或Infinity
    return safeNumber(result);
};

// 用户详细数据图表配置
const userDetailChartOptions = computed(() => {
    const chartData = dashboardData.value?.userDetail?.chartData || [];
    return {
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
            },
        },
        legend: {
            data: [t("dashboard.chart.visit"), t("dashboard.chart.register")],
        },
        grid: {
            top: 10,
            left: 18,
            right: 18,
            bottom: 10,
            containLabel: true,
        },
        xAxis: [
            {
                type: "category",
                data: chartData.map((item) => {
                    const date = new Date(item.date);
                    return `${date.getMonth() + 1}-${date.getDate()}`;
                }),
                boundaryGap: false,
                axisLine: {
                    lineStyle: {
                        color: "#999",
                    },
                },
                axisLabel: {
                    interval: 3,
                    align: "center",
                    formatter: function (value: string) {
                        return value;
                    },
                    boundaryGap: false,
                },
            },
        ],
        yAxis: [
            {
                type: "value",
                splitNumber: 4,
                splitLine: {
                    lineStyle: {
                        color: colorMode.value === "dark" ? "#1e1e1e" : "#f7f7f7",
                    },
                },
                axisLine: {
                    show: false,
                },
                axisLabel: {
                    show: false,
                },
                splitArea: {
                    show: false,
                },
            },
        ],
        series: [
            {
                name: t("dashboard.chart.visit"),
                type: "line",
                data: chartData.map((item) => item.visit),
                emphasis: {
                    itemStyle: { color: currentColor.value },
                    lineStyle: { color: currentColor.value },
                    areaStyle: { color: currentColor.value },
                },
                lineStyle: {
                    width: 4,
                    color: {
                        type: "linear",
                        colorStops: [
                            {
                                offset: 0,
                                color: currentColor.value,
                            },
                            {
                                offset: 1,
                                color: currentColor.value,
                            },
                        ],
                        globalCoord: true,
                    },
                },
                symbol: "circle",
                symbolSize: 8,
                itemStyle: {
                    color: currentColor.value,
                    borderWidth: 2,
                    borderColor: "#fff",
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: currentColor.value,
                            },
                            {
                                offset: 1,
                                color: currentColor.value,
                            },
                        ],
                    },
                    opacity: 0.1,
                },
                smooth: true,
            },
            {
                name: t("dashboard.chart.register"),
                type: "line",
                data: chartData.map((item) => item.register),
                emphasis: {
                    itemStyle: { color: secondDataColor.value },
                    lineStyle: { color: secondDataColor.value },
                    areaStyle: { color: secondDataColor.value },
                },
                lineStyle: {
                    width: 4,
                    color: secondDataColor.value,
                },
                symbol: "circle",
                symbolSize: 8,
                itemStyle: {
                    color: secondDataColor.value,
                    borderWidth: 2,
                    borderColor: "#fff",
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: secondDataColor.value,
                            },
                            {
                                offset: 1,
                                color: secondDataColor.value,
                            },
                        ],
                    },
                    opacity: 0.1,
                },
                smooth: true,
            },
        ],
    };
});

// 收入详细数据图表配置
const revenueDetailChartOptions = computed(() => {
    const chartData = dashboardData.value?.revenueDetail?.chartData || [];
    return {
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
            },
        },
        legend: {
            data: [t("dashboard.chart.revenue"), t("dashboard.chart.order")],
        },
        grid: {
            top: 10,
            left: 18,
            right: 18,
            bottom: 10,
            containLabel: true,
        },
        xAxis: [
            {
                type: "category",
                data: chartData.map((item) => {
                    const date = new Date(item.date);
                    return `${date.getMonth() + 1}-${date.getDate()}`;
                }),
                boundaryGap: false,
                axisLine: {
                    lineStyle: {
                        color: "#999",
                    },
                },
                axisLabel: {
                    interval: 3,
                    align: "center",
                    formatter: function (value: string) {
                        return value;
                    },
                    boundaryGap: false,
                },
            },
        ],
        yAxis: [
            {
                type: "value",
                name: t("dashboard.chart.revenue"),
                position: "left",
                splitNumber: 4,
                splitLine: {
                    lineStyle: {
                        color: colorMode.value === "dark" ? "#1e1e1e" : "#f7f7f7",
                    },
                },
                axisLine: {
                    show: false,
                },
                axisLabel: {
                    show: false,
                },
                splitArea: {
                    show: false,
                },
            },
            {
                type: "value",
                name: t("dashboard.chart.order"),
                position: "right",
                splitNumber: 4,
                splitLine: {
                    show: false,
                },
                axisLine: {
                    show: false,
                },
                axisLabel: {
                    show: false,
                },
                splitArea: {
                    show: false,
                },
            },
        ],
        series: [
            {
                name: t("dashboard.chart.revenue"),
                type: "line",
                yAxisIndex: 0,
                data: chartData.map((item) => item.revenue),
                emphasis: {
                    itemStyle: { color: currentColor.value },
                    lineStyle: { color: currentColor.value },
                    areaStyle: { color: currentColor.value },
                },
                lineStyle: {
                    width: 4,
                    color: {
                        type: "linear",
                        colorStops: [
                            {
                                offset: 0,
                                color: currentColor.value,
                            },
                            {
                                offset: 1,
                                color: currentColor.value,
                            },
                        ],
                        globalCoord: true,
                    },
                },
                symbol: "circle",
                symbolSize: 8,
                itemStyle: {
                    color: currentColor.value,
                    borderWidth: 2,
                    borderColor: "#fff",
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: currentColor.value,
                            },
                            {
                                offset: 1,
                                color: currentColor.value,
                            },
                        ],
                    },
                    opacity: 0.1,
                },
                smooth: true,
            },
            {
                name: t("dashboard.chart.order"),
                type: "line",
                yAxisIndex: 1,
                data: chartData.map((item) => item.orders),
                emphasis: {
                    itemStyle: { color: secondDataColor.value },
                    lineStyle: { color: secondDataColor.value },
                    areaStyle: { color: secondDataColor.value },
                },
                lineStyle: {
                    width: 4,
                    color: secondDataColor.value,
                },
                symbol: "circle",
                symbolSize: 8,
                itemStyle: {
                    color: secondDataColor.value,
                    borderWidth: 2,
                    borderColor: "#fff",
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: secondDataColor.value,
                            },
                            {
                                offset: 1,
                                color: secondDataColor.value,
                            },
                        ],
                    },
                    opacity: 0.1,
                },
                smooth: true,
            },
        ],
    };
});
</script>

<template>
    <BdScrollArea :shadow="false" class="h-[calc(100svh-5rem)]">
        <div class="flex h-[calc(100svh-5rem)] flex-col space-y-4 pb-6">
            <!-- 数据概览卡片 -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <!-- 用户统计 -->
                <UCard>
                    <template #header>
                        <div class="mb-1 flex items-center justify-between">
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center font-medium">
                                    {{ t("dashboard.userStats.title") }}
                                </div>
                                <div class="mb-1 flex items-center gap-1 text-gray-400">
                                    <UIcon name="i-lucide-info" class="size-3" />
                                    <TimeDisplay
                                        v-if="dataFetchTime"
                                        :datetime="dataFetchTime"
                                        mode="datetime"
                                        class="text-xs"
                                    />
                                </div>
                            </div>
                            <div class="flex flex-col items-center justify-end gap-1">
                                <UIcon
                                    :name="
                                        safeNumber(dashboardData?.user.userChange) >= 0
                                            ? 'i-lucide-trending-up'
                                            : 'i-lucide-trending-down'
                                    "
                                    :class="
                                        safeNumber(dashboardData?.user.userChange) >= 0
                                            ? 'text-primary size-7'
                                            : 'size-7 text-red-500'
                                    "
                                />
                                <span class="text-xs text-gray-400">
                                    {{
                                        safeNumber(dashboardData?.user.userChange) >= 0
                                            ? t("dashboard.userStats.increase")
                                            : t("dashboard.userStats.decrease")
                                    }}
                                    <span
                                        :class="
                                            safeNumber(dashboardData?.user.userChange) >= 0
                                                ? 'text-primary'
                                                : 'text-red-500'
                                        "
                                        class="text-base font-medium"
                                    >
                                        {{
                                            Math.round(
                                                Math.abs(
                                                    calculateChange(
                                                        dashboardData?.user.newUsersToday ?? 0,
                                                        safeNumber(dashboardData?.user.userChange),
                                                    ),
                                                ),
                                            )
                                        }}
                                    </span>
                                    {{ t("dashboard.userStats.unit") }}
                                </span>
                            </div>
                        </div>
                    </template>
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.userStats.todayNew")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.user.newUsersToday || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.userStats.activeUsers")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.user.activeUsers || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.userStats.totalUsers")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.user.totalUsers || 0
                            }}</span>
                        </div>
                    </div>
                </UCard>

                <!-- 订单统计 -->
                <UCard>
                    <template #header>
                        <div class="mb-1 flex items-center justify-between">
                            <div class="flex flex-col gap-2">
                                <div class="font -medium flex items-center">
                                    {{ t("dashboard.orderStats.title") }}
                                </div>
                                <div class="mb-1 flex items-center gap-1 text-gray-400">
                                    <UIcon name="i-lucide-info" class="size-3" />
                                    <TimeDisplay
                                        v-if="dataFetchTime"
                                        :datetime="dataFetchTime"
                                        mode="datetime"
                                        class="text-xs"
                                    />
                                </div>
                            </div>
                            <div class="flex flex-col items-center justify-end gap-1">
                                <UIcon
                                    :name="
                                        safeNumber(dashboardData?.order.orderChange) >= 0
                                            ? 'i-lucide-trending-up'
                                            : 'i-lucide-trending-down'
                                    "
                                    :class="
                                        safeNumber(dashboardData?.order.orderChange) >= 0
                                            ? 'text-primary size-7'
                                            : 'size-7 text-red-500'
                                    "
                                />
                                <span class="text-xs text-gray-400">
                                    {{
                                        safeNumber(dashboardData?.order.orderChange) >= 0
                                            ? t("dashboard.orderStats.increase")
                                            : t("dashboard.orderStats.decrease")
                                    }}
                                    <span
                                        :class="
                                            safeNumber(dashboardData?.order.orderChange) >= 0
                                                ? 'text-primary'
                                                : 'text-red-500'
                                        "
                                        class="text-base font-medium"
                                    >
                                        {{
                                            Math.round(
                                                Math.abs(
                                                    calculateChange(
                                                        dashboardData?.order.ordersToday ?? 0,
                                                        safeNumber(
                                                            dashboardData?.order.orderChange,
                                                        ),
                                                    ),
                                                ),
                                            )
                                        }}
                                    </span>
                                    {{ t("dashboard.orderStats.unit") }}
                                </span>
                            </div>
                        </div>
                    </template>
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.orderStats.todayOrders")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.order.ordersToday || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.orderStats.totalOrders")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.order.totalOrders || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.orderStats.totalAmount")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.order.totalAmount || 0
                            }}</span>
                        </div>
                    </div>
                </UCard>

                <!-- 对话统计 -->
                <UCard>
                    <template #header>
                        <div class="mb-1 flex items-center justify-between">
                            <div class="flex flex-col gap-2">
                                <div class="font -medium flex items-center">
                                    {{ t("dashboard.chatStats.title") }}
                                </div>
                                <div class="mb-1 flex items-center gap-1 text-gray-400">
                                    <UIcon name="i-lucide-info" class="size-3" />
                                    <TimeDisplay
                                        v-if="dataFetchTime"
                                        :datetime="dataFetchTime"
                                        mode="datetime"
                                        class="text-xs"
                                    />
                                </div>
                            </div>
                            <div class="flex flex-col items-center justify-end gap-1">
                                <UIcon
                                    :name="
                                        safeNumber(dashboardData?.chat.chatChange) >= 0
                                            ? 'i-lucide-trending-up'
                                            : 'i-lucide-trending-down'
                                    "
                                    :class="
                                        safeNumber(dashboardData?.chat.chatChange) >= 0
                                            ? 'text-primary size-7'
                                            : 'size-7 text-red-500'
                                    "
                                />
                                <span class="text-xs text-gray-400">
                                    {{
                                        safeNumber(dashboardData?.chat.chatChange) >= 0
                                            ? t("dashboard.chatStats.increase")
                                            : t("dashboard.chatStats.decrease")
                                    }}
                                    <span
                                        :class="
                                            safeNumber(dashboardData?.chat.chatChange) >= 0
                                                ? 'text-primary'
                                                : 'text-red-500'
                                        "
                                        class="text-base font-medium"
                                    >
                                        {{
                                            Math.round(
                                                Math.abs(
                                                    calculateChange(
                                                        dashboardData?.chat.conversationsToday ?? 0,
                                                        safeNumber(dashboardData?.chat.chatChange),
                                                    ),
                                                ),
                                            )
                                        }}
                                    </span>
                                    {{ t("dashboard.chatStats.unit") }}
                                </span>
                            </div>
                        </div>
                    </template>
                    <div class="space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.chatStats.todayConversations")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.chat.conversationsToday || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.chatStats.totalConversations")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                dashboardData?.chat.totalConversations || 0
                            }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{
                                t("dashboard.chatStats.totalTokens")
                            }}</span>
                            <span class="text-lg font-bold">{{
                                formatCompactNumber(dashboardData?.chat.totalTokens || 0)
                            }}</span>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- 图表展示区域 - 左 2 右 2 布局 -->
            <div class="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-3">
                <!-- 左侧：两个图表垂直排列 -->
                <div class="space-y-4 lg:col-span-2">
                    <!-- 用户访问与注册趋势 -->
                    <UCard>
                        <template #header>
                            <div class="mb-1 flex items-center justify-between">
                                <h3 class="text-lg font-medium">
                                    {{ t("dashboard.chartTitles.userTrend") }}
                                </h3>
                                <USelect v-model="userChartTimeRange" :items="timeRangeOptions" />
                            </div>
                            <div class="mb-1 flex items-center gap-1 text-gray-400">
                                <UIcon name="i-lucide-info" class="size-3" />
                                <span class="flex items-center gap-1 text-xs">
                                    <TimeDisplay
                                        :datetime="userChartTimeRangeDates.startDate"
                                        mode="date"
                                        class="text-xs"
                                    />
                                    -
                                    <TimeDisplay
                                        :datetime="userChartTimeRangeDates.endDate"
                                        mode="date"
                                        class="text-xs"
                                    />
                                </span>
                            </div>
                        </template>
                        <div class="h-80">
                            <BdEcharts :options="userDetailChartOptions" height="100%" />
                        </div>
                    </UCard>

                    <!-- 收入与订单趋势 -->
                    <UCard>
                        <template #header>
                            <div class="mb-1 flex items-center justify-between">
                                <h3 class="text-lg font-medium">
                                    {{ t("dashboard.chartTitles.revenueTrend") }}
                                </h3>
                                <USelect
                                    v-model="revenueChartTimeRange"
                                    :items="timeRangeOptions"
                                />
                            </div>
                            <div class="mb-1 flex items-center gap-1 text-gray-400">
                                <UIcon name="i-lucide-info" class="size-3" />
                                <span class="flex items-center gap-1 text-xs">
                                    <TimeDisplay
                                        :datetime="revenueChartTimeRangeDates.startDate"
                                        mode="date"
                                        class="text-xs"
                                    />
                                    -
                                    <TimeDisplay
                                        :datetime="revenueChartTimeRangeDates.endDate"
                                        mode="date"
                                        class="text-xs"
                                    />
                                </span>
                            </div>
                        </template>
                        <div class="h-80">
                            <BdEcharts :options="revenueDetailChartOptions" height="100%" />
                        </div>
                    </UCard>
                </div>

                <!-- 右侧：两个排行卡片垂直排列 -->
                <div class="flex flex-col gap-4">
                    <!-- Token 使用排行 -->
                    <UCard class="flex flex-1 flex-col overflow-hidden" :ui="{ body: 'h-full' }">
                        <template #header>
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-medium">
                                    {{ t("dashboard.ranking.tokenUsage") }}
                                </h3>
                                <UTabs
                                    v-model="tokenUsageViewType"
                                    :items="[
                                        { label: t('dashboard.ranking.model'), value: 'model' },
                                        {
                                            label: t('dashboard.ranking.provider'),
                                            value: 'provider',
                                        },
                                    ]"
                                    size="sm"
                                />
                            </div>
                        </template>
                        <div class="h-full min-h-0 flex-1">
                            <BdScrollArea class="h-full">
                                <!-- 按模型显示 -->
                                <div v-if="tokenUsageViewType === 'model'" class="space-y-2">
                                    <div
                                        v-for="(
                                            item, index
                                        ) in dashboardData?.tokenUsage?.byModel.slice(0, 10)"
                                        :key="item.modelId"
                                        class="hover:bg-muted flex items-center justify-between rounded-lg px-1 py-2"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-400"
                                                >#{{ index + 1 }}</span
                                            >
                                            <img
                                                v-if="item.iconUrl"
                                                :src="item.iconUrl"
                                                :alt="item.providerName"
                                                class="size-8 rounded"
                                            />
                                            <div>
                                                <div class="text-sm font-medium">
                                                    {{ item.modelName }}
                                                </div>
                                                <div class="text-xs text-gray-400">
                                                    {{ item.providerName }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-sm font-medium">
                                                {{ formatCompactNumber(item.tokens) }}
                                            </div>
                                            <div class="text-xs text-gray-400">
                                                {{ item.conversations }}
                                                {{ t("dashboard.ranking.conversations") }}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        v-if="
                                            !dashboardData?.tokenUsage?.byModel ||
                                            dashboardData.tokenUsage.byModel.length === 0
                                        "
                                        class="py-8 text-center text-gray-400"
                                    >
                                        {{ t("dashboard.ranking.noData") }}
                                    </div>
                                </div>
                                <!-- 按供应商显示 -->
                                <div v-else class="space-y-2">
                                    <div
                                        v-for="(
                                            item, index
                                        ) in dashboardData?.tokenUsage?.byProvider.slice(0, 10)"
                                        :key="item.providerId"
                                        class="hover:bg-muted flex items-center justify-between rounded-lg px-1 py-2"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-400"
                                                >#{{ index + 1 }}</span
                                            >
                                            <img
                                                v-if="item.iconUrl"
                                                :src="item.iconUrl"
                                                :alt="item.providerName"
                                                class="size-8 rounded"
                                            />
                                            <div>
                                                <div class="text-sm font-medium">
                                                    {{ item.providerName }}
                                                </div>
                                                <div class="text-xs text-gray-400">
                                                    {{ item.provider }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-sm font-medium">
                                                {{ formatCompactNumber(item.tokens) }}
                                            </div>
                                            <div class="text-xs text-gray-400">
                                                {{ item.conversations }}
                                                {{ t("dashboard.ranking.conversations") }}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        v-if="
                                            !dashboardData?.tokenUsage?.byProvider ||
                                            dashboardData.tokenUsage.byProvider.length === 0
                                        "
                                        class="py-8 text-center text-gray-400"
                                    >
                                        {{ t("dashboard.ranking.noData") }}
                                    </div>
                                </div>
                            </BdScrollArea>
                        </div>
                    </UCard>

                    <!-- 插件使用排行 -->
                    <UCard class="flex flex-1 flex-col overflow-hidden" :ui="{ body: 'h-full' }">
                        <template #header>
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-medium">
                                    {{ t("dashboard.ranking.extensionUsage") }}
                                </h3>
                            </div>
                        </template>
                        <div class="h-full min-h-0 flex-1">
                            <BdScrollArea class="h-full">
                                <div class="space-y-2">
                                    <div
                                        class="mb-2 flex items-center justify-between px-2 text-sm"
                                    >
                                        <span class="text-gray-400"
                                            >{{ t("dashboard.ranking.totalExtensions")
                                            }}{{ dashboardData?.extension?.totalCount || 0 }}</span
                                        >
                                        <span class="text-gray-400"
                                            >{{ t("dashboard.ranking.enabledExtensions")
                                            }}{{
                                                dashboardData?.extension?.enabledCount || 0
                                            }}</span
                                        >
                                    </div>
                                    <div
                                        v-for="(item, index) in dashboardData?.extension
                                            ?.usageRanking"
                                        :key="item.extensionId"
                                        class="flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-400"
                                                >#{{ index + 1 }}</span
                                            >
                                            <div class="text-sm font-medium">
                                                {{ item.extensionName }}
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-sm font-medium">
                                                {{ item.usageCount }}
                                            </div>
                                            <div class="text-xs text-gray-400">
                                                {{ t("dashboard.ranking.usageCount") }}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        v-if="
                                            !dashboardData?.extension?.usageRanking ||
                                            dashboardData.extension.usageRanking.length === 0
                                        "
                                        class="py-8 text-center text-gray-400"
                                    >
                                        {{ t("dashboard.ranking.noData") }}
                                    </div>
                                </div>
                            </BdScrollArea>
                        </div>
                    </UCard>
                </div>
            </div>
        </div>
    </BdScrollArea>
</template>
