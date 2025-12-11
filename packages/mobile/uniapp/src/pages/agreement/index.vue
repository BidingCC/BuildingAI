<script setup lang="ts">
import { apiGetAgreementConfig } from "@/service/common";

const { value: type } = useQuery("url");

const title = shallowRef<string>("");
const content = shallowRef<string>("");

// 获取协议配置
const fetchAgreementConfig = async () => {
    try {
        const { agreement } = await apiGetAgreementConfig();
        switch (type.value) {
            case "service":
                title.value = agreement.serviceTitle || "";
                content.value = agreement.serviceContent || "";
                break;
            case "privacy":
                title.value = agreement.privacyTitle || "";
                content.value = agreement.privacyContent || "";
                break;
            case "payment":
                title.value = agreement.paymentTitle || "";
                content.value = agreement.paymentContent || "";
                break;

            default:
                break;
        }
    } catch (error) {
        console.error("获取协议配置失败：", error);
        useToast().error("获取协议内容失败");
    }
};

definePage({
    style: {
        navigationBarTitle: "pages.agreement",
        auth: false,
    },
});

onMounted(() => {
    fetchAgreementConfig();
});
</script>

<template>
    <template #header>
        <bd-navbar :title="title" :show-back="true" :show-home="true" filter="blur(4px)" />
    </template>
    <view v-if="content" class="p-4 text-sm">
        <rich-text :nodes="content"></rich-text>
    </view>
    <view v-else class="flex h-full items-center justify-center pt-14">
        <text>暂无协议内容</text>
    </view>
</template>
