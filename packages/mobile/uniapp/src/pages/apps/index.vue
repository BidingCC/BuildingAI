<script setup lang="ts">
import type { LoginSettings } from "@buildingai/service/consoleapi/login-settings";
import type { WebsiteConfig } from "@buildingai/service/consoleapi/website";

import BdNavbar from "@/async-components/bd-navbar.vue?async";
import {
    AnalyseActionType,
    apiGetLoginSettings,
    apiGetSiteConfig,
    apiRecordAnalyse,
} from "@/service/common";
import Logo from "@/static/logo.png";

const { t } = useI18n();
const router = useRouter();

definePage({
    style: {
        navigationBarTitle: "pages.apps",
        hiddenHeader: true,
    },
});
</script>

<template>
    <view class="flex h-[calc(100vh-112px)] flex-col px-4">
        <BdNavbar
            :title="t('pages.apps')"
            :show-back="false"
            :show-home="false"
            filter="blur(4px)"
        />
        <view bg="muted" p="2" rounded="lg" flex gap="2" items-center my="2">
            <view i-lucide-search></view>
            <input type="text" placeholder="请输入智能体名称" font-size="sm" />
        </view>
        <view flex justify-end gap="2" font-size="sm" text="muted-foreground">
            <view text="primary" flex items-center gap="1">
                最新发布
                <view i-lucide-chevron-down size="3"></view>
            </view>
        </view>
        <view>
            <view border="~ rounded-lg" p="3" bg="background" shadow="sm" my="2">
                <view flex items-center gap="2">
                    <image :src="Logo" size="10" />
                    <view>代码解释器</view>
                    <image :src="Logo" size="4" ml="auto" />

                    <!-- <view text="xs">编辑于2025-12-22</view> -->
                </view>
                <view
                    text="sm muted-foreground"
                    mt="3"
                    border-t-solid
                    border-t-1
                    border-t-gray-200
                    pt="3"
                >
                    代码解释器是一个用于解释代码的工具，它可以帮助你理解代码的含义，并提供代码的解释和优化建议
                </view>
                <view flex justify-between items-center text="xs muted-foreground" mt="2">
                    <view flex items-center gap="1">
                        <view i-lucide-message-square-text size="3"></view>11
                        <view i-lucide-users size="3"></view>11
                    </view>
                    <view mt="2">编辑于2025-12-22</view>
                </view>
            </view>
        </view>
    </view>
</template>
<style>
/* #ifndef H5 */
page {
    background-image:
        url("@/static/images/background.png"),
        linear-gradient(
            to bottom,
            var(--primary-300) 0%,
            var(--primary-200) 10%,
            var(--primary-50) 25%,
            var(--background-soft) 30%,
            var(--background-soft) 100%
        );
    background-size: 100%, cover;
    background-position: top, top;
    background-repeat: no-repeat, no-repeat;
    z-index: 0;
}
/* #endif */
</style>
