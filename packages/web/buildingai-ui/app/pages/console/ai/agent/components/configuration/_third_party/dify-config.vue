<script setup lang="ts">
/**
 * Dify 第三方平台集成配置组件
 * 用于配置 Dify 平台的 API 密钥和端点地址
 */

interface ThirdPartyIntegration {
    apiKey?: string;
    baseURL?: string;
}

const props = defineProps<{
    modelValue: ThirdPartyIntegration;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: ThirdPartyIntegration): void;
}>();

const state = useVModel(props, "modelValue", emit);

const show = ref(false);

// 确保 state 有默认值
if (!state.value) {
    state.value = {};
}
</script>

<template>
    <div class="space-y-4">
        <div class="bg-muted rounded-lg p-4">
            <div class="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
                <UIcon name="i-lucide-plug" class="size-4" />
                {{ $t("ai-agent.backend.configuration.thirdParty.dify.title") }}
            </div>

            <div class="space-y-4">
                <!-- API 端点地址 -->
                <UFormField
                    :label="$t('ai-agent.backend.configuration.thirdParty.baseURL')"
                    name="baseURL"
                    required
                >
                    <UInput
                        v-model="state.baseURL"
                        :placeholder="
                            $t('ai-agent.backend.configuration.thirdParty.dify.baseURLPlaceholder')
                        "
                        :ui="{ root: 'w-full' }"
                    />
                    <template #hint>
                        {{ $t("ai-agent.backend.configuration.thirdParty.dify.baseURLHint") }}
                    </template>
                </UFormField>

                <!-- API 密钥 -->
                <UFormField
                    :label="$t('ai-agent.backend.configuration.thirdParty.apiKey')"
                    name="apiKey"
                    required
                >
                    <UInput
                        v-model="state.apiKey"
                        :type="show ? 'text' : 'password'"
                        :placeholder="
                            $t('ai-agent.backend.configuration.thirdParty.dify.apiKeyPlaceholder')
                        "
                        :ui="{ root: 'w-full' }"
                        autocomplete="new-password"
                    >
                        <template #trailing>
                            <UButton
                                color="neutral"
                                variant="link"
                                size="sm"
                                :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                                :aria-label="show ? 'Hide password' : 'Show password'"
                                :aria-pressed="show"
                                aria-controls="password"
                                @click="show = !show"
                            />
                        </template>
                    </UInput>
                    <template #hint>
                        {{ $t("ai-agent.backend.configuration.thirdParty.dify.apiKeyHint") }}
                    </template>
                </UFormField>
            </div>
        </div>

        <!-- 配置说明 -->
        <UAlert
            color="info"
            variant="soft"
            :title="$t('ai-agent.backend.configuration.thirdParty.dify.helpTitle')"
            :description="$t('ai-agent.backend.configuration.thirdParty.dify.helpDesc')"
            icon="i-lucide-info"
        />
    </div>
</template>
