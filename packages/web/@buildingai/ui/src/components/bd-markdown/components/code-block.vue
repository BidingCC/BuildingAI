<script setup lang="ts">
import type { ComputedRef } from "vue";
import { computed, defineAsyncComponent, inject, ref, watch } from "vue";
import type { Composer } from "vue-i18n";
import { PreCodeNode } from "markstream-vue";

import { useShikiCdn } from "../composables/use-shiki-cdn";
import { getLanguageIcon } from "../utils/language-icon";

const BdButtonCopy = defineAsyncComponent(() => import("../../bd-button-copy/index.vue"));

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

const markdownConfig = inject<{ showRunButton: ComputedRef<boolean> } | undefined>(
    "bdMarkdownConfig",
    undefined,
);
const showRunButton = computed(() => markdownConfig?.showRunButton.value ?? true);

const lang = computed(() => (props.node.language.split(":")[0] || "text")?.trim() || "text");
const code = computed(() => props.node.code || "");
const isHtml = computed(() => /^html?$/i.test(lang.value));

const { $i18n } = useNuxtApp();
const { t } = $i18n as Composer;

const { highlightCode: shikiHighlightCode } = useShikiCdn();

const fontSize = shallowRef(14);
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 2;

const isExpanded = shallowRef(true);

const fontSizeStyle = computed(() => ({
    fontSize: `${fontSize.value}px`,
}));

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    jsx: "jsx",
    tsx: "tsx",
    python: "py",
    java: "java",
    cpp: "cpp",
    c: "c",
    html: "html",
    css: "css",
    json: "json",
    yaml: "yaml",
    xml: "xml",
    markdown: "md",
    shell: "sh",
    bash: "sh",
    sql: "sql",
    vue: "vue",
    rust: "rs",
    go: "go",
    ruby: "rb",
    php: "php",
};

const codeHtml = ref<string | null>(null);

watch(
    [code, lang],
    async () => {
        codeHtml.value = await shikiHighlightCode(code.value, lang.value || "text");
    },
    { immediate: true },
);

function zoomIn() {
    if (fontSize.value < MAX_FONT_SIZE) {
        fontSize.value = Math.min(fontSize.value + FONT_SIZE_STEP, MAX_FONT_SIZE);
    }
}

function zoomOut() {
    if (fontSize.value > MIN_FONT_SIZE) {
        fontSize.value = Math.max(fontSize.value - FONT_SIZE_STEP, MIN_FONT_SIZE);
    }
}

function toggleExpand() {
    isExpanded.value = !isExpanded.value;
}

function handleRun() {
    useNuxtApp().callHook("chat:run:html" as any, code.value);
}

function handleDownload() {
    try {
        const extension = LANGUAGE_EXTENSION_MAP[lang.value.toLowerCase()] || lang.value || "txt";
        const fileName = `code.${extension}`;
        const blob = new Blob([code.value], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        useMessage().success(t("common.message.downloadSuccess"));
    } catch (error) {
        console.error("Failed to download code:", error);
        useMessage().error(t("common.message.downloadFailed"));
    }
}
</script>

<template>
    <div class="bd-markdown-code-wrapper">
        <div class="bd-markdown-code-header" :class="{ 'rounded-lg!': !isExpanded }">
            <span class="bd-markdown-code-lang flex items-center gap-2">
                <span class="bd-markdown-code-lang-icon" v-html="getLanguageIcon(lang)" />

                <span class="font-mono text-sm font-medium">{{ lang }}</span>
            </span>
            <div class="bd-markdown-button-group flex items-center gap-1">
                <UButton
                    color="neutral"
                    size="sm"
                    :icon="isExpanded ? 'i-lucide-chevrons-up' : 'i-lucide-chevrons-down'"
                    variant="ghost"
                    :label="isExpanded ? t('common.collapse') : t('common.expand')"
                    @click="toggleExpand"
                />
                <UButton
                    color="neutral"
                    size="sm"
                    icon="i-lucide-zoom-out"
                    variant="ghost"
                    :disabled="fontSize <= MIN_FONT_SIZE"
                    :title="t('common.zoomOut')"
                    @click="zoomOut"
                />
                <UButton
                    color="neutral"
                    size="sm"
                    icon="i-lucide-zoom-in"
                    variant="ghost"
                    :disabled="fontSize >= MAX_FONT_SIZE"
                    :title="t('common.zoomIn')"
                    @click="zoomIn"
                />
                <UButton
                    color="neutral"
                    size="sm"
                    icon="i-lucide-download"
                    variant="ghost"
                    :title="t('common.download')"
                    @click="handleDownload"
                />
                <UButton
                    v-if="isHtml && showRunButton"
                    color="neutral"
                    size="sm"
                    icon="i-lucide-circle-play"
                    variant="ghost"
                    @click="handleRun"
                >
                    {{ t("common.run") }}
                </UButton>
                <BdButtonCopy
                    color="neutral"
                    size="sm"
                    :defaultText="$t('common.copy')"
                    :copiedText="$t('common.message.copySuccess')"
                    :content="code"
                    variant="ghost"
                >
                    <template #default="{ copied }">
                        <span v-if="copied">
                            {{ t("common.message.copySuccess") }}
                        </span>
                        <span v-else>
                            {{ t("common.copy") }}
                        </span>
                    </template>
                </BdButtonCopy>
            </div>
        </div>

        <div
            class="leading-[1.6] transition-all duration-300 [&_code]:!text-inherit [&_pre]:!text-inherit"
            :class="{
                'max-h-0 overflow-hidden pt-0 pb-0': !isExpanded,
            }"
            :style="fontSizeStyle"
        >
            <div v-if="codeHtml" class="bd-markdown-code-html bg-muted" v-html="codeHtml" />
            <PreCodeNode v-else :node="props.node" />
        </div>
    </div>
</template>
