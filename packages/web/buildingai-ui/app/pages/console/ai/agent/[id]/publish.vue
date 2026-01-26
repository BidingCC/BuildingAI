<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";
import { apiGetAgentDetail } from "@buildingai/service/consoleapi/ai-agent";
import type {
    PublishAgentParams,
    PublishConfig,
} from "@buildingai/service/webapi/ai-agent-publish";
import {
    apiPublishAgent,
    apiRegenerateApiKey,
    apiUnpublishAgent,
} from "@buildingai/service/webapi/ai-agent-publish";

import { type PluginView, usePluginSlots } from "@//utils/plugins.utils";

type TabItem = {
    value: string;
    label: string;
    icon?: string;
    component: Component | ReturnType<typeof defineAsyncComponent>;
};

const ApiGuide = defineAsyncComponent(() => import("../components/publish/api-guide.vue"));
const EmbedCode = defineAsyncComponent(() => import("../components/publish/embed-code.vue"));
const PublishSettings = defineAsyncComponent(
    () => import("../components/publish/publish-settings.vue"),
);
const PublishStatus = defineAsyncComponent(
    () => import("../components/publish/publish-status.vue"),
);

const { params: URLQueryParams } = useRoute();
const agentId = computed(() => (URLQueryParams as Record<string, string>).id);
const toast = useMessage();
const { t } = useI18n();

// 状态管理
const loading = shallowRef(false);
const publishing = shallowRef(false);
const agent = shallowRef<Agent>();

// 标签页管理
const activeTab = shallowRef("status");

const tabs = shallowRef<TabItem[]>([
    {
        value: "status",
        label: t("ai-agent.backend.publish.status"),
        icon: "i-lucide-globe",
        component: markRaw(PublishStatus),
    },
    {
        value: "settings",
        label: t("ai-agent.backend.publish.settings"),
        icon: "i-lucide-settings",
        component: markRaw(PublishSettings),
    },
    {
        value: "embed",
        label: t("ai-agent.backend.publish.embed"),
        icon: "i-lucide-code",
        component: markRaw(EmbedCode),
    },
    {
        value: "api",
        label: t("ai-agent.backend.publish.api"),
        icon: "i-lucide-terminal",
        component: markRaw(ApiGuide),
    },
]);

const pluginTabs = usePluginSlots<TabItem>("ai-agent:publish:tabs").value.map(
    (slot: PluginView<{ value: string; label: string; icon?: string }>) => ({
        value: slot.meta?.value,
        label: t(slot.meta?.label as string),
        icon: slot.meta?.icon,
        component: markRaw(slot.component),
    }),
);

console.log(pluginTabs, usePluginSlots<TabItem>("ai-agent:publish:tabs"));

tabs.value = [...tabs.value, ...pluginTabs] as TabItem[];

const currentComponent = computed(() => {
    return tabs.value.find((tab) => tab.value === activeTab.value)?.component;
});

const publishConfig = reactive<PublishConfig>({
    allowOrigins: [],
    rateLimitPerMinute: 60,
    showBranding: true,
    allowDownloadHistory: false,
});

const loadAgentDetail = async () => {
    if (!agentId.value) return;

    try {
        loading.value = true;
        const data = await apiGetAgentDetail(agentId.value);
        agent.value = data;

        if (data.publishConfig) {
            Object.assign(publishConfig, data.publishConfig);
        }
    } catch (error: unknown) {
        console.error("加载智能体信息失败:", error);
    } finally {
        loading.value = false;
    }
};

const handlePublish = async () => {
    if (!agentId.value) return;

    try {
        publishing.value = true;

        const params: PublishAgentParams = {
            publishConfig: { ...publishConfig },
        };

        const result = await apiPublishAgent(agentId.value, params);

        if (agent.value) {
            agent.value.isPublished = true;
            agent.value.publishToken = result.publishToken;
            agent.value.apiKey = result.apiKey;
            agent.value.publishConfig = publishConfig;
        }

        await loadAgentDetail();

        toast.success("智能体发布成功！");

        activeTab.value = "status";
    } catch (error: unknown) {
        console.error("发布智能体失败:", error);
    } finally {
        publishing.value = false;
    }
};

const handleUnpublish = async () => {
    if (!agentId.value) return;

    try {
        publishing.value = true;

        await apiUnpublishAgent(agentId.value);

        if (agent.value) {
            agent.value.isPublished = false;
            agent.value.publishToken = undefined;
            agent.value.apiKey = undefined;
            agent.value.publishConfig = undefined;
        }

        await loadAgentDetail();

        toast.success("已取消发布");
    } catch (error: unknown) {
        console.error("取消发布智能体失败:", error);
    } finally {
        publishing.value = false;
    }
};

const handleRegenerateApiKey = async () => {
    if (!agentId.value) return;

    try {
        const result = await apiRegenerateApiKey(agentId.value);

        if (agent.value) {
            agent.value.apiKey = result.apiKey;
        }

        await loadAgentDetail();

        toast.success("API密钥重新生成成功");
    } catch (error: unknown) {
        console.error("重新生成API密钥失败:", error);
    }
};

const handleConfigUpdate = (newConfig: PublishConfig) => {
    Object.assign(publishConfig, newConfig);
};

const isPublished = computed(() => agent.value?.isPublished || false);

onMounted(() => loadAgentDetail());

definePageMeta({ layout: "full-screen" });
</script>

<template>
    <div class="flex h-full flex-1 flex-col px-4 pt-4">
        <div class="mb-2">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">{{ $t("ai-agent.backend.publish.title") }}</h1>
                    <p class="text-muted-foreground mt-1 text-sm">
                        {{ $t("ai-agent.backend.publish.desc") }}
                    </p>
                </div>
                <!-- 操作按钮 -->
                <div class="flex gap-2">
                    <UButton v-if="!isPublished" :loading="publishing" @click="handlePublish">
                        <UIcon name="i-lucide-globe" class="mr-2 size-4" />
                        {{ $t("ai-agent.backend.publish.publish") }}
                    </UButton>

                    <template v-else>
                        <UButton variant="outline" @click="handleRegenerateApiKey">
                            <UIcon name="i-lucide-refresh-cw" class="mr-2 size-4" />
                            {{ $t("ai-agent.backend.publish.regenerateApiKey") }}
                        </UButton>

                        <UButton
                            color="error"
                            variant="outline"
                            :loading="publishing"
                            @click="handleUnpublish"
                        >
                            <UIcon name="i-lucide-globe-lock" class="mr-2 size-4" />
                            {{ $t("ai-agent.backend.publish.unpublish") }}
                        </UButton>
                    </template>
                </div>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="flex h-64 items-center justify-center">
            <div class="text-muted-foreground flex items-center gap-2">
                <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
                {{ $t("ai-agent.backend.publish.loading") }}
            </div>
        </div>

        <!-- 主要内容 -->
        <div v-else class="flex h-full min-h-0 flex-1 flex-col">
            <!-- 标签页 -->
            <div class="flex border-b">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    :class="[
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                        activeTab === tab.value
                            ? 'border-primary text-primary border-b-2'
                            : 'text-muted-foreground hover:text-foreground',
                    ]"
                    @click="activeTab = tab.value"
                >
                    <UIcon :name="tab.icon as string" class="size-4" />
                    {{ tab.label }}
                </button>
            </div>

            <!-- 标签页内容 -->
            <div class="flex-1 overflow-auto p-4">
                <component
                    v-if="currentComponent"
                    :is="currentComponent"
                    :agent="agent"
                    @update="handleConfigUpdate"
                />
            </div>
        </div>
    </div>
</template>
