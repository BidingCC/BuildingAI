<script>
import { DEFAULT_RETRY_INTERVAL, RETRY_BACKOFF_MULTIPLIER } from "../constant";
import { getLines, getMessages } from "../fetch-event-source/parse";

export default {
    props: {
        timeout: Number,
        heartbeatTimeout: Number,
        maxRetryCount: Number,
    },
    data() {
        return {
            onChunk: undefined,
            // 检测心跳定时器
            heartbeatTimer: null,
            // 超时定时器
            timeoutTimer: null,
            // 重试次数
            retryCount: 0,
            // 是否失败
            isFailed: false,
            manuallyStopped: false, // 新增: 是否为手动停止
        };
    },
    mounted() {
        // 初始化 onChunk 处理函数
        const onLine = getMessages(
            () => {},
            () => {},
            (line) => {
                this.$emit("onInnerMessage", line);
            },
        );
        this.onChunk = getLines(onLine);
    },
    methods: {
        /**
         * 清除所有定时器
         */
        clearTimers() {
            if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
            if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
        },

        /**
         * 内部停止(不标记手动), 用于超时/心跳异常等场景
         */
        internalStopChat() {
            this.clearTimers();
            if (this.requestTask) {
                this.requestTask.offChunkReceived(this.listener);
                this.requestTask.abort();
            }
        },
        /**
         * 停止聊天(手动), 不触发重试
         */
        stopChat() {
            this.manuallyStopped = true;
            this.internalStopChat();
        },

        /**
         * 启动聊天请求
         */
        startChat({ body, url, headers, method }) {
            this.clearTimers();
            this.retryCount = 0;
            this.manuallyStopped = false; // 重置手动停止标记
            this.doRequest({ body, url, headers, method });
        },

        /**
         * 执行请求并处理超时、心跳等
         */
        doRequest({ body, url, headers, method }) {
            console.log(`🔄 开始SSE连接，重试次数: ${this.retryCount}/${this.maxRetryCount}`);
            this.isFailed = false;
            this.manuallyStopped = false; // 每次真正发起请求前重置

            // 设置请求超时
            if (this.timeout) {
                this.timeoutTimer = setTimeout(() => {
                    this.internalStopChat(); // 改为内部停止
                    this.retry({ body, url, headers, method });
                    console.warn("⏰ SSE请求超时，主动断开连接");
                }, this.timeout);
            }

            this.requestTask = uni.request({
                url: url,
                method,
                header: {
                    Accept: "text/event-stream",
                    ...headers,
                },
                data: body,
                enableChunked: true,
                responseType: "arraybuffer",
                success: (res) => {
                    if (!res) return;
                    if (res.data instanceof ArrayBuffer) {
                        this.listener(res);
                    }
                },
                fail: (error) => {
                    if (this.manuallyStopped) return; // 手动停止时不重试不报错
                    this.$emit("onInnerError", error);
                    this.retry({ body, url, headers, method });
                    this.isFailed = true;
                },
                complete: () => {
                    this.clearTimers();
                    if (!this.isFailed) {
                        this.$emit("onInnerFinish");
                    }
                },
            });

            this.requestTask.onChunkReceived(this.listener);
            this.$emit("onInnerOpen", this.requestTask);

            // 设置心跳超时
            if (this.heartbeatTimeout) {
                this.resetHeartbeat({ body, url, headers, method });
            }
        },

        /**
         * 重置心跳定时器
         */
        resetHeartbeat(params) {
            if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = setTimeout(() => {
                console.warn("💔 SSE心跳超时，主动断开连接重连");
                this.internalStopChat(); // 改为内部停止
                this.$emit("onInnerError", { message: "心跳超时" });
                this.retry(params);
            }, this.heartbeatTimeout);
        },

        /**
         * 重试
         */
        retry(params) {
            if (this.manuallyStopped) {
                console.log("⏸️ 已手动停止，不再重试");
                return;
            }
            if (this.retryCount < this.maxRetryCount) {
                this.retryCount++;
                const backoffDelay =
                    DEFAULT_RETRY_INTERVAL *
                    Math.pow(RETRY_BACKOFF_MULTIPLIER, this.retryCount - 1);
                console.log(`🔄 将在 ${backoffDelay}ms 后进行第${this.retryCount}次重试`);
                setTimeout(() => {
                    this.doRequest(params);
                }, backoffDelay);
            } else {
                console.error("❌ 达到最大重试次数，停止重试");
                this.$emit("onInnerRetryuUpperlimit");
            }
        },

        /**
         * 数据监听回调，收到数据时重置心跳
         */
        listener({ data }) {
            // 收到数据，重置心跳
            if (this.heartbeatTimeout) {
                this.resetHeartbeat(arguments[0]);
            }
            const type = Object.prototype.toString.call(data);
            if (type === "[object Uint8Array]") {
            } else if (data instanceof ArrayBuffer) {
                data = new Uint8Array(data);
            }
            this.onChunk(data);
        },
    },
};
</script>

<template>
    <view />
</template>
