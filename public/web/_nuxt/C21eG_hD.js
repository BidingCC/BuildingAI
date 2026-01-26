import{d as S,s as w,n as b,c as a,o as r,x as e,z as n,t as d,B as z,F as C,E as _,C as g,g as o,A as D,y as f,w as E}from"#entry";import{_ as L}from"./CnxT3uvZ.js";import{_ as I}from"./Cie-o9Wa.js";import"./DbqqhwXM.js";import"./DNSLGqNg.js";import"./psimjGaX.js";import"./CuVAPZQ8.js";import"./B3rWqoNg.js";import"./EK7Wbu3-.js";import"./TrJvDfxI.js";import"./jsPNKUA0.js";import"./abPSHzII.js";const H={class:"space-y-4"},M={class:"mb-2 text-lg font-medium"},T={class:"text-muted-foreground text-sm"},j={key:0,class:"border-border rounded-lg border p-6 text-center"},W={class:"mb-2 font-medium"},P={class:"text-muted-foreground text-sm"},R={key:1,class:"space-y-4"},A={class:"flex border-b"},N=["onClick"],U={class:"space-y-4"},V={key:0,class:"space-y-4"},J={class:"space-y-3"},K={class:"mb-1 font-medium"},F={class:"text-muted-foreground text-sm"},q={class:"flex flex-wrap gap-4"},G=["onClick"],Q={key:0,class:"bg-primary absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full"},Z={class:"w-full space-y-3"},ee={class:"flex items-center justify-between"},te={class:"font-medium"},ne={class:"bg-muted rounded-lg p-4 text-sm"},oe={class:"block whitespace-break-spaces"},ie={class:"text-muted-foreground text-xs"},se={key:1,class:"w-full space-y-3"},ae={class:"flex items-center justify-between"},re={class:"relative w-full"},de={class:"bg-muted max-h-96 w-full overflow-auto rounded-lg p-4 text-sm"},ce={class:"block whitespace-pre"},le={class:"text-muted-foreground text-xs"},pe={key:2,class:"w-full space-y-3"},ue={class:"flex items-center justify-between"},be={class:"font-medium"},fe={class:"relative w-full"},he={class:"bg-muted max-h-96 w-full overflow-auto rounded-lg p-4 text-sm"},ge={class:"block whitespace-pre"},me={class:"text-muted-foreground text-xs"},Se=S({__name:"embed-code",props:{agent:{}},setup(m){const x=m,l=w("iframe"),p=w("bottom-right"),s=b(()=>x.agent?.publishToken?`${window.location.origin}/public/agent/shared/${x.agent.publishToken}`:""),k=[{value:"fullscreen",label:"全屏嵌入",description:"智能体以全屏方式嵌入到页面中",icon:"bd:agent-embed-1"},{value:"bottom-right",label:"右下角悬浮",description:"右下角悬浮窗口，可收起和展开",icon:"bd:agent-embed-2"},{value:"right-middle",label:"右侧中部悬浮",description:"右侧中部悬浮窗口，可收起、展开和拖拽",icon:"bd:agent-embed-3"}],Y=t=>{if(!s.value)return"";const c="<!-- BuildingAI 智能体嵌入代码 -->";switch(t){case"fullscreen":return`${c}
<iframe
  src="${s.value}?embed=true&style=fullscreen"
  width="100%"
  height="100vh"
  frameborder="0"
  style="border: none; display: block;"
></iframe>`;case"bottom-right":return`${c}
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
            src="${s.value}?embed=true&style=bottom-right"
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
<\\/script>`;case"right-middle":return`${c}
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
            src="${s.value}?embed=true&style=right-middle"
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
<\\/script>`;default:return""}},v=b(()=>Y(p.value)),y=b(()=>s.value?`<!-- 使用 JavaScript SDK -->
<div id="chatbot-container"></div>
<script>
  window.BuildingAI = {
    init: function(options) {
      const iframe = document.createElement('iframe');
      iframe.src = '${s.value}?embed=true&sdk=true';
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
<\\/script>`:""),B=b(()=>s.value?`<!-- WordPress 短代码 -->
[buildingai_chatbot url="${s.value}" width="400" height="600"]

<!-- 或者直接使用 HTML -->
<div style="width: 400px; height: 600px;">
  <iframe
    src="${s.value}?embed=true"
    width="100%"
    height="100%"
    frameborder="0"
    style="border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); position: fixed; right: 50px; bottom: 50px; z-index: 999;"
  </iframe>
</div>`:""),X=[{value:"iframe",label:"iframe 嵌入",icon:"i-lucide-code"},{value:"javascript",label:"JavaScript SDK",icon:"i-lucide-braces"},{value:"wordpress",label:"WordPress",icon:"i-lucide-wordpress"}];return(t,c)=>{const u=z,h=L,O=I;return r(),a("div",H,[e("div",null,[e("h3",M,n(t.$t("ai-agent.backend.publish.embedCode")),1),e("p",T,n(t.$t("ai-agent.backend.publish.embedCodeDesc")),1)]),m.agent?.isPublished?(r(),a("div",R,[e("div",A,[(r(),a(C,null,_(X,i=>e("button",{key:i.value,class:g(["flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",o(l)===i.value?"border-primary text-primary border-b-2":"text-muted-foreground hover:text-foreground"]),onClick:$=>l.value=i.value},[d(u,{name:i.icon,class:"size-4"},null,8,["name"]),D(" "+n(i.label),1)],10,N)),64))]),e("div",U,[o(l)==="iframe"?(r(),a("div",V,[e("div",J,[e("div",null,[e("h4",K,n(t.$t("ai-agent.backend.publish.embedStyle")),1),e("p",F,n(t.$t("ai-agent.backend.publish.embedStyleDesc")),1)]),e("div",q,[(r(),a(C,null,_(k,i=>e("div",{key:i.value,class:g(["group relative flex h-48 w-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200",o(p)===i.value?"border-primary ring-primary/20 ring-2":"border-border hover:border-primary/60"]),onClick:$=>p.value=i.value},[o(p)===i.value?(r(),a("div",Q,[d(u,{name:"i-lucide-check",class:"size-3 text-white"})])):f("",!0),d(u,{name:i.icon,class:g(["size-full p-4 transition-opacity duration-200",o(p)===i.value?"opacity-100":"opacity-60 group-hover:opacity-80"])},null,8,["name","class"])],10,G)),64))])]),e("div",Z,[e("div",ee,[e("h4",te,n(t.$t("ai-agent.backend.publish.iframeCode")),1),d(h,{content:o(v),variant:"outline",size:"sm",copiedText:t.$t("console-common.messages.copySuccess"),"default-text":t.$t("console-common.copy")},null,8,["content","copiedText","default-text"])]),d(O,{horizontal:!0,vertical:!1},{default:E(()=>[e("pre",ne,[e("code",oe,n(o(v)),1)])]),_:1}),e("div",ie,[e("p",null,"• "+n(t.$t("ai-agent.backend.publish.iframeCodeDesc1")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.iframeCodeDesc2")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.iframeCodeDesc3")),1)])])])):f("",!0),o(l)==="javascript"?(r(),a("div",se,[e("div",ae,[c[0]||(c[0]=e("h4",{class:"font-medium"},"JavaScript SDK",-1)),d(h,{content:o(y),variant:"outline",size:"sm",copiedText:t.$t("console-common.messages.copySuccess"),"default-text":t.$t("console-common.copy")},null,8,["content","copiedText","default-text"])]),e("div",re,[e("pre",de,[e("code",ce,n(o(y)),1)])]),e("div",le,[e("p",null,"• "+n(t.$t("ai-agent.backend.publish.javascriptCodeDesc1")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.javascriptCodeDesc2")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.javascriptCodeDesc3")),1)])])):f("",!0),o(l)==="wordpress"?(r(),a("div",pe,[e("div",ue,[e("h4",be,n(t.$t("ai-agent.backend.publish.wordpressCode")),1),d(h,{content:o(B),variant:"outline",size:"sm",copiedText:t.$t("console-common.messages.copySuccess"),"default-text":t.$t("console-common.copy")},null,8,["content","copiedText","default-text"])]),e("div",fe,[e("pre",he,[e("code",ge,n(o(B)),1)])]),e("div",me,[e("p",null,"• "+n(t.$t("ai-agent.backend.publish.wordpressCodeDesc1")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.wordpressCodeDesc2")),1),e("p",null,"• "+n(t.$t("ai-agent.backend.publish.wordpressCodeDesc3")),1)])])):f("",!0)])])):(r(),a("div",j,[d(u,{name:"i-lucide-lock",class:"text-muted-foreground mx-auto mb-3 size-12"}),e("h4",W,n(t.$t("ai-agent.backend.publish.unpublished")),1),e("p",P,n(t.$t("ai-agent.backend.publish.unpublishedDesc2")),1)]))])}}});export{Se as default};
