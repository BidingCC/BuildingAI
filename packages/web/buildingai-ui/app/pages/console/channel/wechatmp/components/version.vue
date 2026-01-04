<script setup lang="ts">
import {
    apiGetLatestSourceMap,
    apiGetMpVersionHistory,
    type WxMpVersion,
    WxMpVersionStatus,
    WxMpVersionType,
} from "@buildingai/service/consoleapi/mpversion";
import { computed, h, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";

import type { TableColumn } from "#ui/types";

const UBadge = resolveComponent("UBadge");
const TimeDisplay = resolveComponent("TimeDisplay");
const UButton = resolveComponent("UButton");

const UploadVersionModal = defineAsyncComponent(
    () => import("./components/upload-version-modal.vue"),
);
const PreviewVersionModal = defineAsyncComponent(
    () => import("./components/preview-version-modal.vue"),
);

const { t } = useI18n();
const message = useMessage();
const overlay = useOverlay();

// 筛选条件
const searchForm = reactive<{
    type?: WxMpVersionType;
}>({
    type: undefined,
});

// 使用 usePaging hook 管理分页
const { paging, getLists } = usePaging({
    fetchFun: apiGetMpVersionHistory,
    params: searchForm,
});

// 打开上传版本弹窗
const handleOpenUploadModal = async () => {
    const modal = overlay.create(UploadVersionModal);
    const instance = modal.open();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

// 打开预览版本弹窗
const handleOpenPreviewModal = async () => {
    const modal = overlay.create(PreviewVersionModal);
    const instance = modal.open();
    const shouldRefresh = await instance.result;
    if (shouldRefresh) {
        getLists();
    }
};

// 下载 SourceMap
const { lockFn: handleDownloadSourceMap, isLock: isDownloadingSourceMap } = useLockFn(async () => {
    try {
        const result = await apiGetLatestSourceMap();
        // 创建下载链接
        const link = document.createElement("a");
        link.href = result.sourceMapUrl;
        link.download = `sourcemap-${result.version}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success(t("channel.wechatMP.version.messages.downloadSourceMapSuccess"));
    } catch (error) {
        console.error("Download sourcemap failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        message.error(
            errorMessage || t("channel.wechatMP.version.messages.downloadSourceMapFailed"),
        );
    }
});

// 表格列定义
const columns = computed<TableColumn<WxMpVersion>[]>(() => [
    {
        accessorKey: "version",
        header: t("channel.wechatMP.version.table.version"),
        cell: ({ row }) => {
            return h("div", { class: "font-medium" }, row.getValue("version") as string);
        },
    },
    {
        accessorKey: "type",
        header: t("channel.wechatMP.version.table.type"),
        cell: ({ row }) => {
            const type = row.getValue("type") as WxMpVersionType;
            return h(
                UBadge,
                {
                    variant: "soft",
                    color: type === WxMpVersionType.UPLOAD ? "success" : "warning",
                },
                () => getTypeText(type),
            );
        },
    },
    {
        accessorKey: "status",
        header: t("channel.wechatMP.version.table.status"),
        cell: ({ row }) => {
            const status = row.getValue("status") as WxMpVersionStatus;
            return h(
                UBadge,
                {
                    color: getStatusColor(status),
                },
                () => getStatusText(status),
            );
        },
    },
    {
        accessorKey: "description",
        header: t("channel.wechatMP.version.table.description"),
        cell: ({ row }) => {
            const description = row.getValue("description") as string;
            return h("div", { class: "max-w-xs truncate" }, description || "-");
        },
    },
    {
        accessorKey: "uploaderName",
        header: t("channel.wechatMP.version.table.uploaderName"),
        cell: ({ row }) => {
            const uploaderName = row.getValue("uploaderName") as string;
            return h("div", {}, uploaderName || "-");
        },
    },
    {
        accessorKey: "createdAt",
        header: t("channel.wechatMP.version.table.createdAt"),
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
    {
        id: "actions",
        header: t("console-common.operation"),
        size: 100,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            const version = row.original as WxMpVersion;
            const actions = [];

            // 如果有二维码URL，显示预览按钮
            if (version.qrcodeUrl && version.status === WxMpVersionStatus.SUCCESS) {
                actions.push(
                    h(UButton, {
                        icon: "i-lucide-qr-code",
                        color: "primary",
                        variant: "ghost",
                        size: "xs",
                        label: t("channel.wechatMP.version.table.preview"),
                        onClick: () => {
                            if (version.qrcodeUrl) {
                                handlePreviewQrcode(version.qrcodeUrl);
                            }
                        },
                    }),
                );
            }

            return h("div", { class: "flex items-center gap-1" }, actions);
        },
    },
]);

// 获取状态标签颜色
const getStatusColor = (status: WxMpVersionStatus) => {
    switch (status) {
        case WxMpVersionStatus.SUCCESS:
            return "success";
        case WxMpVersionStatus.FAILED:
            return "error";
        case WxMpVersionStatus.UPLOADING:
            return "warning";
        default:
            return "neutral";
    }
};

// 获取类型标签文本
const getTypeText = (type: WxMpVersionType) => {
    return type === WxMpVersionType.UPLOAD
        ? t("channel.wechatMP.version.type.upload")
        : t("channel.wechatMP.version.type.preview");
};

// 获取状态文本
const getStatusText = (status: WxMpVersionStatus) => {
    switch (status) {
        case WxMpVersionStatus.SUCCESS:
            return t("channel.wechatMP.version.status.success");
        case WxMpVersionStatus.FAILED:
            return t("channel.wechatMP.version.status.failed");
        case WxMpVersionStatus.UPLOADING:
            return t("channel.wechatMP.version.status.uploading");
        default:
            return "-";
    }
};

// 类型筛选变化
const handleTypeChange = () => {
    paging.page = 1;
    getLists();
};

// 预览二维码
const handlePreviewQrcode = (qrcodeUrl: string) => {
    useModal({
        title: "",
        description: "",
        content: h("div", { class: "text-center" }, [
            h("img", {
                src: qrcodeUrl,
                alt: "Preview QR Code",
                class: "mx-auto max-w-xs rounded-lg mt-3",
            }),
            h("p", { class: "mt-4 text-sm text-muted" }, [
                t("channel.wechatMP.version.preview.qrcodeTip"),
            ]),
        ]),
        showCancel: false,
        confirmText: t("console-common.close"),
        ui: { content: "max-w-md" },
    });
};

onMounted(() => {
    getLists();
});
</script>

<template>
    <div class="wechatmp-version flex h-full flex-col space-y-6">
        <!-- 提示信息 -->
        <UAlert
            color="error"
            variant="soft"
            :title="t('channel.wechatMP.version.alert.title')"
            :description="t('channel.wechatMP.version.alert.description')"
            icon="i-lucide-info"
        />
        <!-- 操作区域 - 横向排列 -->
        <div class="flex flex-wrap items-start gap-4">
            <!-- 上传版本 -->
            <UButton color="primary" size="lg" @click="handleOpenUploadModal">
                {{ t("channel.wechatMP.version.upload.button") }}
            </UButton>

            <!-- 预览版本 -->
            <UButton color="primary" variant="outline" size="lg" @click="handleOpenPreviewModal">
                {{ t("channel.wechatMP.version.preview.button") }}
            </UButton>

            <!-- SourceMap 下载 -->
            <UButton
                color="primary"
                variant="outline"
                size="lg"
                :loading="isDownloadingSourceMap"
                :disabled="isDownloadingSourceMap"
                @click="handleDownloadSourceMap"
            >
                {{ t("channel.wechatMP.version.sourcemap.button") }}
            </UButton>
        </div>

        <!-- 版本历史表格 - 全屏显示 -->
        <div class="flex flex-1 flex-col overflow-hidden">
            <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                    {{ t("channel.wechatMP.version.history.title") }}
                </h3>
                <div class="flex items-center gap-4">
                    <USelect
                        v-model="searchForm.type"
                        :items="[
                            { label: t('channel.wechatMP.version.filter.all'), value: undefined },
                            {
                                label: t('channel.wechatMP.version.filter.upload'),
                                value: WxMpVersionType.UPLOAD,
                            },
                            {
                                label: t('channel.wechatMP.version.filter.preview'),
                                value: WxMpVersionType.PREVIEW,
                            },
                        ]"
                        label-key="label"
                        value-key="value"
                        :placeholder="t('channel.wechatMP.version.filter.all')"
                        @change="handleTypeChange"
                    />
                    <UButton
                        color="neutral"
                        variant="ghost"
                        @click="getLists"
                        :loading="paging.loading"
                    >
                        {{ t("console-common.refresh") }}
                    </UButton>
                </div>
            </div>
            <div class="flex h-full flex-1 flex-col overflow-hidden">
                <UTable
                    :data="paging.items"
                    :columns="columns"
                    :loading="paging.loading"
                    class="h-[calc(100vh-26rem)]"
                    :ui="{
                        base: 'table-fixed border-separate border-spacing-0',
                        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                        tbody: '[&>tr]:last:[&>td]:border-b-0',
                        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                        td: 'border-b border-default',
                        tr: '[&:has(>td[colspan])]:hidden',
                    }"
                />
                <div class="flex justify-end py-4">
                    <BdPagination
                        v-model:page="paging.page"
                        v-model:size="paging.pageSize"
                        :total="paging.total"
                        @change="getLists"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
