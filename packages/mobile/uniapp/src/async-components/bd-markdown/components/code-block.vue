<script setup lang="ts">
import { PreCodeNode } from "markstream-vue";
import { computed, ref, watch } from "vue";

import { useShikiCdn } from "../composables/use-shiki-cdn";
import { getLanguageIcon } from "../utils/language-icon";

const props = defineProps<{
    node: {
        type: "code_block";
        language: string;
        code: string;
        raw: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}>();

const lang = computed(() => (props.node.language.split(":")[0] || "text")?.trim() || "text");
const code = computed(() => props.node.code || "");

const { t } = useI18n();

const { highlightCode: shikiHighlightCode } = useShikiCdn();

const { copy } = useCopy();

const isExpanded = shallowRef(true);
const isCopied = shallowRef(false);

const codeHtml = ref<string | null>(null);

watch(
    [code, lang],
    async () => {
        codeHtml.value = await shikiHighlightCode(code.value, lang.value || "text");
    },
    { immediate: true },
);

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};

const handleCopy = async () => {
    try {
        await copy(code.value);
        isCopied.value = true;
        setTimeout(() => {
            isCopied.value = false;
        }, 2000);
    } catch (error) {
        console.error("Failed to copy code:", error);
    }
};
</script>

<template>
    <view class="bd-markdown-code-wrapper">
        <view class="bd-markdown-code-header" :class="{ 'rounded-lg!': !isExpanded }">
            <view class="bd-markdown-code-lang mt-1 flex items-center gap-2">
                <text class="bd-markdown-code-lang-icon" v-html="getLanguageIcon(lang)" />

                <text class="mb-1 font-mono text-sm font-medium">{{ lang }}</text>
            </view>
            <view class="flex items-center gap-1">
                <view class="flex items-center gap-1 p-1" @click="toggleExpand">
                    <text :class="isExpanded ? 'i-lucide-chevrons-up' : 'i-lucide-chevrons-down'" />
                    <view class="pt-px">
                        {{ isExpanded ? t("common.collapse") : t("common.expand") }}
                    </view>
                </view>
                <view class="flex items-center gap-1 p-1" @click="handleCopy">
                    <view :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" class="text-xs" />
                    <view class="pt-px">
                        {{ isCopied ? t("common.message.copySuccess") : t("common.copy") }}
                    </view>
                </view>
            </view>
        </view>

        <view
            class="leading-[1.6] transition-all duration-300 [&_code]:!text-inherit [&_pre]:!text-inherit"
            :class="{
                'max-h-0 overflow-hidden pt-0 pb-0': !isExpanded,
            }"
            @touchstart.stop
            @touchmove.stop
            @touchend.stop
        >
            <view v-if="codeHtml" class="bd-markdown-code-html bg-muted" v-html="codeHtml" />
            <PreCodeNode v-else :node="props.node" />
        </view>
    </view>
</template>
