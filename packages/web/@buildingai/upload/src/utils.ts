export function omit<T extends object, K extends keyof T>(obj: T, keys: K | K[]): Omit<T, K> {
    const keysToOmit = new Set(Array.isArray(keys) ? keys : [keys]);
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keysToOmit.has(key as K)),
    ) as Omit<T, K>;
}

/**
 * Get extension ID from provided value or runtime config
 *
 * @param providedExtensionId Extension ID provided by user (optional)
 * @returns Extension ID string or undefined
 */
export function getExtensionId(providedExtensionId?: string): string | undefined {
    if (providedExtensionId) return providedExtensionId;
    try {
        return useRuntimeConfig().public.pluginName as string | undefined;
    } catch {
        return undefined;
    }
}
