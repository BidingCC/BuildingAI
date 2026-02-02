<!--
 * LinkBlock component
 * 自定义链接渲染组件，用于增强 vue-renderer-markdown 的链接解析能力
 * @author BuildingAI Team
-->

<script setup lang="ts">
/**
 * 链接节点类型定义
 */
interface LinkNode {
    type: "link";
    href: string;
    title: string | null;
    text: string;
    children: {
        type: string;
        content?: string;
        raw?: string;
    }[];
    raw: string;
    loading?: boolean;
}

/**
 * 组件 Props 定义
 */
interface Props {
    /** 链接节点数据 */
    node: LinkNode;
    /** 索引键 */
    indexKey?: number | string;
    /** 自定义 ID */
    customId?: string;
}

const props = defineProps<Props>();

/**
 * 获取链接文本内容
 * @returns 链接显示文本
 */
const linkText = computed(() => {
    if (props.node.text) {
        return props.node.text;
    }
    if (props.node.children && props.node.children.length > 0) {
        return props.node.children.map((child) => child.content || child.raw || "").join("");
    }
    return props.node.href || "";
});

/**
 * 获取链接地址
 * @returns 链接 URL
 */
const linkHref = computed(() => {
    return props.node.href || "";
});

/**
 * 获取链接标题
 * @returns 链接 title 属性
 */
const linkTitle = computed(() => {
    return props.node.title || props.node.href || "";
});
</script>

<template>
    <a
        class="link-node"
        :href="linkHref"
        :title="linkTitle"
        :aria-label="`Link: ${linkHref}`"
        target="_blank"
        rel="noopener noreferrer"
    >
        {{ linkText }}
    </a>
</template>

<style scoped>
.link-node {
    color: var(--md-accent, #0969da);
    text-decoration: none;
    transition: color 0.2s;
}

.link-node:hover {
    text-decoration: underline;
}
</style>
