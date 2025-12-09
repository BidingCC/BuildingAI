<script setup lang="ts">
import type {
    CreateMcpServerRequest,
    McpServerDetail,
} from "@buildingai/service/consoleapi/mcp-server";
import {
    apiConsoleCreateMcpServer,
    apiConsoleGetMcpServerDetail,
    apiConsoleJsonImportMcpServers,
    apiConsoleUpdateMcpServer,
} from "@buildingai/service/consoleapi/mcp-server";
import { object, string } from "yup";

const toast = useMessage();
const route = useRoute();

const props = defineProps<{
    id?: string | null;
    isJsonImport?: boolean;
}>();
const emits = defineEmits<{
    (e: "close", refresh?: boolean): void;
    (e: "change-update", ids: string[]): void;
}>();

const mcpServerId = computed(() => props.id || (route.query.id as string) || null);

const { t } = useI18n();

const formData = shallowReactive<CreateMcpServerRequest>({
    name: "",
    providerName: "",
    description: "",
    icon: "",
    isDisabled: false,
    url: "",
    sortOrder: 0,
    communicationType: undefined,
    isQuickMenu: false,
    alias: "",
    providerUrl: "",
    customHeaders: "",
});

const jsonFormData = shallowReactive({
    jsonImport: "",
});

const providerSchema = object({
    name: string().required(t("ai-mcp.backend.form.name")),
    url: string()
        .required(t("ai-mcp.backend.form.baseUrlPlaceholder"))
        .test("is-valid-url", t("ai-mcp.backend.form.baseUrlPlaceholder"), (value) => {
            if (!value) return false;
            // 允许本地地址（localhost或127.0.0.1开头的URL）
            if (
                /^(https?:\/\/)?[\w\d-]+(\.[\w\d-]+)+([\w\d\-.,@?^=%&:/~+#]*[\w\d=#])?$/.test(value)
            ) {
                return true;
            }
            // 其他URL使用标准URL验证
            try {
                new URL(value);
                return true;
            } catch (_e) {
                return false;
            }
        }),
    communicationType: string().required(t("ai-mcp.backend.form.communicationType")),
});

/**
 * JSON导入表单验证规则
 * 验证JSON格式及必填字段(url和type)
 */
const jsonImportSchema = object({
    jsonImport: string()
        .required(t("ai-mcp.backend.validation.jsonRequired"))
        .test("is-valid-json", t("ai-mcp.backend.validation.jsonFormatError"), (value) => {
            if (!value) return false;
            try {
                JSON.parse(value);
                return true;
            } catch (_e) {
                return false;
            }
        })
        .test("validate-required-fields", (value, context) => {
            if (!value) return true;

            try {
                const parsed = JSON.parse(value);

                if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
                    return context.createError({
                        message: t("ai-mcp.backend.validation.missingMcpServers"),
                    });
                }

                const servers = parsed.mcpServers;
                const serverNames = Object.keys(servers);

                if (serverNames.length === 0) {
                    return context.createError({
                        message: t("ai-mcp.backend.validation.emptyMcpServers"),
                    });
                }

                // 检查每个服务器配置的必填字段
                for (const [serverName, config] of Object.entries(servers)) {
                    if (!config || typeof config !== "object") {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.invalidConfig")}`,
                        });
                    }

                    const serverConfig = config as Record<string, unknown>;

                    // 检查 url 字段
                    if (!serverConfig.url) {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.missingUrl")}`,
                        });
                    }

                    if (typeof serverConfig.url !== "string") {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.invalidUrlType")}`,
                        });
                    }

                    // 检查 type 字段
                    if (!serverConfig.type) {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.missingType")}`,
                        });
                    }

                    if (typeof serverConfig.type !== "string") {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.invalidTypeValue")}`,
                        });
                    }

                    // 验证 type 字段的值是否合法
                    const validTypes = ["sse", "streamable-http"];
                    if (!validTypes.includes(serverConfig.type)) {
                        return context.createError({
                            message: `"${serverName}" ${t("ai-mcp.backend.validation.invalidTypeEnum")}`,
                        });
                    }

                    // headers 是可选的,如果存在则验证其格式
                    if (serverConfig.headers !== undefined) {
                        if (
                            typeof serverConfig.headers !== "object" ||
                            serverConfig.headers === null
                        ) {
                            return context.createError({
                                message: `"${serverName}" ${t("ai-mcp.backend.validation.invalidHeaders")}`,
                            });
                        }
                    }
                }

                return true;
            } catch (_e) {
                return context.createError({
                    message: t("console-ai-mcp-server.validation.jsonFormatError"),
                });
            }
        }),
});

const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        const data: McpServerDetail = await apiConsoleGetMcpServerDetail(
            mcpServerId.value as string,
        );
        Object.keys(formData).forEach((key) => {
            const typedKey = key as keyof typeof formData;
            const value = data[typedKey as keyof McpServerDetail];
            if (value !== undefined) {
                // 特殊处理 customHeaders：如果是对象则转换为字符串
                if (typedKey === "customHeaders") {
                    if (typeof value === "object" && value !== null) {
                        // 将对象转换为 "key1=value1,key2=value2" 格式的字符串
                        const headersStr = Object.entries(value as Record<string, string>)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(",");
                        formData[typedKey] = headersStr as never;
                    } else {
                        formData[typedKey] = (value || "") as never;
                    }
                } else {
                    // 处理其他字段
                    if (typeof value === "object" && value !== null) {
                        if (Object.keys(value).length > 0) {
                            formData[typedKey as keyof typeof formData] = value as never;
                        }
                    } else {
                        // 处理原始类型（string, number, boolean等）
                        formData[typedKey as keyof typeof formData] = value as never;
                    }
                }
            }
        });
    } catch (error) {
        console.error("获取供应商详情失败:", error);
    }
});

/**
 * 解析自定义请求头字符串为键值对对象
 * @param headersStr - 格式为 "key1=value1,key2=value2" 或换行分隔的字符串
 * @returns 解析后的键值对对象
 */
const parseCustomHeaders = (headersStr?: string | null): Record<string, string> => {
    if (!headersStr?.trim()) return {};

    const headers: Record<string, string> = {};
    // 支持换行或逗号分隔
    const pairs = headersStr.split(/[,\n]/).filter((pair) => pair.trim());

    pairs.forEach((pair) => {
        const [key, ...valueParts] = pair.split("=");
        if (key?.trim() && valueParts.length > 0) {
            const value = valueParts.join("="); // 处理值中包含等号的情况
            headers[key.trim()] = value.trim();
        }
    });

    return headers;
};

// 提交表单
const { lockFn: submitForm, isLock } = useLockFn(async () => {
    const { customHeaders, ...obj } = formData;

    // 解析自定义请求头
    const parsedHeaders = parseCustomHeaders(customHeaders as string);

    const newFormData: Omit<CreateMcpServerRequest, "args"> & {
        args?: Record<string, unknown>;
        customHeaders?: Record<string, string>;
    } = {
        ...obj,
        customHeaders: parsedHeaders,
    };

    try {
        let id = "";
        if (mcpServerId.value) {
            const res = await apiConsoleUpdateMcpServer(mcpServerId.value, newFormData);
            id = res.id;
            emits("change-update", [id]);
            toast.success(t("ai-mcp.backend.updateSuccess"));
        } else {
            const res = await apiConsoleCreateMcpServer(newFormData);
            id = res.id;
            emits("change-update", [id]);
            toast.success(t("ai-mcp.backend.createSuccess"));
        }
        emits("close", true);
    } catch (error) {
        console.error("提交失败:", error);
    }
});

// JSON导入提交表单
const { lockFn: jsonSubmitForm, isLock: _jsonIsLock } = useLockFn(async () => {
    try {
        const res = await apiConsoleJsonImportMcpServers(jsonFormData.jsonImport || "");
        toast.success(
            `${t("ai-mcp.backend.jsonImportTotal")} ${res.total} ${t("ai-mcp.backend.jsonImportUnit")}，
            ${t("console-common.create")} ${res.created} ${t("ai-mcp.backend.jsonImportUnit")}，
            ${t("console-common.update")} ${res.updated} ${t("ai-mcp.backend.jsonImportUnit")}`,
        );
        const ids = res.results.map((item) => item.id);
        emits("change-update", ids);
        emits("close", true);
    } catch (error) {
        console.error("JSON导入失败:", error);
    }
});

const correctJson = `{
    "mcpServers": {
        "Your MCP Server Name": {
            "url": "xxxxx",
            // type: sse or streamable-http
            "type": "sse or streamable-http",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer Your Token"
                ...
            },
            ...
        }
    }
}`;

onMounted(async () => mcpServerId.value && (await fetchDetail()));
</script>

<template>
    <BdModal
        :title="mcpServerId ? t('ai-mcp.backend.editTitle') : t('ai-mcp.backend.addTitle')"
        :description="mcpServerId ? t('ai-mcp.backend.editTitle') : t('ai-mcp.backend.addTitle')"
        :ui="{
            content: 'max-w-2xl overflow-y-auto h-fit',
        }"
        @update:model-value="(value) => !value && emits('close')"
        @close="emits('close')"
    >
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 400px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <UForm
            v-else-if="!isJsonImport"
            :state="formData"
            :schema="providerSchema"
            @submit="submitForm"
        >
            <!-- 基本信息 -->
            <div class="flex flex-col gap-4 pb-2">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <UFormField :label="t('ai-mcp.backend.form.name')" name="name" required>
                        <UInput
                            v-model="formData.name"
                            :placeholder="t('ai-mcp.backend.form.name')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                    <UFormField :label="t('ai-mcp.backend.form.alias')" name="alias">
                        <UInput
                            v-model="formData.alias"
                            :placeholder="t('ai-mcp.backend.form.alias')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                </div>
                <UFormField
                    :label="t('ai-mcp.backend.form.baseUrl')"
                    name="url"
                    required
                    :description="t('ai-mcp.backend.form.baseUrlTips')"
                >
                    <UTextarea
                        v-model="formData.url"
                        :placeholder="t('ai-mcp.backend.form.baseUrlPlaceholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
                <!-- 类型 -->
                <UFormField
                    :label="t('ai-mcp.backend.form.type')"
                    name="communicationType"
                    required
                >
                    <USelect
                        v-model="formData.communicationType"
                        :placeholder="t('ai-mcp.backend.form.type')"
                        :ui="{ base: 'w-full' }"
                        :items="[
                            { label: 'sse', value: 'sse' },
                            { label: 'streamable-http', value: 'streamable-http' },
                        ]"
                    />
                </UFormField>
                <!-- 请求头 -->
                <UFormField :label="t('ai-mcp.backend.form.headers')" name="headers">
                    <UTextarea
                        v-model="formData.customHeaders as string"
                        :placeholder="t('ai-mcp.backend.form.customHeadersPlaceholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <UFormField :label="t('ai-mcp.backend.form.providerName')" name="providerName">
                        <UInput
                            v-model="formData.providerName"
                            :placeholder="t('ai-mcp.backend.form.providerName')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                    <UFormField :label="t('ai-mcp.backend.form.providerUrl')" name="providerUrl">
                        <UInput
                            v-model="formData.providerUrl"
                            :placeholder="t('ai-mcp.backend.form.providerUrl')"
                            :ui="{ root: 'w-full' }"
                        />
                    </UFormField>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <UFormField :label="t('ai-mcp.backend.form.icon')" name="iconUrl">
                        <BdUploader
                            v-model="formData.icon"
                            class="h-24 w-24"
                            text="上传图标"
                            icon="i-lucide-upload"
                            accept=".jpg,.png,.svg,.ico"
                            :maxCount="1"
                            :single="true"
                            :multiple="false"
                        />
                    </UFormField>

                    <div class="space-y-4">
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <UFormField
                                :label="t('ai-mcp.backend.form.isDisabled')"
                                name="isDisabled"
                            >
                                <USwitch
                                    :model-value="!formData.isDisabled"
                                    @update:model-value="(val) => (formData.isDisabled = !val)"
                                    unchecked-icon="i-lucide-x"
                                    checked-icon="i-lucide-check"
                                    size="lg"
                                    :label="
                                        !formData.isDisabled
                                            ? t('ai-mcp.backend.form.isActiveEnabled')
                                            : t('ai-mcp.backend.form.isActiveDisabled')
                                    "
                                />
                            </UFormField>
                            <UFormField
                                :label="t('ai-mcp.backend.form.isQuickMenu')"
                                name="isQuickMenu"
                            >
                                <USwitch
                                    :model-value="formData.isQuickMenu"
                                    @update:model-value="(val) => (formData.isQuickMenu = val)"
                                    unchecked-icon="i-lucide-x"
                                    checked-icon="i-lucide-check"
                                    size="lg"
                                />
                            </UFormField>
                        </div>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <UFormField
                                :label="t('ai-mcp.backend.form.sortOrder')"
                                name="sortOrder"
                            >
                                <UInput
                                    v-model="formData.sortOrder"
                                    type="number"
                                    :placeholder="t('ai-mcp.backend.form.sortOrder')"
                                    :ui="{ root: 'w-full' }"
                                />
                            </UFormField>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 描述 -->
            <div class="py-4">
                <UFormField :label="t('ai-mcp.backend.form.description')" name="description">
                    <UTextarea
                        v-model="formData.description"
                        autoresize
                        :placeholder="t('ai-mcp.backend.form.descriptionPlaceholder')"
                        :rows="3"
                        :maxrows="8"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
            </div>

            <!-- 操作按钮 -->
            <div class="bottom-0 z-10 flex justify-end gap-2 pt-4">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close')">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" type="submit" :loading="isLock">
                    {{ mcpServerId ? t("console-common.update") : t("console-common.create") }}
                </UButton>
            </div>
        </UForm>
        <UForm v-else :state="jsonFormData" :schema="jsonImportSchema" @submit="jsonSubmitForm">
            <!-- json导入 -->
            <div class="pb-2">
                <UFormField :label="t('ai-mcp.backend.form.jsonImport')" name="jsonImport" required>
                    <UTextarea
                        v-model="jsonFormData.jsonImport"
                        :placeholder="t('ai-mcp.backend.form.jsonImportPlaceholder')"
                        :rows="13"
                        :ui="{ root: 'w-full' }"
                    />
                    <template #hint>
                        <UPopover mode="click" :open-delay="0" :close-delay="0">
                            <UButton variant="link" class="text-primary cursor-pointer text-xs">
                                {{ t("ai-mcp.backend.jsonImportExample") }}
                            </UButton>
                            <template #content>
                                <div class="flex flex-col gap-4 p-4">
                                    <div class="flex flex-col">
                                        <div class="flex w-fit flex-col items-start gap-2">
                                            <div
                                                class="flex w-full items-start gap-1 rounded-lg bg-blue-50 p-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                                            >
                                                <UIcon size="20" name="i-tabler-alert-circle" />
                                                <span>{{
                                                    t("ai-mcp.backend.jsonImportCorrectExample")
                                                }}</span>
                                            </div>
                                            <pre
                                                class="bg-muted w-full overflow-x-auto rounded-lg p-4 text-sm"
                                            ><code>{{ correctJson }}</code></pre>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </UPopover>
                    </template>
                </UFormField>
            </div>

            <!-- 操作按钮 -->
            <div class="bottom-0 z-10 flex justify-end gap-2 pt-4">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close')">
                    {{ t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" type="submit" :loading="isLock">
                    {{ mcpServerId ? t("console-common.update") : t("console-common.create") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
