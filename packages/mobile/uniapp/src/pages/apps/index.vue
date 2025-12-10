<script setup lang="ts">
import type { LoginSettings } from "@buildingai/service/consoleapi/login-settings";
import type { WebsiteConfig } from "@buildingai/service/consoleapi/website";

import {
    AnalyseActionType,
    apiGetLoginSettings,
    apiGetSiteConfig,
    apiRecordAnalyse,
} from "@/service/common";

const { t } = useI18n();
const toast = useToast();

definePage({
    style: {
        navigationBarTitle: "pages.apps",
        auth: false,
    },
});

// 响应式数据
const siteConfig = ref<WebsiteConfig | null>(null);
const loginSettings = ref<LoginSettings | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// 获取网站配置
const fetchSiteConfig = async () => {
    try {
        loading.value = true;
        error.value = null;
        const config = await apiGetSiteConfig();
        siteConfig.value = config;
        toast.success("获取网站配置成功");
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "获取网站配置失败";
        error.value = errorMessage;
        toast.error(errorMessage);
        console.error("获取网站配置失败:", err);
    } finally {
        loading.value = false;
    }
};

// 获取登录设置
const fetchLoginSettings = async () => {
    try {
        loading.value = true;
        error.value = null;
        const settings = await apiGetLoginSettings();
        loginSettings.value = settings;
        toast.success("获取登录设置成功");
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "获取登录设置失败";
        error.value = errorMessage;
        toast.error(errorMessage);
        console.error("获取登录设置失败:", err);
    } finally {
        loading.value = false;
    }
};

// 记录行为分析
const recordAnalyse = async () => {
    try {
        loading.value = true;
        error.value = null;
        const result = await apiRecordAnalyse({
            actionType: AnalyseActionType.PAGE_VISIT,
            source: "/pages/apps/index",
            extraData: {
                timestamp: new Date().toISOString(),
            },
        });
        toast.success("记录行为分析成功");
        console.log("行为分析记录结果:", result);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "记录行为分析失败";
        error.value = errorMessage;
        toast.error(errorMessage);
        console.error("记录行为分析失败:", err);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <view class="p-4">
        <view class="mb-4 text-center text-2xl font-bold dark:text-white">
            {{ t("pages.apps") }}
        </view>

        <!-- 错误提示 -->
        <view
            v-if="error"
            class="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-600 dark:bg-red-900 dark:text-red-300"
        >
            {{ error }}
        </view>

        <!-- 操作按钮 -->
        <view class="mb-4 space-y-2">
            <button
                class="w-full rounded-lg bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
                :disabled="loading"
                @click="fetchSiteConfig"
            >
                {{ loading ? "加载中..." : "获取网站配置" }}
            </button>

            <button
                class="w-full rounded-lg bg-green-500 px-4 py-2 text-white disabled:opacity-50"
                :disabled="loading"
                @click="fetchLoginSettings"
            >
                {{ loading ? "加载中..." : "获取登录设置" }}
            </button>

            <button
                class="w-full rounded-lg bg-purple-500 px-4 py-2 text-white disabled:opacity-50"
                :disabled="loading"
                @click="recordAnalyse"
            >
                {{ loading ? "加载中..." : "记录行为分析" }}
            </button>
        </view>

        <!-- 网站配置显示 -->
        <view v-if="siteConfig" class="mb-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <view class="mb-2 text-lg font-bold dark:text-white">网站配置</view>
            <view class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <view>网站名称: {{ siteConfig.webinfo?.name }}</view>
                <view>网站描述: {{ siteConfig.webinfo?.description || "无" }}</view>
                <view>版本: {{ siteConfig.webinfo?.version || "无" }}</view>
                <view>版权: {{ siteConfig.copyright?.displayName || "无" }}</view>
            </view>
        </view>

        <!-- 登录设置显示 -->
        <view v-if="loginSettings" class="mb-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <view class="mb-2 text-lg font-bold dark:text-white">登录设置</view>
            <view class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <view
                    >允许的登录方式:
                    {{ loginSettings.allowedLoginMethods?.join(", ") || "无" }}</view
                >
                <view
                    >允许的注册方式:
                    {{ loginSettings.allowedRegisterMethods?.join(", ") || "无" }}</view
                >
                <view>默认登录方式: {{ loginSettings.defaultLoginMethod }}</view>
                <view>允许多设备登录: {{ loginSettings.allowMultipleLogin ? "是" : "否" }}</view>
                <view>显示政策协议: {{ loginSettings.showPolicyAgreement ? "是" : "否" }}</view>
            </view>
        </view>
    </view>
</template>
