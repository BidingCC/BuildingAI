import type { StateCreator } from "zustand";

import { createStore } from "../create-store";

/**
 * User config state structure: { [group]: { [key]: value } }
 */
export interface UserConfigState {
    configs: Record<string, Record<string, any>>;
}

export interface UserConfigActions {
    setConfig: <T = any>(group: string, key: string, value: T) => void;
    setConfigs: (configs: Record<string, Record<string, any>>) => void;
    getConfig: <T = any>(group: string, key: string, defaultValue?: T) => T | undefined;
    getGroupConfigs: (group: string) => Record<string, any>;
    removeConfig: (group: string, key: string) => void;
    clearConfigs: () => void;
}

export type UserConfigSlice = {
    userConfig: UserConfigState;
    userConfigActions: UserConfigActions;
};

export const createUserConfigSlice: StateCreator<UserConfigSlice, [], [], UserConfigSlice> = (
    set,
    get,
) => ({
    userConfig: {
        configs: {},
    },
    userConfigActions: {
        setConfig: (group, key, value) =>
            set((s) => ({
                userConfig: {
                    ...s.userConfig,
                    configs: {
                        ...s.userConfig.configs,
                        [group]: { ...s.userConfig.configs[group], [key]: value },
                    },
                },
            })),
        setConfigs: (configs) =>
            set((s) => {
                const merged = { ...s.userConfig.configs };
                for (const [group, groupConfigs] of Object.entries(configs)) {
                    merged[group] = { ...merged[group], ...groupConfigs };
                }
                return { userConfig: { ...s.userConfig, configs: merged } };
            }),
        getConfig: (group, key, defaultValue) => {
            const groupConfigs = get().userConfig.configs[group];
            if (!groupConfigs) return defaultValue;
            return groupConfigs[key] !== undefined ? groupConfigs[key] : defaultValue;
        },
        getGroupConfigs: (group) => {
            return get().userConfig.configs[group] || {};
        },
        removeConfig: (group, key) =>
            set((s) => {
                const groupConfigs = s.userConfig.configs[group];
                if (!groupConfigs) return s;
                const { [key]: _, ...rest } = groupConfigs;
                return {
                    userConfig: {
                        ...s.userConfig,
                        configs: { ...s.userConfig.configs, [group]: rest },
                    },
                };
            }),
        clearConfigs: () => set((s) => ({ userConfig: { ...s.userConfig, configs: {} } })),
    },
});

export const useUserConfigStore = createStore<UserConfigSlice>(createUserConfigSlice, {
    persist: {
        name: "user-config",
        partialize: (state) => ({ userConfig: state.userConfig }),
    },
});
