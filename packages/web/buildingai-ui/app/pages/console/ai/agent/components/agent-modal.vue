<script setup lang="ts">
import type { UpdateAgentConfigParams } from "@buildingai/service/consoleapi/ai-agent";
import {
    apiCreateAgent,
    apiGetAgentDetail,
    apiUpdateAgentConfig,
} from "@buildingai/service/consoleapi/ai-agent";
import { object, string } from "yup";

import { usePluginSlots } from "@//utils/plugins.utils";

const props = defineProps<{
    /** 智能体ID，如果为null则为创建模式 */
    id: string | null;
}>();

const emits = defineEmits<{
    (e: "close", v?: boolean): void;
}>();

const { t } = useI18n();
const toast = useMessage();
const router = useRouter();

const formData = ref<UpdateAgentConfigParams>({
    name: "",
    description: "",
    avatar: "",
    createMode: "direct",
    thirdPartyIntegration: {},
});

const createModes = computed(() => {
    const modes = [
        {
            value: "direct",
            label: t("ai-agent.backend.create.modes.direct"),
            description: t("ai-agent.backend.create.modesDesc.direct"),
            icon: "i-lucide-bot",
        },
        {
            value: "coze",
            label: t("ai-agent.backend.create.modes.coze"),
            description: t("ai-agent.backend.create.modesDesc.coze"),
            icon: "/images/coze.png",
        },
        {
            value: "dify",
            label: t("ai-agent.backend.create.modes.dify"),
            description: t("ai-agent.backend.create.modesDesc.dify"),
            icon: "/images/dify.png",
        },
    ];

    const pluginModes = usePluginSlots("agent:create:modes").value.map((slot) => ({
        value: slot.meta?.value,
        label: t(slot.meta?.label as string),
        description: slot.meta?.description || t("ai-agent.backend.create.modesDesc.plugin"),
        icon: slot.meta?.icon,
    }));

    return [...modes, ...pluginModes];
});

const schema = object({
    name: string().required(t("ai-agent.backend.create.namePlaceholder")),
    description: string().required(t("ai-agent.backend.create.descriptionPlaceholder")),
});

const { lockFn: fetchDetail, isLock: detailLoading } = useLockFn(async () => {
    try {
        const {
            createdAt: _createdAt,
            userCount: _userCount,
            updatedAt: _updatedAt,
            id: _id,
            ...data
        } = await apiGetAgentDetail(props.id as string);
        formData.value = data as UpdateAgentConfigParams;
    } catch (error) {
        console.error("获取智能体详情失败:", error);
    }
});

const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        if (props.id) {
            if (formData.value.avatar === undefined) {
                formData.value.avatar = null;
            }
            await apiUpdateAgentConfig(props.id, {
                name: formData.value.name,
                description: formData.value.description,
                avatar: formData.value.avatar,
            });
            refreshNuxtData(`agent-detail-${props.id}`);
            toast.success(t("common.message.updateSuccess"));
        } else {
            const res = await apiCreateAgent({
                name: formData.value.name,
                description: formData.value.description,
                avatar: formData.value.avatar,
                createMode: formData.value.createMode,
                thirdPartyIntegration: formData.value.thirdPartyIntegration,
            });
            router.push(useRoutePath("ai-agent:detail", { id: res.id }));
            toast.success(t("common.message.createSuccess"));
        }
        emits("close", true);
    } catch (error) {
        console.error(`${props.id ? "更新" : "创建"}智能体失败:`, error);
    }
});

onMounted(async () => {
    if (props.id) fetchDetail();
});
</script>

<template>
    <BdModal
        :title="
            props.id ? $t('ai-agent.backend.create.editTitle') : $t('ai-agent.backend.create.title')
        "
        :description="
            props.id ? $t('ai-agent.backend.create.editDesc') : $t('ai-agent.backend.create.desc')
        "
        :ui="{ content: 'max-w-3xl' }"
        @close="emits('close', false)"
    >
        <div v-if="detailLoading" class="flex items-center justify-center" style="height: 420px">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <UForm
            v-else
            :schema="schema"
            :state="formData"
            class="space-y-6 px-1"
            @submit="submitForm"
        >
            <div class="flex flex-col gap-5">
                <UFormField
                    v-if="!props.id && createModes.length != 1"
                    :label="$t('ai-agent.backend.create.mode')"
                    name="createMode"
                    class="space-y-2"
                >
                    <div class="grid grid-cols-3 gap-5">
                        <div
                            v-for="mode in createModes"
                            :key="mode.value as string"
                            class="group relative flex h-full cursor-pointer flex-col rounded-xl border p-5 transition-all duration-300 ease-out"
                            :class="[
                                formData.createMode === mode.value
                                    ? 'border-primary ring-primary bg-primary/5 -translate-y-1 shadow-md ring-1'
                                    : 'hover:border-primary/30 border-gray-100 bg-white hover:-translate-y-1 hover:shadow-xl',
                            ]"
                            @click="formData.createMode = mode.value as string"
                        >
                            <!-- Header: Icon & Check -->
                            <div class="mb-4 flex items-start justify-between">
                                <div
                                    v-if="
                                        mode.icon &&
                                        typeof mode.icon === 'string' &&
                                        !mode.icon.includes('.')
                                    "
                                    class="flex size-11 items-center justify-center rounded-lg shadow-sm transition-colors duration-200"
                                    :class="[
                                        formData.createMode === mode.value
                                            ? 'bg-primary text-white'
                                            : 'group-hover:text-primary group-hover:ring-primary/20 bg-white text-gray-600 ring-1 ring-gray-100',
                                    ]"
                                >
                                    <UIcon :name="mode.icon" class="size-6" />
                                </div>
                                <img
                                    v-else-if="mode.icon"
                                    :src="mode.icon as string"
                                    :alt="mode.label"
                                    class="size-11 object-contain"
                                />

                                <div
                                    class="transition-all duration-200"
                                    :class="[
                                        formData.createMode === mode.value
                                            ? 'scale-100 opacity-100'
                                            : 'scale-75 opacity-0',
                                    ]"
                                >
                                    <div
                                        class="bg-primary flex size-6 items-center justify-center rounded-full text-white shadow-sm"
                                    >
                                        <UIcon name="i-lucide-check" class="size-3.5" />
                                    </div>
                                </div>
                            </div>

                            <!-- Content -->
                            <div class="flex flex-1 flex-col gap-2">
                                <div
                                    class="text-base font-bold transition-colors duration-200"
                                    :class="[
                                        formData.createMode === mode.value
                                            ? 'text-primary'
                                            : 'group-hover:text-primary text-gray-900',
                                    ]"
                                >
                                    {{ mode.label }}
                                </div>
                                <div class="text-xs leading-relaxed font-medium text-gray-500">
                                    {{ (mode as any).description }}
                                </div>
                            </div>
                        </div>
                    </div>
                </UFormField>

                <UFormField :label="$t('ai-agent.backend.create.avatar')" name="avatar">
                    <BdUploader
                        v-model="formData.avatar"
                        class="h-24 w-24"
                        :text="$t('ai-agent.backend.create.avatarUpload')"
                        icon="i-lucide-upload"
                        accept=".jpg,.png,.jpeg,.gif,.webp"
                        :maxCount="1"
                        :single="true"
                        :multiple="false"
                    />
                    <template #hint> {{ $t("ai-agent.backend.create.avatarDefault") }} </template>
                </UFormField>

                <UFormField :label="$t('ai-agent.backend.create.name')" name="name" required>
                    <UInput
                        v-model="formData.name"
                        :placeholder="$t('ai-agent.backend.create.namePlaceholder')"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>

                <UFormField
                    :label="$t('ai-agent.backend.create.description')"
                    name="description"
                    required
                >
                    <UTextarea
                        v-model="formData.description"
                        :placeholder="$t('ai-agent.backend.create.descriptionPlaceholder')"
                        :rows="6"
                        :ui="{ root: 'w-full' }"
                    />
                </UFormField>
            </div>

            <div class="bg-background sticky bottom-0 z-10 flex justify-end gap-4 py-3">
                <UButton color="neutral" variant="soft" size="lg" @click="emits('close', false)">
                    {{ $t("console-common.cancel") }}
                </UButton>
                <UButton color="primary" size="lg" :loading="isLock" type="submit">
                    {{ props.id ? $t("console-common.update") : $t("console-common.create") }}
                </UButton>
            </div>
        </UForm>
    </BdModal>
</template>
