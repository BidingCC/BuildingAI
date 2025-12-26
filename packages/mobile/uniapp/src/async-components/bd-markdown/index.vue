<!--
 * BdMarkdown component
 * A highly customizable Markdown rendering component, supporting tables, pictures, flowcharts, sequence diagrams, state diagrams, UML diagrams, mathematical formulas, etc.
 * Extends the markstream-vue component, supports custom components and themes.
 * Usage: <BdMarkdown :content="content" />
 * @author BuildingAI Team
-->

<script setup lang="ts">
import "katex/dist/katex.min.css";

import MarkdownRender, { setCustomComponents } from "markstream-vue";

import CodeBlock from "./components/code-block.vue";
import MermaidBlock from "./components/mermaid-block.vue";
import type { BdMarkdownProps } from "./types";

withDefaults(defineProps<BdMarkdownProps>(), {
    content: "",
    customStyle: {},
});

setCustomComponents({
    code_block: CodeBlock,
    mermaid: MermaidBlock,
});
</script>

<template>
    <view class="bd-markdown" :style="customStyle">
        <slot name="before" />
        <MarkdownRender :content="content" :render-code-blocks-as-pre="true" />
        <slot name="after" />
    </view>
</template>

<style scoped>
/* Import styles */
@import "./styles/markdown.css";
</style>
