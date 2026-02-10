import type { WebsiteConfig } from "@buildingai/web-types";
import type { StateCreator } from "zustand";

import { createStore } from "../create-store";

export interface ConfigState {
    websiteConfig?: WebsiteConfig;
}

export interface ConfigActions {
    setWebsiteConfig: (websiteConfig?: WebsiteConfig) => void;
}

export type ConfigSlice = {
    config: ConfigState;
    configActions: ConfigActions;
};

export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
    config: {
        websiteConfig: undefined,
    },
    configActions: {
        setWebsiteConfig: (websiteConfig) =>
            set((s) => ({ config: { ...s.config, websiteConfig } })),
    },
});

export const useConfigStore = createStore<ConfigSlice>(createConfigSlice, {
    persist: {
        name: "config",
        partialize: (state) => ({ config: state.config }),
    },
});
