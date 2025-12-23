export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function getLocalStorage(): StorageAdapter {
    return window.localStorage;
}

export function safeJsonParse<T>(raw: string | null): T | undefined {
    if (!raw) return undefined;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
}

export function safeJsonStringify(value: unknown): string {
    return JSON.stringify(value);
}
