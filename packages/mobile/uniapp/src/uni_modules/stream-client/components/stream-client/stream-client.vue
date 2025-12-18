<script>
// #ifdef MP-WEIXIN || MP-ALIPAY
// #endif
// #ifdef APP-PLUS || H5 || APP-HARMONY
import ChatAppAndWeb from "./children/ChatAppAndWeb.vue";
import ChatWxApplet from "./children/ChatWxApplet.vue";
// #endif

export default {
    components: {
        // #ifdef MP-WEIXIN || MP-ALIPAY
        ChatWxApplet,
        // #endif

        // #ifdef APP-PLUS || H5 || APP-HARMONY
        ChatAppAndWeb,
        // #endif
    },

    props: {
        // 请求超时时间，单位毫秒
        timeout: {
            type: Number,
            default: 300000,
        },
        // 心跳超时时间，单位毫秒
        // 此参数保证客户端和SSE服务器之间的连接活跃。如果在 heartbeatTimeout 毫秒（比如 120000ms = 2分钟）内，没有收到任何数据或消息，就说明连接可能已经“挂掉”或服务器无响应，这时会主动断开连接并尝试重连。
        heartbeatTimeout: {
            type: Number,
            default: 120000,
        },
        // 最大重试次数
        maxRetryCount: {
            type: Number,
            default: 5,
        },
    },

    methods: {
        startChat(config) {
            config["method"] = (config["method"] || "post").toUpperCase();
            config["headers"] = config["headers"] || {};
            this.$refs["chatRef"].startChat(config);
        },

        stopChat(...args) {
            this.$refs["chatRef"].stopChat(...args);
        },

        open(...args) {
            this.$emit("onOpen", ...args);
        },
        message(msg) {
            this.$emit("onMessage", msg);
        },
        error(...args) {
            this.$emit("onError", ...args);
        },
        finish() {
            this.$emit("onFinish");
        },
        onRetryuUpperlimit() {
            this.$emit("onRetryuUpperlimit");
        },
    },
};
</script>

<template>
    <!--  #ifdef MP-WEIXIN || MP-ALIPAY -->
    <ChatWxApplet
        ref="chatRef"
        @onInnerOpen="open"
        @onInnerError="error"
        @onInnerMessage="message"
        @onInnerFinish="finish"
        @onInnerRetryuUpperlimit="onRetryuUpperlimit"
        :timeout="timeout"
        :heartbeatTimeout="heartbeatTimeout"
        :maxRetryCount="maxRetryCount"
    />
    <!--  #endif-->

    <!--  #ifdef APP-PLUS || H5 || APP-HARMONY  -->
    <ChatAppAndWeb
        ref="chatRef"
        @onInnerOpen="open"
        @onInnerError="error"
        @onInnerMessage="message"
        @onInnerFinish="finish"
        @onInnerRetryuUpperlimit="onRetryuUpperlimit"
        :timeout="timeout"
        :heartbeatTimeout="heartbeatTimeout"
        :maxRetryCount="maxRetryCount"
    />
    <!--  #endif-->
</template>
