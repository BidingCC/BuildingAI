import type { StoreApi } from "zustand";

import { getLocalStorage, safeJsonParse, safeJsonStringify } from "./storage";

export interface PersistSyncOptions<TState extends object> {
    name: string;
    /** select which part of the state should be persisted */
    partialize?: (state: TState) => unknown;
    /** merge persisted slice into current state */
    merge?: (persisted: unknown, current: TState) => Partial<TState>;
    /**
     * If true, listen storage event and sync across tabs.
     * Default: true
     */
    syncAcrossTabs?: boolean;
}

export function applyPersistSync<TState extends object>(
    store: StoreApi<TState>,
    options: PersistSyncOptions<TState>,
): () => void {
    const storage = getLocalStorage();
    const partialize = options.partialize ?? ((s: TState) => s);
    const merge = options.merge ?? ((persisted: unknown) => (persisted as Partial<TState>) ?? {});
    const syncAcrossTabs = options.syncAcrossTabs ?? true;

    const persisted = safeJsonParse<unknown>(storage.getItem(options.name));
    if (persisted !== undefined) {
        store.setState(merge(persisted, store.getState()));
    }

    const unsubscribeStore = store.subscribe((state) => {
        const payload = partialize(state);
        storage.setItem(options.name, safeJsonStringify(payload));
    });

    const onStorage = (e: StorageEvent) => {
        if (e.storageArea !== window.localStorage) return;
        if (e.key !== options.name) return;

        const nextPersisted = safeJsonParse<unknown>(e.newValue);
        if (nextPersisted === undefined) return;

        store.setState(merge(nextPersisted, store.getState()));
    };

    if (syncAcrossTabs) {
        window.addEventListener("storage", onStorage);
    }

    return () => {
        unsubscribeStore();
        if (syncAcrossTabs) {
            window.removeEventListener("storage", onStorage);
        }
    };
}
