<script lang="ts" setup>
import { uploadFileAdaptive } from "@buildingai/upload";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { Markdown } from "tiptap-markdown";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { BdEditorEmits, BdEditorProps } from "./types";

const emits = defineEmits<BdEditorEmits>();

const { t } = useI18n();

const props = withDefaults(defineProps<BdEditorProps>(), {
    customClass: "",
    placeholder: "common.proEditor.placeholder",
    enableMarkdown: true,
    outputFormat: "html",
    enableExport: false,
    enableAutoSave: false,
    isAutoSaving: false,
    isExporting: false,
});

const content = computed<string>({
    get: () => props.modelValue,
    set: (val: string) => emits("update:modelValue", val),
});

const editor = shallowRef<any | null>(null);
const uiRefresh = ref(0);

/**
 * 为编辑器中的所有图片添加点击预览事件
 */
function attachImageClickHandlers() {
    nextTick(() => {
        if (!editor.value) return;

        // 使用 editor 实例获取 DOM 元素,避免选择器冲突
        const editorElement = editor.value.view.dom as HTMLElement;
        if (!editorElement) return;

        const images = editorElement.querySelectorAll("img");
        if (images.length === 0) return;

        images.forEach((img) => {
            // 设置鼠标样式
            img.style.cursor = "pointer";

            // 移除旧的事件监听器
            const oldHandler = (img as any)._clickHandler;
            if (oldHandler) {
                img.removeEventListener("click", oldHandler);
            }

            // 创建新的事件处理函数
            const clickHandler = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();

                // 收集所有图片的 URL
                const allImages = Array.from(editorElement.querySelectorAll("img"));
                const imageUrls = allImages.map((image) => (image as HTMLImageElement).src);

                // 找到当前点击图片的索引
                const currentIndex = allImages.indexOf(img);

                // 触发 image-click 事件,由父组件处理
                if (currentIndex >= 0) {
                    emits("image-click", imageUrls, currentIndex);
                }
            };

            // 保存事件处理函数引用,方便后续移除
            (img as any)._clickHandler = clickHandler;

            // 添加点击事件
            img.addEventListener("click", clickHandler);
        });
    });
}

onMounted(() => {
    const extensions = [
        StarterKit,
        Underline,
        Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
        Image,
        Placeholder.configure({ placeholder: t(props.placeholder) }),
        Color.configure({ types: [TextStyle.name, ListItem.name] }),
        TextStyle,
        Highlight.configure({
            multicolor: true,
        }),
    ];

    // 如果启用 Markdown 模式，添加 Markdown 扩展
    if (props.enableMarkdown) {
        extensions.push(
            Markdown.configure({
                html: true,
                tightLists: true,
                bulletListMarker: "-",
                linkify: false,
                breaks: false,
                transformPastedText: false,
                transformCopiedText: false,
            }) as any, // 临时类型断言以解决兼容性问题
        );
    }

    editor.value = new Editor({
        extensions,
        content: content.value || "",
        autofocus: false,
        injectCSS: false,
        editorProps: {
            // Use native browser styles, remove formatting enhancement
            attributes: { class: "focus:outline-none" },
        },
        onUpdate: ({ editor }: { editor: any }) => {
            if (props.outputFormat === "markdown" && props.enableMarkdown) {
                // Try to get Markdown format
                try {
                    const markdown = editor.storage.markdown?.getMarkdown();
                    content.value = markdown || editor.getHTML();
                } catch {
                    // If getting Markdown fails, fall back to HTML
                    content.value = editor.getHTML();
                }
            } else {
                content.value = editor.getHTML();
            }

            // 内容更新后重新绑定图片点击事件
            attachImageClickHandlers();
        },
    });

    // After the first render, automatically focus to the end, optimize the editing experience
    nextTick(() => {
        editor.value?.commands.focus("end");
        // 初始化时绑定图片点击事件
        attachImageClickHandlers();
    });

    // Listen to editor state changes to refresh toolbar activation/disable state
    const bump = () => (uiRefresh.value = (uiRefresh.value + 1) % 1_000_000);
    editor.value?.on("selectionUpdate", bump);
    editor.value?.on("transaction", bump);
    editor.value?.on("update", bump);
});

onBeforeUnmount(() => {
    editor.value?.destroy();
    editor.value = null;
});

// When external changes are made, synchronize to the editor
watch(
    () => content.value,
    (val) => {
        if (!editor.value) return;
        if (val !== editor.value.getHTML()) {
            editor.value.commands.setContent(val || "", false);
            // 初始化时绑定图片点击事件
            attachImageClickHandlers();
        }
    },
);

async function handlePickAndInsertImage() {
    if (!editor.value) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".jpg,.jpeg,.png,.gif,.webp";
    input.multiple = true;
    input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        const uploaded = await Promise.all(
            files.map(
                (file) =>
                    new Promise<{ url: string }>((resolve, reject) => {
                        uploadFileAdaptive({ file, description: "editor" })
                            .then((res: { url: string }) => resolve(res))
                            .catch((err: Error) => reject(err));
                    }),
            ),
        );
        uploaded.forEach(({ url }) => {
            editor.value!.chain().focus().setImage({ src: url }).run();
        });
    };
    input.click();
}

function toggleMark(mark: "bold" | "italic" | "strike" | "underline") {
    if (!editor.value) return;
    const chain = editor.value.chain().focus();
    if (mark === "bold") chain.toggleBold().run();
    if (mark === "italic") chain.toggleItalic().run();
    if (mark === "strike") chain.toggleStrike().run();
    if (mark === "underline") chain.toggleUnderline().run();
}

function setParagraph() {
    editor.value?.chain().focus().setParagraph().run();
}
function setHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
    editor.value?.chain().focus().toggleHeading({ level }).run();
}
function toggleBulletList() {
    editor.value?.chain().focus().toggleBulletList().run();
}
function toggleOrderedList() {
    editor.value?.chain().focus().toggleOrderedList().run();
}
function toggleBlockquote() {
    editor.value?.chain().focus().toggleBlockquote().run();
}
function toggleCodeBlock() {
    editor.value?.chain().focus().toggleCodeBlock().run();
}
function clearMarks() {
    editor.value?.chain().focus().unsetAllMarks().run();
}
function clearNodes() {
    editor.value?.chain().focus().clearNodes().run();
}
function insertHorizontalRule() {
    editor.value?.chain().focus().setHorizontalRule().run();
}
function insertHardBreak() {
    editor.value?.chain().focus().setHardBreak().run();
}
function toggleInlineCode() {
    editor.value?.chain().focus().toggleCode().run();
}
function setTextColor(color: string) {
    editor.value?.chain().focus().setColor(color).run();
}
function undo() {
    editor.value?.chain().focus().undo().run();
}
function redo() {
    editor.value?.chain().focus().redo().run();
}

/**
 * Get Markdown format content
 */
function getMarkdownContent(): string {
    if (!editor.value) return "";

    // If the Markdown extension is installed, you can get the Markdown format
    try {
        return editor.value.storage.markdown?.getMarkdown() || editor.value.getHTML();
    } catch {
        // If the Markdown extension or method does not exist, return HTML
        return editor.value.getHTML();
    }
}

/**
 * Get current content (determined by outputFormat)
 */
function getCurrentContent(): string {
    if (!editor.value) return "";

    if (props.outputFormat === "markdown" && props.enableMarkdown) {
        return getMarkdownContent();
    } else {
        return editor.value.getHTML();
    }
}

/**
 * Set Markdown format content
 */
function setMarkdownContent(markdown: string) {
    if (!editor.value) return;

    try {
        editor.value.commands.setContent(markdown);
    } catch {
        // Fall back to setting HTML content
        editor.value.commands.setContent(markdown);
    }
}

/**
 * Insert Markdown syntax shortcut
 */
function insertMarkdownSyntax(type: "bold" | "italic" | "code" | "link" | "image" | "heading") {
    if (!editor.value) return;

    const selection = editor.value.state.selection;
    const selectedText = editor.value.state.doc.textBetween(selection.from, selection.to);

    let before = "";
    let after = "";
    let placeholder = "";

    switch (type) {
        case "bold":
            before = "**";
            after = "**";
            placeholder = "粗体文本";
            break;
        case "italic":
            before = "*";
            after = "*";
            placeholder = "斜体文本";
            break;
        case "code":
            before = "`";
            after = "`";
            placeholder = "代码";
            break;
        case "link":
            before = "[";
            after = "](url)";
            placeholder = "链接文本";
            break;
        case "image":
            before = "![";
            after = "](url)";
            placeholder = "图片描述";
            break;
        case "heading":
            before = "# ";
            after = "";
            placeholder = "标题";
            break;
    }

    const textToInsert = selectedText || placeholder;
    const fullText = before + textToInsert + after;

    editor.value.commands.insertContent(fullText);
}

const items = [
    {
        label: "导出 PDF",
        value: "pdf",
        onClick: () => {
            handleExport("pdf");
        },
    },
    {
        label: "导出 Markdown",
        value: "markdown",
        onClick: () => {
            handleExport("markdown");
        },
    },
];

/**
 * 导出处理函数
 * @param type 导出类型: 'pdf' | 'markdown'
 */
function handleExport(type: string = "pdf") {
    if (type === "markdown") {
        exportToMarkdown();
    } else if (type === "pdf") {
        emits("export-pdf", editor.value);
    }
}

/**
 * 导出为 Markdown
 */
function exportToMarkdown() {
    const blob = new Blob([props.modelValue], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // 生成文件名(使用当前时间戳)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    a.download = `editor-content-${timestamp}.md`;

    a.click();
    URL.revokeObjectURL(url);
}

/**
 * 导出为 PDF
 * 使用 html2canvas 将编辑器内容转换为图片,然后使用 jsPDF 生成 PDF
 * 动态导入库以避免 SSR 问题
 */
// async function exportToPDF() {
//     if (!editor.value) return;

//     isExporting.value = true;

//     try {
//         // 动态导入库(仅在客户端执行)
//         const [html2canvas, jsPDF] = await Promise.all([
//             import("html2canvas").then((m) => m.default),
//             import("jspdf").then((m) => m.default),
//         ]);

//         // 获取编辑器内容的 DOM 元素
//         const editorElement = document.querySelector(".tiptap") as HTMLElement;
//         if (!editorElement) {
//             console.error("未找到编辑器元素");
//             return;
//         }

//         // 使用 html2canvas 将内容转换为 canvas
//         const canvas = await html2canvas(editorElement, {
//             scale: 2, // 提高清晰度
//             useCORS: true, // 允许跨域图片
//             logging: false,
//             backgroundColor: "#ffffff",
//             onclone: (clonedDoc) => {
//                 // 在克隆的文档中替换不支持的颜色格式
//                 const clonedElement = clonedDoc.querySelector(".tiptap") as HTMLElement;
//                 if (clonedElement) {
//                     // 移除所有样式表,避免 oklch 颜色被解析
//                     const styleSheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
//                     styleSheets.forEach((sheet) => sheet.remove());

//                     // 强制设置基础样式
//                     clonedElement.style.cssText = `
//                         background-color: #ffffff !important;
//                         color: #000000 !important;
//                         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
//                         font-size: 14px !important;
//                         line-height: 1.7 !important;
//                         padding: 20px !important;
//                     `;

//                     // 遍历所有子元素,设置基础样式
//                     const allElements = clonedElement.querySelectorAll("*");
//                     allElements.forEach((el: Element) => {
//                         const htmlEl = el as HTMLElement;
//                         const tagName = htmlEl.tagName.toLowerCase();

//                         // 根据标签类型设置样式
//                         if (tagName === "p") {
//                             htmlEl.style.cssText =
//                                 "margin: 0 0 12px 0; color: #000000;font-size: 24px;line-height: 1.7;";
//                         } else if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
//                             htmlEl.style.cssText =
//                                 "margin: 16px 0 8px 0; font-weight: 600; color: #000000;";
//                         } else if (["ul", "ol"].includes(tagName)) {
//                             htmlEl.style.cssText =
//                                 "margin: 8px 0; padding-left: 20px; color: #000000;";
//                         } else if (tagName === "li") {
//                             htmlEl.style.cssText = "margin: 4px 0; color: #000000;";
//                         } else if (tagName === "blockquote") {
//                             htmlEl.style.cssText =
//                                 "border-left: 3px solid #cccccc; padding-left: 12px; margin: 12px 0; color: #666666;";
//                         } else if (tagName === "code") {
//                             htmlEl.style.cssText =
//                                 "background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #000000;";
//                         } else if (tagName === "pre") {
//                             htmlEl.style.cssText =
//                                 "background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; margin: 12px 0;";
//                         } else if (tagName === "a") {
//                             htmlEl.style.cssText = "color: #0066cc; text-decoration: underline;";
//                         } else if (tagName === "img") {
//                             htmlEl.style.cssText =
//                                 "max-width: 100%; height: auto; display: block; margin: 12px 0;";
//                         } else {
//                             htmlEl.style.color = "#000000";
//                             htmlEl.style.backgroundColor = "transparent";
//                         }
//                     });
//                 }
//             },
//         });

//         // 获取 canvas 的尺寸
//         const imgWidth = 210; // A4 纸宽度 (mm)
//         const pageHeight = 297; // A4 纸高度 (mm)
//         const imgHeight = (canvas.height * imgWidth) / canvas.width;
//         let heightLeft = imgHeight;

//         // 创建 PDF 文档
//         const pdf = new jsPDF("p", "mm", "a4");
//         let position = 0;

//         // 将 canvas 转换为图片数据
//         const imgData = canvas.toDataURL("image/png");

//         // 添加第一页
//         pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
//         heightLeft -= pageHeight;

//         // 如果内容超过一页,添加更多页面
//         while (heightLeft > 0) {
//             position = heightLeft - imgHeight;
//             pdf.addPage();
//             pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
//             heightLeft -= pageHeight;
//         }

//         // 生成文件名(使用当前时间戳)
//         const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
//         const filename = `editor-content-${timestamp}.pdf`;

//         // 下载 PDF
//         pdf.save(filename);
//     } catch (error) {
//         console.error("导出 PDF 失败:", error);
//     } finally {
//         isExporting.value = false;
//     }
// }

// 暴露方法给父组件使用
defineExpose({
    editor,
    getMarkdownContent,
    setMarkdownContent,
    insertMarkdownSyntax,
    getCurrentContent,
});
</script>

<template>
    <div
        class="bd-editor rounded-md border border-gray-200/60 dark:border-gray-700/60"
        :class="customClass"
    >
        <!-- Toolbar -->
        <div
            class="flex flex-wrap items-center gap-1 border-b border-gray-200/60 p-2 dark:border-gray-700/60"
        >
            <!-- Inline style -->
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('bold') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleBold().run()"
                @click="toggleMark('bold')"
            >
                B
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('italic') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleItalic().run()"
                @click="toggleMark('italic')"
            >
                <i>I</i>
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('underline') ? 'soft' : 'ghost'"
                @click="toggleMark('underline')"
            >
                <u>U</u>
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('strike') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleStrike().run()"
                @click="toggleMark('strike')"
            >
                <s>S</s>
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('code') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleCode().run()"
                @click="toggleInlineCode"
            >
                <UIcon name="i-lucide-code" size="16" />
            </UButton>
            <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></span>

            <!-- Paragraph and title -->
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('paragraph') ? 'soft' : 'ghost'"
                @click="setParagraph"
                >P</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 1 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 1 }).run()"
                @click="setHeading(1)"
                >H1</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 2 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 2 }).run()"
                @click="setHeading(2)"
                >H2</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 3 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 3 }).run()"
                @click="setHeading(3)"
                >H3</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 4 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 4 }).run()"
                @click="setHeading(4)"
                >H4</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 5 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 5 }).run()"
                @click="setHeading(5)"
                >H5</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('heading', { level: 6 }) ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleHeading({ level: 6 }).run()"
                @click="setHeading(6)"
                >H6</UButton
            >
            <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></span>

            <!-- List/quote/code block -->
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('bulletList') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleBulletList().run()"
                @click="toggleBulletList"
                ><UIcon name="i-lucide-list" size="16"
            /></UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('orderedList') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleOrderedList().run()"
                @click="toggleOrderedList"
                ><UIcon name="i-lucide-list-ordered" size="16"
            /></UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('blockquote') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleBlockquote().run()"
                @click="toggleBlockquote"
                >“”</UButton
            >
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('codeBlock') ? 'soft' : 'ghost'"
                :disabled="!editor?.can().chain().focus().toggleCodeBlock().run()"
                @click="toggleCodeBlock"
                ><UIcon name="i-lucide-code-xml" size="16"
            /></UButton>
            <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></span>

            <!-- Image and clean -->
            <UButton size="xs" color="neutral" variant="soft" @click="handlePickAndInsertImage">
                {{ t("common.proEditor.img") }}
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="clearMarks">
                {{ t("common.proEditor.clearMarks") }}
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" @click="clearNodes">
                {{ t("common.proEditor.clearNodes") }}
            </UButton>
            <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></span>

            <!-- Undo/redo and separator -->
            <UButton
                color="neutral"
                size="xs"
                :variant="'ghost'"
                :disabled="!editor?.can().chain().focus().undo().run()"
                @click="undo"
            >
                {{ t("common.proEditor.undo") }}
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="'ghost'"
                :disabled="!editor?.can().chain().focus().redo().run()"
                @click="redo"
            >
                {{ t("common.proEditor.redo") }}
            </UButton>
            <span class="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700"></span>

            <!-- Horizontal line/hard carriage/color example -->
            <UButton size="xs" color="neutral" :variant="'ghost'" @click="insertHorizontalRule">
                HR
            </UButton>
            <UButton size="xs" color="neutral" :variant="'ghost'" @click="insertHardBreak">
                BR
            </UButton>
            <UButton
                color="neutral"
                size="xs"
                :variant="editor?.isActive('textStyle', { color: '#958DF1' }) ? 'soft' : 'ghost'"
                @click="setTextColor('#958DF1')"
            >
                {{ t("common.proEditor.purple") }}
            </UButton>
        </div>

        <!-- Editor area -->
        <div class="min-h-48 p-3">
            <EditorContent v-if="editor" class="tiptap" :editor="editor as any" />
        </div>

        <div v-if="enableExport" class="flex items-center justify-between p-3">
            <div v-if="enableAutoSave" class="flex items-center gap-2 text-sm text-gray-500">
                <UIcon
                    v-if="isAutoSaving"
                    name="i-tabler-loader"
                    class="animate-spin"
                    style="animation-duration: 2s"
                />
                <UIcon v-else name="i-tabler-check" />
                <span>
                    {{ isAutoSaving ? "自动保存中..." : "已自动保存" }}
                </span>
            </div>
            <UButtonGroup>
                <UButton
                    color="primary"
                    variant="solid"
                    :loading="isExporting"
                    :disabled="isExporting"
                    @click="handleExport()"
                >
                    {{ isExporting ? "导出中..." : "导出 PDF" }}
                </UButton>
                <UDropdownMenu :items="items" :disabled="isExporting">
                    <UButton
                        color="primary"
                        variant="solid"
                        icon="i-lucide-chevron-down"
                        :disabled="isExporting"
                    />
                </UDropdownMenu>
            </UButtonGroup>
        </div>
    </div>
</template>

<style lang="scss">
/* Editor scoped base styles: avoid global CSS overrides */
.bd-editor {
    .tiptap {
        line-height: 1.7 !important;
        word-wrap: break-word !important;

        &:focus {
            outline: none !important;
        }

        p {
            margin: 0 0 0.75rem !important;
        }
        p:last-child {
            margin-bottom: 0 !important;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
            margin: 1rem 0 0.5rem !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
        }
        h1 {
            font-size: 1.5rem !important;
        }
        h2 {
            font-size: 1.35rem !important;
        }
        h3 {
            font-size: 1.2rem !important;
        }
        h4 {
            font-size: 1.1rem !important;
        }
        h5,
        h6 {
            font-size: 1rem !important;
        }

        ul,
        ol {
            padding-left: 1.25rem !important;
            margin: 0.5rem 0 0.75rem !important;
        }
        ul {
            list-style: disc !important;
        }
        ol {
            list-style: decimal !important;
        }
        li {
            margin: 0.25rem 0 !important;
        }

        a {
            color: #2563eb !important; /* blue-600 */
            text-decoration: underline !important;
            text-underline-offset: 2px !important;
        }
        a:hover {
            opacity: 0.9 !important;
        }

        code {
            font-family:
                ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
                "Courier New", monospace !important;
            background-color: #f3f4f6 !important; /* gray-100 */
            border-radius: 4px !important;
            padding: 0.15em 0.35em !important;
            font-size: 0.9em !important;
        }
        pre {
            background-color: #111827 !important; /* gray-900 */
            color: #e5e7eb !important; /* gray-200 */
            border-radius: 6px !important;
            padding: 0.75rem 1rem !important;
            overflow: auto !important;
            margin: 0.75rem 0 1rem !important;
        }
        pre code {
            background: transparent !important;
            color: inherit !important;
            padding: 0 !important;
            font-size: 0.95em !important;
        }

        blockquote {
            border-left: 3px solid #e5e7eb !important; /* gray-200 */
            padding-left: 0.75rem !important;
            margin: 0.75rem 0 !important;
            color: inherit !important;
        }

        hr {
            border: 0 !important;
            border-top: 1px solid #e5e7eb !important; /* gray-200 */
            margin: 1rem 0 !important;
        }

        img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 6px !important;
            display: inline-block !important;
        }

        table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin: 0.75rem 0 !important;
        }
        th,
        td {
            border: 1px solid #e5e7eb !important; /* gray-200 */
            padding: 0.5rem 0.75rem !important;
            text-align: left !important;
        }
        thead th {
            background: #f9fafb !important; /* gray-50 */
        }

        /* Placeholder support (tiptap Placeholder extension) */
        .is-empty::before {
            content: attr(data-placeholder);
            color: #9ca3af; /* gray-400 */
            float: left;
            height: 0;
            pointer-events: none;
        }
    }
}
</style>
