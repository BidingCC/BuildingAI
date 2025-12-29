import { DEFAULT_RETRY_INTERVAL, RETRY_BACKOFF_MULTIPLIER } from "../constant";

var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };
import { getBytes, getLines, getMessages } from "./parse";
export const EventStreamContentType = "text/event-stream";
const LastEventId = "last-event-id";
// 新增配置常量
const DEFAULT_TIMEOUT = 300000; // 5分钟超时
const HEARTBEAT_TIMEOUT = 120000; // 2分钟心跳超时
const MAX_RETRY_COUNT = 5; // 最大重试次数

export function fetchEventSource(input, _a, extend) {
    var {
            signal: inputSignal,
            headers: inputHeaders,
            onopen: inputOnOpen,
            onmessage,
            onRetryuUpperlimit,
            onclose,
            onerror,
            openWhenHidden,
            fetch: inputFetch,
            timeout = DEFAULT_TIMEOUT,
            heartbeatTimeout = HEARTBEAT_TIMEOUT,
        } = _a,
        rest = __rest(_a, [
            "signal",
            "headers",
            "onopen",
            "onmessage",
            "onclose",
            "onerror",
            "openWhenHidden",
            "fetch",
            "timeout",
            "heartbeatTimeout",
        ]);
    const { maxRetryCount = MAX_RETRY_COUNT } = extend;

    return new Promise((resolve, reject) => {
        const headers = Object.assign({}, inputHeaders);
        if (!headers.accept) {
            headers.accept = EventStreamContentType;
        }
        let curRequestController;
        let retryCount = 0; // 重试计数器
        let heartbeatTimer = null; // 心跳定时器
        let lastDataTime = Date.now(); // 最后接收数据的时间
        function onVisibilityChange() {
            curRequestController.abort();
            if (!document.hidden) {
                create();
            }
        }
        if (!openWhenHidden) {
            document.addEventListener("visibilitychange", onVisibilityChange);
        }
        let retryInterval = DEFAULT_RETRY_INTERVAL;
        let retryTimer = 0;
        function dispose() {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearTimeout(retryTimer);
            clearHeartbeatTimer();
            curRequestController.abort();
        }

        // 清理心跳定时器
        function clearHeartbeatTimer() {
            if (heartbeatTimer) {
                window.clearTimeout(heartbeatTimer);
                heartbeatTimer = null;
            }
        }

        // 重置心跳定时器
        function resetHeartbeatTimer() {
            clearHeartbeatTimer();
            lastDataTime = Date.now();
            heartbeatTimer = window.setTimeout(() => {
                console.warn("💔 SSE心跳超时，主动断开连接重连");
                curRequestController.abort();
                // 延迟重连，避免频繁重连
                retryTimer = window.setTimeout(create, 2000);
            }, heartbeatTimeout);
        }
        inputSignal === null || inputSignal === void 0
            ? void 0
            : inputSignal.addEventListener("abort", () => {
                  dispose();
                  resolve();
              });
        const fetch = inputFetch !== null && inputFetch !== void 0 ? inputFetch : window.fetch;
        const onopen = inputOnOpen !== null && inputOnOpen !== void 0 ? inputOnOpen : defaultOnOpen;
        async function create() {
            var _a;
            curRequestController = new AbortController();
            // 设置超时控制
            const timeoutId = window.setTimeout(() => {
                console.warn("⏰ SSE请求超时，主动断开连接");
                curRequestController.abort();
            }, timeout);
            try {
                console.log(`🔄 开始SSE连接，重试次数: ${retryCount}/${maxRetryCount}`);
                const response = await fetch(
                    input,
                    Object.assign(Object.assign({}, rest), {
                        headers,
                        signal: curRequestController.signal,
                    }),
                );
                if (response.ok === false) {
                    const errorText = await response.text();
                    throw new Error(errorText || `服务器异常`);
                }
                // 清除超时定时器
                window.clearTimeout(timeoutId);
                await onopen(response);
                // 重置重试计数器
                retryCount = 0;
                // 启动心跳监控
                resetHeartbeatTimer();
                await getBytes(
                    response.body,
                    getLines(
                        getMessages(
                            (id) => {
                                // 更新心跳
                                resetHeartbeatTimer();
                                if (id) {
                                    headers[LastEventId] = id;
                                } else {
                                    delete headers[LastEventId];
                                }
                            },
                            (retry) => {
                                retryInterval = retry;
                            },
                            (message) => {
                                // 每次收到消息都重置心跳
                                resetHeartbeatTimer();
                                // 调用原始的onmessage处理器
                                if (onmessage) {
                                    onmessage(message);
                                }
                            },
                        ),
                    ),
                );
                onclose === null || onclose === void 0 ? void 0 : onclose();
                dispose();
                resolve();
            } catch (err) {
                // 清除超时定时器
                window.clearTimeout(timeoutId);
                clearHeartbeatTimer();
                if (!curRequestController.signal.aborted) {
                    console.error(`❌ SSE连接错误 (第${retryCount + 1}次):`, err);
                    try {
                        // 检查是否应该重试
                        if (retryCount < maxRetryCount) {
                            retryCount++;
                            // 计算退避延迟
                            const backoffDelay =
                                retryInterval * Math.pow(RETRY_BACKOFF_MULTIPLIER, retryCount - 1);
                            const interval =
                                (_a =
                                    onerror === null || onerror === void 0
                                        ? void 0
                                        : onerror(err)) !== null && _a !== void 0
                                    ? _a
                                    : backoffDelay;
                            console.log(`🔄 将在 ${interval}ms 后进行第${retryCount}次重试`);
                            window.clearTimeout(retryTimer);
                            retryTimer = window.setTimeout(create, interval);
                        } else {
                            console.error("❌ 达到最大重试次数，停止重试");
                            onRetryuUpperlimit();
                            dispose();
                            reject(
                                new Error(`SSE连接失败，已重试${maxRetryCount}次: ${err.message}`),
                            );
                        }
                    } catch (innerErr) {
                        console.error("❌ 错误处理过程中发生异常:", innerErr);
                        dispose();
                        reject(innerErr);
                    }
                } else {
                    console.log("🛑 SSE连接被主动中止");
                }
            }
        }
        create();
    });
}
function defaultOnOpen(response) {
    const contentType = response.headers.get("content-type");
    if (
        !(contentType === null || contentType === void 0
            ? void 0
            : contentType.startsWith(EventStreamContentType))
    ) {
        throw new Error(
            `Expected content-type to be ${EventStreamContentType}, Actual: ${contentType}`,
        );
    }
}
