interface PollingOptions {
    /** 轮询间隔时间（毫秒） */
    interval?: number;
    /** 最大尝试次数，默认为无限 */
    maxAttempts?: number;
    /** 最大等待时间（毫秒），默认为无限 */
    maxWaitTime?: number;
    /** 停止条件，可以是布尔值或函数 */
    stopCondition?: (() => boolean) | boolean;
    /** 任务结束时回调 */
    onEnded?: () => void;
}

export function usePollingTask(task: (stopFn: () => void) => any, options?: PollingOptions) {
    let intervalId: NodeJS.Timeout | null = null;
    let attempt = 0; // 当前尝试次数
    const interval = options?.interval || 3000;
    const maxAttempts = options?.maxAttempts || 0;
    const stopCondition = options?.stopCondition || false;
    const maxWaitTime = options?.maxWaitTime || 0;
    const startTime = Date.now();

    const startPolling = () => {
        if (intervalId) {
            clearPolling();
        }

        intervalId = setInterval(async () => {
            // 检查停止条件
            const shouldStop =
                typeof stopCondition === "function" ? stopCondition() : stopCondition;

            const isTimeout = maxWaitTime > 0 && Date.now() - startTime > maxWaitTime;
            const isExceedCount = maxAttempts > 0 && attempt >= maxAttempts;

            if (shouldStop || isExceedCount || isTimeout) {
                clearPolling();
                return;
            }

            attempt++;

            // 执行传入的任务函数
            try {
                await task(clearPolling);
            } catch (error) {
                clearPolling();
                throw new Error(`轮询任务执行失败，错误信息：${error}`);
            }
        }, interval);
    };

    const clearPolling = (callback?: () => void): void => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            attempt = 0;
            options?.onEnded?.();
        }
        callback?.();
    };

    const start = (callback?: () => void) => {
        startPolling();
        callback?.();
    };

    onUnmounted(() => {
        clearPolling();
    });
    return {
        start,
        clear: clearPolling,
    };
}
