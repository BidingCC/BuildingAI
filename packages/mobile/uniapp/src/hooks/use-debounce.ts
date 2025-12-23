/**
 * 防抖 Hook
 * @description 创建一个防抖函数，在指定延迟时间内只执行最后一次调用
 * @param fn 需要防抖的函数
 * @param delay 延迟时间（毫秒），默认 500ms
 * @returns 返回防抖后的函数和取消函数
 * @example
 * ```ts
 * const { debouncedFn, cancel } = useDebounce((value: string) => {
 *   console.log(value);
 * }, 500);
 *
 * // 使用
 * debouncedFn('hello');
 * debouncedFn('world'); // 只有这个会执行
 *
 * // 取消
 * cancel();
 * ```
 */
export function useDebounce<T extends (...args: any[]) => any>(fn: T, delay: number = 500) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    /**
     * 防抖后的函数
     * @param args 传递给原函数的参数
     */
    const debouncedFn = (...args: Parameters<T>) => {
        // 清除之前的定时器
        if (timer) {
            clearTimeout(timer);
        }
        // 设置新的定时器
        timer = setTimeout(() => {
            fn(...args);
            timer = null;
        }, delay);
    };

    /**
     * 取消待执行的防抖函数
     */
    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    // 组件卸载时清理定时器
    onUnmounted(() => {
        cancel();
    });

    return {
        debouncedFn,
        cancel,
    };
}
