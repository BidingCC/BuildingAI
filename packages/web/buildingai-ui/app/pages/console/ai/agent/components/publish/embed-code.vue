<script setup lang="ts">
import type { Agent } from "@buildingai/service/consoleapi/ai-agent";

const props = defineProps<{
    agent?: Agent;
}>();

const activeTab = shallowRef("iframe");
const selectedEmbedStyle = shallowRef<"fullscreen" | "bottom-right" | "right-middle">(
    "bottom-right",
);

const publishUrl = computed(() => {
    if (!props.agent?.publishToken) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/agent/shared/${props.agent.publishToken}`;
});

/**
 * 嵌入样式配置
 */
const embedStyles = [
    {
        value: "fullscreen" as const,
        label: "全屏嵌入",
        description: "智能体以全屏方式嵌入到页面中",
        icon: "bd:agent-embed-1",
    },
    {
        value: "bottom-right" as const,
        label: "右下角悬浮",
        description: "右下角悬浮窗口，可收起和展开",
        icon: "bd:agent-embed-2",
    },
    {
        value: "right-middle" as const,
        label: "右侧中部悬浮",
        description: "右侧中部悬浮窗口，可收起、展开和拖拽",
        icon: "bd:agent-embed-3",
    },
];

/**
 * 生成 iframe 代码
 */
const generateIframeCode = (style: typeof selectedEmbedStyle.value): string => {
    if (!publishUrl.value) return "";

    const baseCode = `<!-- BuildingAI 智能体嵌入代码 -->`;

    switch (style) {
        case "fullscreen":
            return `${baseCode}
<iframe
  src="${publishUrl.value}?embed=true&style=fullscreen"
  width="100%"
  height="100vh"
  frameborder="0"
  style="border: none; display: block;"
></iframe>`;

        case "bottom-right":
            return `${baseCode}
<!-- 聊天窗口容器 -->
<div id="chatbot-container">
    <style>
        /* 聊天窗口容器样式 */
        #chatbot-container {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 9999;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
        #chatbot-container.hidden {
            transform: translateY(calc(100% + 24px));
            opacity: 0;
            pointer-events: none;
        }
        .iframe-wrapper {
            position: relative;
            width: 400px;
            height: 600px;
        }
        #buildingai-chatbot-iframe {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 12px;
            display: block;
        }
        .chatbot-controls {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10000;
        }
        /* 关闭按钮样式 */
        #close-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #d0d0d0;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: relative;
            padding: 0;
        }
        #close-btn::before,
        #close-btn::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 1.5px;
            background: #ffffff;
            border-radius: 1px;
            transition: all 0.2s ease;
        }
        #close-btn::before {
            transform: rotate(45deg);
        }
        #close-btn::after {
            transform: rotate(-45deg);
        }
        #close-btn:hover {
            background: #b0b0b0;
            transform: rotate(90deg);
        }
        #close-btn:active {
            transform: scale(0.95) rotate(90deg);
        }
        /* 打开按钮样式 */
        #open-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #d0d0d0;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 9998;
            padding: 0;
        }
        #open-btn::before {
            content: '';
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-top: none;
            border-right: none;
            border-radius: 0 0 0 6px;
            transform: rotate(-45deg);
            position: relative;
            top: -2px;
            transition: all 0.2s ease;
        }
        #open-btn::after {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
        }
        #open-btn:hover {
            background: #b0b0b0;
            transform: scale(1.05);
        }
        #open-btn:active {
            transform: scale(0.95);
        }
        #open-btn.hidden {
            display: none;
        }
    </style>
    <div class="iframe-wrapper">
        <iframe
            src="${publishUrl.value}?embed=true&style=bottom-right"
            width="400"
            height="600"
            frameborder="0"
            id="buildingai-chatbot-iframe"
        ></iframe>
        <!-- 关闭按钮 -->
        <div class="chatbot-controls">
            <button id="close-btn" aria-label="关闭聊天窗口"></button>
        </div>
    </div>
</div>
<!-- 打开按钮（初始隐藏） -->
<button id="open-btn" class="hidden" aria-label="打开聊天窗口"></button>
<script>
    /**
     * 聊天窗口控制脚本
     * 负责处理聊天窗口的显示和隐藏功能
     */
    (function() {
        'use strict';
        // 获取 DOM 元素
        const chatbotContainer = document.getElementById('chatbot-container');
        const closeBtn = document.getElementById('close-btn');
        const openBtn = document.getElementById('open-btn');
        /**
         * 关闭聊天窗口
         */
        function closeChatbot() {
            chatbotContainer.classList.add('hidden');
            openBtn.classList.remove('hidden');
        }
        /**
         * 打开聊天窗口
         */
        function openChatbot() {
            chatbotContainer.classList.remove('hidden');
            openBtn.classList.add('hidden');
        }
        // 绑定事件监听器
        closeBtn.addEventListener('click', closeChatbot);
        openBtn.addEventListener('click', openChatbot);
        // 键盘快捷键支持（ESC 键关闭）
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && !chatbotContainer.classList.contains('hidden')) {
                closeChatbot();
            }
        });
    })();
<\\/script>`;

        case "right-middle":
            return `${baseCode}
<!-- 聊天窗口容器 -->
<div id="chatbot-container">
    <style>
        /* 聊天窗口容器样式 */
        #chatbot-container {
            position: fixed;
            right: 24px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 9999;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            overflow: hidden;
        }
        #chatbot-container.dragging {
            transition: none;
        }
        #chatbot-container.hidden {
            transform: translateY(calc(100% + 24px));
            opacity: 0;
            pointer-events: none;
        }
        .iframe-wrapper {
            position: relative;
            padding-top: 18px;
            width: 400px;
            height: 600px;
        }
        /* 拖拽条样式 */
        .drag-handle {
            position: absolute;
            top: 0;
            left: 50%;
            right: 0;
            transform: translateX(-50%);
            width: 100px;
            height: 26px;
            cursor: move;
            z-index: 10001;
            border-radius: 12px 12px 0 0;
            background: transparent;
        }
        .drag-handle::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 4px;
            background: #d0d0d0;
            border-radius: 2px;
        }
        .drag-handle:hover::before {
            background: #b0b0b0;
        }
        #buildingai-chatbot-iframe {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 12px;
            display: block;
        }
        .chatbot-controls {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10000;
        }
        /* 关闭按钮样式 */
        #close-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #d0d0d0;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: relative;
            padding: 0;
        }
        #close-btn::before,
        #close-btn::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 1.5px;
            background: #ffffff;
            border-radius: 1px;
            transition: all 0.2s ease;
        }
        #close-btn::before {
            transform: rotate(45deg);
        }
        #close-btn::after {
            transform: rotate(-45deg);
        }
        #close-btn:hover {
            background: #b0b0b0;
            transform: rotate(90deg);
        }
        #close-btn:active {
            transform: scale(0.95) rotate(90deg);
        }
        /* 打开按钮样式 */
        #open-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #d0d0d0;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            position: fixed;
            z-index: 9998;
            padding: 0;
        }
        #open-btn.dragging {
            transition: none;
        }
        #open-btn::before {
            content: '';
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-top: none;
            border-right: none;
            border-radius: 0 0 0 6px;
            transform: rotate(-45deg);
            position: relative;
            top: -2px;
            transition: all 0.2s ease;
        }
        #open-btn::after {
            content: '';
            position: absolute;
            width: 18px;
            height: 18px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.2s ease;
        }
        #open-btn:hover {
            background: #b0b0b0;
            transform: scale(1.05);
        }
        #open-btn:active {
            transform: scale(0.95);
        }
        #open-btn.hidden {
            display: none;
        }
    </style>
    <div class="iframe-wrapper">
        <!-- 拖拽条 -->
        <div class="drag-handle" id="drag-handle"></div>
        <!-- BuildingAI 智能体嵌入代码 -->
        <iframe
            src="${publishUrl.value}?embed=true&style=right-middle"
            width="400"
            height="600"
            frameborder="0"
            id="buildingai-chatbot-iframe"
        ></iframe>
        <!-- 关闭按钮 -->
        <div class="chatbot-controls">
            <button id="close-btn" aria-label="关闭聊天窗口"></button>
        </div>
    </div>
</div>
<!-- 打开按钮（初始隐藏） -->
<button id="open-btn" class="hidden" aria-label="打开聊天窗口"></button>
<script>
    /**
     * 聊天窗口控制脚本
     * 负责处理聊天窗口的显示和隐藏功能，以及拖拽功能
     */
    (function() {
        'use strict';
        // 获取 DOM 元素
        const chatbotContainer = document.getElementById('chatbot-container');
        const closeBtn = document.getElementById('close-btn');
        const openBtn = document.getElementById('open-btn');
        const dragHandle = document.getElementById('drag-handle');
        // 容器拖拽相关变量
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;
        // 打开按钮拖拽相关变量
        let isOpenBtnDragging = false;
        let openBtnCurrentX = 0;
        let openBtnCurrentY = 0;
        let openBtnInitialX = 0;
        let openBtnInitialY = 0;
        let openBtnXOffset = 0;
        let openBtnYOffset = 0;
        let openBtnHasMoved = false;
        /**
         * 关闭聊天窗口
         */
        function closeChatbot() {
            // 记录容器位置
            const rect = chatbotContainer.getBoundingClientRect();
            const containerRight = rect.right;
            const containerTop = rect.top;
            // 计算打开按钮位置（容器右上角）
            const btnSize = 56;
            openBtnXOffset = containerRight - btnSize;
            openBtnYOffset = containerTop;
            // 设置打开按钮位置
            openBtn.style.left = openBtnXOffset + 'px';
            openBtn.style.top = openBtnYOffset + 'px';
            openBtn.style.right = 'auto';
            openBtn.style.bottom = 'auto';
            chatbotContainer.classList.add('hidden');
            openBtn.classList.remove('hidden');
        }
        /**
         * 打开聊天窗口
         */
        function openChatbot() {
            // 恢复容器位置（从打开按钮位置计算）
            const btnSize = 56;
            const containerWidth = 400;
            xOffset = openBtnXOffset + btnSize - containerWidth;
            yOffset = openBtnYOffset;
            setTranslate(xOffset, yOffset, chatbotContainer);
            chatbotContainer.classList.remove('hidden');
            openBtn.classList.add('hidden');
        }
        /**
         * 初始化容器位置
         */
        function initPosition() {
            const rect = chatbotContainer.getBoundingClientRect();
            xOffset = rect.left;
            yOffset = rect.top;
            // 移除 right 和 bottom，使用 left 和 top 定位
            chatbotContainer.style.left = xOffset + 'px';
            chatbotContainer.style.top = yOffset + 'px';
            chatbotContainer.style.right = 'auto';
            chatbotContainer.style.bottom = 'auto';
            chatbotContainer.style.transform = 'none';
        }
        /**
         * 开始拖拽容器
         */
        function dragStart(e) {
            // 如果点击的是关闭按钮，不触发拖拽
            if (e.target === closeBtn || closeBtn.contains(e.target)) {
                return;
            }
            if (e.type === 'touchstart') {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }
            if (e.target === dragHandle || dragHandle.contains(e.target)) {
                isDragging = true;
                chatbotContainer.classList.add('dragging');
            }
        }
        /**
         * 开始拖拽打开按钮
         */
        function openBtnDragStart(e) {
            if (e.type === 'touchstart') {
                openBtnInitialX = e.touches[0].clientX - openBtnXOffset;
                openBtnInitialY = e.touches[0].clientY - openBtnYOffset;
            } else {
                openBtnInitialX = e.clientX - openBtnXOffset;
                openBtnInitialY = e.clientY - openBtnYOffset;
            }
            isOpenBtnDragging = true;
            openBtnHasMoved = false;
            openBtn.classList.add('dragging');
        }
        /**
         * 拖拽中
         */
        function drag(e) {
            e.preventDefault();
            // 容器拖拽
            if (isDragging) {
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }
                // 边界检测
                const containerRect = chatbotContainer.getBoundingClientRect();
                const containerWidth = containerRect.width;
                const containerHeight = containerRect.height;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                // 限制在视口内
                currentX = Math.max(0, Math.min(currentX, windowWidth - containerWidth));
                currentY = Math.max(0, Math.min(currentY, windowHeight - containerHeight));
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, chatbotContainer);
            }
            // 打开按钮拖拽
            if (isOpenBtnDragging) {
                if (e.type === 'touchmove') {
                    openBtnCurrentX = e.touches[0].clientX - openBtnInitialX;
                    openBtnCurrentY = e.touches[0].clientY - openBtnInitialY;
                } else {
                    openBtnCurrentX = e.clientX - openBtnInitialX;
                    openBtnCurrentY = e.clientY - openBtnInitialY;
                }
                // 标记已移动
                if (Math.abs(openBtnCurrentX - openBtnXOffset) > 2 || Math.abs(openBtnCurrentY - openBtnYOffset) > 2) {
                    openBtnHasMoved = true;
                }
                // 边界检测
                const btnSize = 56;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                // 限制在视口内
                openBtnCurrentX = Math.max(0, Math.min(openBtnCurrentX, windowWidth - btnSize));
                openBtnCurrentY = Math.max(0, Math.min(openBtnCurrentY, windowHeight - btnSize));
                openBtnXOffset = openBtnCurrentX;
                openBtnYOffset = openBtnCurrentY;
                setTranslate(openBtnCurrentX, openBtnCurrentY, openBtn);
            }
        }
        /**
         * 结束拖拽
         */
        function dragEnd() {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                chatbotContainer.classList.remove('dragging');
            }
            if (isOpenBtnDragging) {
                openBtnInitialX = openBtnCurrentX;
                openBtnInitialY = openBtnCurrentY;
                isOpenBtnDragging = false;
                openBtn.classList.remove('dragging');
                // 延迟重置移动标记，避免点击事件误触发
                setTimeout(function() {
                    openBtnHasMoved = false;
                }, 10);
            }
        }
        /**
         * 设置元素位置
         */
        function setTranslate(xPos, yPos, el) {
            el.style.left = xPos + 'px';
            el.style.top = yPos + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
        // 初始化位置
        initPosition();
        // 初始化打开按钮位置（默认右侧中间）
        const btnSize = 56;
        openBtnXOffset = window.innerWidth - btnSize - 24;
        openBtnYOffset = window.innerHeight / 2 - btnSize / 2;
        openBtn.style.left = openBtnXOffset + 'px';
        openBtn.style.top = openBtnYOffset + 'px';
        openBtn.style.right = 'auto';
        openBtn.style.bottom = 'auto';
        // 绑定事件监听器
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeChatbot();
        });
        openBtn.addEventListener('click', function(e) {
            // 如果拖拽移动了，不触发打开
            if (!openBtnHasMoved) {
                openChatbot();
            }
        });
        // 容器拖拽事件监听
        dragHandle.addEventListener('mousedown', dragStart);
        dragHandle.addEventListener('touchstart', dragStart);
        // 打开按钮拖拽事件监听
        openBtn.addEventListener('mousedown', openBtnDragStart);
        openBtn.addEventListener('touchstart', openBtnDragStart);
        // 全局拖拽事件监听
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
        // 键盘快捷键支持（ESC 键关闭）
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && !chatbotContainer.classList.contains('hidden')) {
                closeChatbot();
            }
        });
    })();
<\\/script>`;

        default:
            return "";
    }
};

/**
 * 根据选择的样式生成对应的 iframe 代码
 */
const iframeCode = computed(() => {
    return generateIframeCode(selectedEmbedStyle.value);
});

/**
 * JavaScript SDK 代码
 */
const jsCode = computed(() => {
    if (!publishUrl.value) return "";
    return `<!-- 使用 JavaScript SDK -->
<div id="chatbot-container"></div>
<script>
  window.BuildingAI = {
    init: function(options) {
      const iframe = document.createElement('iframe');
      iframe.src = '${publishUrl.value}?embed=true&sdk=true';
      iframe.width = options.width || '400px';
      iframe.height = options.height || '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '10px';
      iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';

      const container = document.querySelector(options.container);
      if (container) {
        container.appendChild(iframe);
      }
    }
  };

  // 初始化智能体
  BuildingAI.init({
    container: '#chatbot-container',
    width: '400px',
    height: '600px'
  });
<\\/script>`;
});

/**
 * WordPress 代码
 */
const wordpressCode = computed(() => {
    if (!publishUrl.value) return "";
    return `<!-- WordPress 短代码 -->
[buildingai_chatbot url="${publishUrl.value}" width="400" height="600"]

<!-- 或者直接使用 HTML -->
<div style="width: 400px; height: 600px;">
  <iframe
    src="${publishUrl.value}?embed=true"
    width="100%"
    height="100%"
    frameborder="0"
    style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: fixed; right: 50px; bottom: 50px; z-index: 999;"
  </iframe>
</div>`;
});

const tabs = [
    { value: "iframe", label: "iframe 嵌入", icon: "i-lucide-code" },
    { value: "javascript", label: "JavaScript SDK", icon: "i-lucide-braces" },
    { value: "wordpress", label: "WordPress", icon: "i-lucide-wordpress" },
];
</script>

<template>
    <div class="space-y-4">
        <div>
            <h3 class="mb-2 text-lg font-medium">{{ $t("ai-agent.backend.publish.embedCode") }}</h3>
            <p class="text-muted-foreground text-sm">
                {{ $t("ai-agent.backend.publish.embedCodeDesc") }}
            </p>
        </div>

        <div v-if="!agent?.isPublished" class="border-border rounded-lg border p-6 text-center">
            <UIcon name="i-lucide-lock" class="text-muted-foreground mx-auto mb-3 size-12" />
            <h4 class="mb-2 font-medium">{{ $t("ai-agent.backend.publish.unpublished") }}</h4>
            <p class="text-muted-foreground text-sm">
                {{ $t("ai-agent.backend.publish.unpublishedDesc2") }}
            </p>
        </div>

        <div v-else class="space-y-4">
            <!-- 标签页 -->
            <div class="flex border-b">
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    :class="[
                        'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                        activeTab === tab.value
                            ? 'border-primary text-primary border-b-2'
                            : 'text-muted-foreground hover:text-foreground',
                    ]"
                    @click="activeTab = tab.value"
                >
                    <UIcon :name="tab.icon" class="size-4" />
                    {{ tab.label }}
                </button>
            </div>

            <!-- 代码内容 -->
            <div class="space-y-4">
                <!-- iframe 嵌入 -->
                <div v-if="activeTab === 'iframe'" class="space-y-4">
                    <!-- 嵌入样式选择 -->
                    <div class="space-y-3">
                        <div>
                            <h4 class="mb-1 font-medium">
                                {{ $t("ai-agent.backend.publish.embedStyle") }}
                            </h4>
                            <p class="text-muted-foreground text-sm">
                                {{ $t("ai-agent.backend.publish.embedStyleDesc") }}
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-4">
                            <div
                                v-for="style in embedStyles"
                                :key="style.value"
                                :class="[
                                    'group relative flex h-48 w-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200',
                                    selectedEmbedStyle === style.value
                                        ? 'border-primary ring-primary/20 ring-2'
                                        : 'border-border hover:border-primary/60',
                                ]"
                                @click="selectedEmbedStyle = style.value"
                            >
                                <!-- 选中指示器 -->
                                <div
                                    v-if="selectedEmbedStyle === style.value"
                                    class="bg-primary absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full"
                                >
                                    <UIcon name="i-lucide-check" class="size-3 text-white" />
                                </div>

                                <!-- SVG 图标占满卡片 -->
                                <UIcon
                                    :name="style.icon"
                                    :class="[
                                        'size-full p-4 transition-opacity duration-200',
                                        selectedEmbedStyle === style.value
                                            ? 'opacity-100'
                                            : 'opacity-60 group-hover:opacity-80',
                                    ]"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- 代码展示 -->
                    <div class="w-full space-y-3">
                        <div class="flex items-center justify-between">
                            <h4 class="font-medium">
                                {{ $t("ai-agent.backend.publish.iframeCode") }}
                            </h4>
                            <BdButtonCopy
                                :content="iframeCode"
                                variant="outline"
                                size="sm"
                                :copiedText="$t('console-common.messages.copySuccess')"
                                :default-text="$t('console-common.copy')"
                            />
                        </div>
                        <BdScrollArea :horizontal="true" :vertical="false">
                            <pre
                                class="bg-muted rounded-lg p-4 text-sm"
                            ><code class="block whitespace-break-spaces">{{ iframeCode }}</code></pre>
                        </BdScrollArea>
                        <div class="text-muted-foreground text-xs">
                            <p>• {{ $t("ai-agent.backend.publish.iframeCodeDesc1") }}</p>
                            <p>• {{ $t("ai-agent.backend.publish.iframeCodeDesc2") }}</p>
                            <p>• {{ $t("ai-agent.backend.publish.iframeCodeDesc3") }}</p>
                        </div>
                    </div>
                </div>

                <!-- JavaScript SDK -->
                <div v-if="activeTab === 'javascript'" class="w-full space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="font-medium">JavaScript SDK</h4>
                        <BdButtonCopy
                            :content="jsCode"
                            variant="outline"
                            size="sm"
                            :copiedText="$t('console-common.messages.copySuccess')"
                            :default-text="$t('console-common.copy')"
                        />
                    </div>
                    <div class="relative w-full">
                        <pre
                            class="bg-muted max-h-96 w-full overflow-auto rounded-lg p-4 text-sm"
                        ><code class="block whitespace-pre">{{ jsCode }}</code></pre>
                    </div>
                    <div class="text-muted-foreground text-xs">
                        <p>• {{ $t("ai-agent.backend.publish.javascriptCodeDesc1") }}</p>
                        <p>• {{ $t("ai-agent.backend.publish.javascriptCodeDesc2") }}</p>
                        <p>• {{ $t("ai-agent.backend.publish.javascriptCodeDesc3") }}</p>
                    </div>
                </div>

                <!-- WordPress -->
                <div v-if="activeTab === 'wordpress'" class="w-full space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="font-medium">
                            {{ $t("ai-agent.backend.publish.wordpressCode") }}
                        </h4>
                        <BdButtonCopy
                            :content="wordpressCode"
                            variant="outline"
                            size="sm"
                            :copiedText="$t('console-common.messages.copySuccess')"
                            :default-text="$t('console-common.copy')"
                        />
                    </div>
                    <div class="relative w-full">
                        <pre
                            class="bg-muted max-h-96 w-full overflow-auto rounded-lg p-4 text-sm"
                        ><code class="block whitespace-pre">{{ wordpressCode }}</code></pre>
                    </div>
                    <div class="text-muted-foreground text-xs">
                        <p>• {{ $t("ai-agent.backend.publish.wordpressCodeDesc1") }}</p>
                        <p>• {{ $t("ai-agent.backend.publish.wordpressCodeDesc2") }}</p>
                        <p>• {{ $t("ai-agent.backend.publish.wordpressCodeDesc3") }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
