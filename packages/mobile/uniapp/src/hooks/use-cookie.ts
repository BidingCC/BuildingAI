import { ref, watch } from "vue";

interface UseCookieOptions<T> {
    default?: T | (() => T);
    maxAge?: number;
    expires?: Date;
}

interface StoredData<T> {
    value: T;
    expires?: number;
}

export function useCookie<T = unknown>(key: string, options: UseCookieOptions<T> = {}) {
    const getDefault = (): T =>
        typeof options.default === "function"
            ? (options.default as () => T)()
            : (options.default as T);

    const getExpires = (): number | undefined => {
        if (options.expires) {
            return options.expires.getTime();
        }
        if (options.maxAge !== undefined) {
            if (options.maxAge <= 0) {
                return undefined;
            }
            return Date.now() + options.maxAge * 1000;
        }
        return undefined;
    };

    const read = (): T => {
        const raw = uni.getStorageSync(key);
        if (!raw) return getDefault();

        try {
            const parsed = JSON.parse(raw);
            // 如果解析出来的是空对象，返回默认值
            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                Object.keys(parsed).length === 0
            ) {
                uni.removeStorageSync(key);
                return getDefault();
            }
            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                "value" in parsed
            ) {
                const storedData = parsed as StoredData<T>;
                if (storedData.expires && Date.now() > storedData.expires) {
                    uni.removeStorageSync(key);
                    return getDefault();
                }
                return storedData.value;
            }
            return parsed as T;
        } catch {
            return raw as T;
        }
    };

    const write = (val: T) => {
        if (val === null || val === undefined) {
            uni.removeStorageSync(key);
            return;
        }

        const expires = getExpires();
        const dataToStore: StoredData<T> = {
            value: val,
            ...(expires !== undefined && { expires }),
        };

        const serialized = JSON.stringify(dataToStore);
        uni.setStorageSync(key, serialized);
    };

    const data = ref<T>(read());

    watch(
        data,
        (val) => {
            if (val === null || val === undefined) {
                uni.removeStorageSync(key);
                // 如果提供了 default，则设置为 default，否则保持 null/undefined
                if (options.default !== undefined) {
                    data.value = getDefault() as typeof data.value;
                }
            } else {
                write(val as T);
            }
        },
        { deep: true },
    );

    return data;
}
