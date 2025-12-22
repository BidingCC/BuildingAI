/**
 * markdown 标签的默认样式配置
 * 从 bd-markdown/styles/markdown.css 转换而来，用于 mp-html 组件的 tag-style 属性
 *
 * 注意：
 * - CSS 变量（如 var(--md-fg)）已转换为具体的颜色值（基于 light mode）
 * - 嵌套选择器、伪类选择器等无法通过 tagStyle 实现，需要通过其他方式处理
 * - 这些样式会被 mp-html 解析器转换为内联样式，应用到 rich-text 组件渲染的内容上
 */
export const tagStyle: Record<string, string> = {
    // 标题样式（基于 bd-markdown 样式）
    h1: "margin: 0.67em 0; font-size: 2em; font-weight: 600; line-height: 1.25; color: #24292f; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de;",
    h2: "margin-top: 1.5rem; margin-bottom: 1rem; font-size: 1.5em; font-weight: 600; line-height: 1.25; color: #24292f; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de;",
    h3: "margin-top: 1.5rem; margin-bottom: 1rem; font-size: 1.25em; font-weight: 600; line-height: 1.25; color: #24292f;",
    h4: "margin-top: 1.5rem; margin-bottom: 1rem; font-size: 1em; font-weight: 600; line-height: 1.25; color: #24292f;",
    h5: "margin-top: 1.5rem; margin-bottom: 1rem; font-size: 0.875em; font-weight: 600; line-height: 1.25; color: #24292f;",
    h6: "margin-top: 1.5rem; margin-bottom: 1rem; font-size: 0.85em; font-weight: 600; line-height: 1.25; color: #8b949e;",

    // 段落
    p: "margin-top: 0; margin-bottom: 10px;",

    // 链接
    a: "color: #0969da; text-decoration: none;",

    // 列表
    ul: "padding-left: 2em; margin-top: 0; margin-bottom: 1em;",
    ol: "padding-left: 2em; margin-top: 0; margin-bottom: 1em;",
    li: "margin-bottom: 0.25em;",

    // 引用
    blockquote:
        "margin: 1em 0; padding: 0.5em 1em; color: #57606a; border-left: 0.25em solid #d0d7de; border-radius: 0.25em;",

    // 表格
    table: "width: 100%; max-width: 100%; overflow: auto; margin-top: 0; margin-bottom: 1em; border-spacing: 0; border-collapse: collapse; table-layout: fixed;",
    tr: "background-color: transparent; border-bottom: 1px solid #e5e7eb;",
    th: "padding: 0.75em 1em; border: none; text-align: left; width: auto; min-width: 0; background-color: transparent; font-weight: 600;",
    td: "padding: 0.75em 1em; border: none; text-align: left; width: auto; min-width: 0; background-color: transparent;",

    // 文本样式
    strong: "font-weight: 600;",
    em: "font-style: italic;",
    del: "text-decoration: line-through;",
    code: "padding: 2px 4px; border-radius: 4px;",

    // 代码块
    pre: "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;",
    samp: "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;",
    kbd: "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;",

    // 图片
    img: "width: 240px; box-sizing: content-box; background-color: #ffffff; border-radius: 0.25em; border: 1px solid #d0d7de;",

    // 分割线
    hr: "height: 1px; padding: 0; margin: 1.5em 0; background-color: #d0d7de; border: 0;",

    // 行内元素
    b: "font-weight: 600;",
    i: "font-style: italic;",
    u: "text-decoration: underline;",
    s: "text-decoration: line-through;",
    strike: "text-decoration: line-through;",
    small: "font-size: 0.8em;",
    sub: "vertical-align: sub; font-size: smaller;",
    sup: "vertical-align: super; font-size: smaller;",
    ins: "text-decoration: underline;",
    mark: "background-color: yellow;",
    abbr: "cursor: help; border-bottom: 1px dotted #777;",
};
