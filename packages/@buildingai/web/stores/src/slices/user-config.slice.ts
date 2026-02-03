import type { StateCreator } from "zustand";

import { createStore } from "../create-store";

/**
 * User config state structure: { [group]: { [key]: value } }
 */
export interface UserConfigState {
    configs: Record<string, Record<string, any>>;
}

export type FontSize = "xs" | "sm" | "md" | "lg" | "xl";

const APPEARANCE_GROUP = "appearance";
const FONT_SIZE_KEY = "fontSize";

/**
 * Apply font size to the document root element.
 */
const applyFontSize = (size: FontSize) => {
    if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-font-size", size);
    }
};

export interface UserConfigActions {
    setConfig: <T = any>(group: string, key: string, value: T) => void;
    setConfigs: (configs: Record<string, Record<string, any>>) => void;
    getConfig: <T = any>(group: string, key: string, defaultValue?: T) => T | undefined;
    getGroupConfigs: (group: string) => Record<string, any>;
    removeConfig: (group: string, key: string) => void;
    clearConfigs: () => void;
    setFontSize: (size: FontSize) => void;
    getFontSize: () => FontSize;
    initAppearance: () => void;
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
        setFontSize: (size) => {
            set((s) => ({
                userConfig: {
                    ...s.userConfig,
                    configs: {
                        ...s.userConfig.configs,
                        [APPEARANCE_GROUP]: {
                            ...s.userConfig.configs[APPEARANCE_GROUP],
                            [FONT_SIZE_KEY]: size,
                        },
                    },
                },
            }));
            applyFontSize(size);
        },
        getFontSize: () => {
            const groupConfigs = get().userConfig.configs[APPEARANCE_GROUP];
            return groupConfigs?.[FONT_SIZE_KEY] ?? "md";
        },
        initAppearance: () => {
            const fontSize = get().userConfigActions.getFontSize();
            applyFontSize(fontSize);
        },
    },
});

export const useUserConfigStore = createStore<UserConfigSlice>(createUserConfigSlice, {
    persist: {
        name: "user-config",
        partialize: (state) => ({ userConfig: state.userConfig }),
    },
});
