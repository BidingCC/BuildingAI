import type { StateCreator } from "zustand";
import { create } from "zustand";

import { applyPersistSync, type PersistSyncOptions } from "./utils/persist-sync";

export interface CreateStoreOptions<TState extends object> {
    persist?: PersistSyncOptions<TState>;
}

export function createStore<TState extends object>(
    creator: StateCreator<TState, [], [], TState>,
    options: CreateStoreOptions<TState> = {},
) {
    const useStore = create<TState>()(creator);

    if (options.persist) {
        applyPersistSync(useStore, options.persist);
    }

    return useStore;
}
