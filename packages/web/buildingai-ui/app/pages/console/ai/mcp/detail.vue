<script setup lang="ts">
import type { McpServerDetail } from "@buildingai/service/consoleapi/mcp-server";
import {
    apiCheckMcpServerConnect,
    apiGetMcpServerDetail,
} from "@buildingai/service/consoleapi/mcp-server";

const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
}>();

const props = defineProps<{
    id?: string | null;
    isView?: boolean;
    isJsonImport?: boolean;
}>();

const toast = useMessage();
const route = useRoute();
const { t } = useI18n();

const mcpServerId = computed(() => props.id || (route.query.id as string) || null);

type DetailData = Pick<
    McpServerDetail,
    | "id"
    | "name"
    | "providerName"
    | "description"
    | "icon"
    | "isDisabled"
    | "url"
    | "sortOrder"
    | "type"
    | "tools"
    | "connectable"
    | "connectError"
    | "isQuickMenu"
    | "communicationType"
>;

const formData = shallowReactive<DetailData>({
    id: "",
    name: "",
    providerName: "",
    description: "",
    icon: "",
    isDisabled: false,
    url: "",
    sortOrder: 0,
    type: "",
    tools: [],
    connectable: false,
    connectError: "",
    isQuickMenu: false,
    communicationType: "",
});
const reconnecting = shallowRef(false);

const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        const data: McpServerDetail = await apiGetMcpServerDetail(mcpServerId.value as string);
        Object.keys(formData).forEach((key) => {
            const typedKey = key as keyof typeof formData;
            const value = data[typedKey as keyof McpServerDetail];
            if (value !== undefined) {
                // 检查值是否为对象且非空，或者是其他类型的值
                if (typeof value === "object" && value !== null) {
                    if (Object.keys(value).length > 0) {
                        formData[typedKey as keyof typeof formData] = value as never;
                    }
                } else {
                    // 处理原始类型（string, number, boolean等）
                    formData[typedKey as keyof typeof formData] = value as never;
                }
            }
        });
    } catch (error) {
        console.error("获取供应商详情失败:", error);
    }
});

const { lockFn: handleReconnect, isLock: reconnectLoading } = useLockFn(async () => {
    try {
        const res = await apiCheckMcpServerConnect(formData.id);
        if (res.connectable) {
            toast.success(res.message);
            fetchDetail();
            reconnecting.value = true;
        } else {
            toast.error(res.message);
        }
    } catch (error) {
        console.error("重新链接失败:", error);
    }
});

const handleClose = (value: boolean) => {
    emits("close", value);
};

// 转换通信类型显示
const communicationTypeText = computed(() => {
    if (formData.communicationType.includes("-")) {
        return formData.communicationType.replace("-", " ").toUpperCase();
    }
    return formData.communicationType?.toUpperCase();
});

onMounted(async () => mcpServerId.value && (await fetchDetail()));
</script>

<template>
    <BdModal
        :title="t('ai-mcp.backend.detailTitle')"
        :description="t('ai-mcp.backend.detailTitle')"
        :ui="{
            content: 'max-w-2xl overflow-y-auto h-fit',
        }"
        @close="handleClose(reconnecting)"
    >
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 400px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>
        <div v-else class="max-h-200">
            <div class="flex justify-between pb-4">
                <div class="flex items-center gap-4">
                    <UAvatar
                        :src="formData.icon"
                        :alt="formData.name"
                        size="3xl"
                        :ui="{ root: 'rounded-lg' }"
                    />
                    <div>
                        <h3
                            class="text-secondary-foreground flex items-center text-base font-semibold"
                        >
                            <UTooltip :text="formData.name" :delay="0">
                                <span class="line-clamp-1">
                                    {{ formData.name }}
                                </span>
                            </UTooltip>
                        </h3>
                        <UBadge :color="formData.type === 'user' ? 'info' : 'primary'">{{
                            formData.type === "user"
                                ? t("console-common.tab.custom")
                                : t("console-common.tab.system")
                        }}</UBadge>
                    </div>
                </div>
                <UButton
                    v-if="!formData.connectable && formData.type === 'system'"
                    class="h-fit"
                    :loading="reconnectLoading"
                    icon="tabler:reload"
                    :ui="{ leadingIcon: 'size-4' }"
                    variant="soft"
                    size="md"
                    color="error"
                    @click="handleReconnect()"
                >
                    {{ t("ai-mcp.backend.detail.reconnect") }}
                </UButton>
            </div>

            <!-- 描述 -->
            <div class="bg-muted rounded-lg p-4 pb-4">
                <p class="text-muted-foreground text-sm">
                    {{ formData.description || t("ai-mcp.backend.detail.noDescription") }}
                </p>
            </div>

            <!-- 基本信息 -->
            <div class="grid grid-cols-1 gap-x-6 gap-y-4 py-4 pb-4 md:grid-cols-2">
                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.url") }}
                    </div>
                    <UTooltip
                        :ui="{
                            content:
                                'max-w-100 !whitespace-pre-wrap !break-all leading-relaxed h-fit p-2',
                        }"
                        :delay-duration="0"
                    >
                        <template #content>
                            <div class="max-w-100">
                                {{ formData.url }}
                            </div>
                        </template>
                        <div class="text-secondary-foreground mt-1 truncate font-medium">
                            {{ formData.url }}
                        </div>
                    </UTooltip>
                </div>

                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.sortOrder") }}
                    </div>
                    <div class="text-secondary-foreground mt-1 font-medium">
                        {{ formData.sortOrder }}
                    </div>
                </div>
                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.form.isQuickMenu") }}
                    </div>
                    <div class="text-secondary-foreground mt-1 font-medium">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium">
                                {{
                                    formData.isQuickMenu
                                        ? t("ai-mcp.backend.detail.quickMenu")
                                        : t("ai-mcp.backend.detail.normalMenu")
                                }}
                            </span>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.isActive") }}
                    </div>
                    <div class="text-secondary-foreground mt-1 font-medium">
                        <UBadge :color="formData.isDisabled ? 'error' : 'success'">{{
                            formData.isDisabled
                                ? t("ai-mcp.backend.detail.disabled")
                                : t("ai-mcp.backend.detail.enabled")
                        }}</UBadge>
                    </div>
                </div>

                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.connectStatus") }}
                    </div>
                    <div class="text-secondary-foreground mt-1 font-medium">
                        <UBadge :color="formData.connectable ? 'success' : 'error'">{{
                            formData.connectable
                                ? t("ai-mcp.backend.detail.connectSuccess")
                                : t("ai-mcp.backend.detail.connectFailed")
                        }}</UBadge>
                    </div>
                </div>

                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.communicationType") }}
                    </div>
                    <div class="text-secondary-foreground mt-1 font-medium">
                        <UBadge color="neutral" variant="soft">
                            {{ communicationTypeText }}
                        </UBadge>
                    </div>
                </div>

                <div>
                    <div class="text-muted-foreground text-sm">
                        {{ t("ai-mcp.backend.detail.connectError") }}
                    </div>
                    <div v-if="formData.connectError" class="text-error mt-1 text-sm font-medium">
                        {{ formData.connectError }}
                    </div>
                    <div v-else class="mt-1 text-sm font-medium">-</div>
                </div>
            </div>

            <!-- 工具列表 -->
            <div v-if="formData.tools && formData.tools.length > 0" class="pb-4">
                <h4 class="text-secondary-foreground mb-2 text-base font-medium">
                    {{ t("ai-mcp.backend.detail.tools") }}
                </h4>
                <div class="max-h-80 space-y-2 overflow-y-auto">
                    <div
                        v-for="(tool, index) in formData.tools"
                        :key="index"
                        class="border-muted rounded-lg border p-4"
                    >
                        <div class="text-secondary-foreground font-medium">{{ tool.name }}</div>
                        <div class="text-muted-foreground mt-1 text-sm">{{ tool.description }}</div>
                    </div>
                </div>
            </div>
        </div>
    </BdModal>
</template>
