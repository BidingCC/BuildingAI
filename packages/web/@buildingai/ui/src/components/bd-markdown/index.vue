<!--
 * BdMarkdown component
 * A highly customizable Markdown rendering component, supporting tables, pictures, flowcharts, sequence diagrams, state diagrams, UML diagrams, mathematical formulas, etc.
 * Extends the markstream-vue component, supports custom components and themes.
 * Usage: <BdMarkdown :content="content" />
 * @author BuildingAI Team
-->

<script setup lang="ts">
import "katex/dist/katex.min.css";

import { computed, provide } from "vue";
import MarkdownRender, { setCustomComponents } from "markstream-vue";

import CodeBlock from "./components/code-block.vue";
import LinkBlock from "./components/link-block.vue";
import MermaidBlock from "./components/mermaid-block.vue";
import type { BdMarkdownProps } from "./types";

const props = withDefaults(defineProps<BdMarkdownProps>(), {
    content: "",
    showRunButton: true,
});

// 通过 provide 传递配置给子组件
provide("bdMarkdownConfig", {
    showRunButton: computed(() => props.showRunButton),
});

setCustomComponents({
    code_block: CodeBlock,
    mermaid: MermaidBlock,
    link: LinkBlock,
});
</script>

<template>
    <!--
        SSR fallback:
        1. During the server-side rendering phase, the v-dompurify-html instruction will not be executed, so the pure text content is rendered first by interpolation.
        2. After the client is mounted, the v-dompurify-html instruction will overwrite the innerHTML with the sanitized Markdown rendering result.
        This way, the problem of empty pages during SSR can be avoided.
    -->
    <ClientOnly>
        <div class="bd-markdown">
            <slot name="before" />
            <MarkdownRender :content="content" :render-code-blocks-as-pre="true" />
            <slot name="after" />
        </div>

        <template #placeholder>
            <pre class="whitespace-pre-line">{{ props.content }}</pre>
        </template>
    </ClientOnly>
</template>

<style>
/* Import styles */
@import "./styles/markdown.css";
</style>
