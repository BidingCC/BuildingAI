import type { UserInfo } from "@buildingai/web-types";
import type { StateCreator } from "zustand";

import { createStore } from "../create-store";

export interface AuthState {
    token?: string;
    userInfo?: UserInfo;
}

export interface AuthActions {
    setToken: (token?: string) => void;
    setUserInfo: (userInfo?: UserInfo) => void;
    logout: () => void;
    isLogin: () => boolean;
}

export type AuthSlice = {
    auth: AuthState;
    authActions: AuthActions;
};

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set) => ({
    auth: {
        token: undefined,
        userInfo: undefined,
    },
    authActions: {
        setToken: (token) => set((s) => ({ auth: { ...s.auth, token } })),
        setUserInfo: (userInfo) => set((s) => ({ auth: { ...s.auth, userInfo } })),
        logout: () => set(() => ({ auth: { token: undefined, userInfo: undefined } })),
        isLogin: () => {
            const { token } = useAuthStore.getState().auth;
            return !!token;
        },
    },
});

export const useAuthStore = createStore<AuthSlice>(createAuthSlice, {
    persist: {
        name: "auth",
        partialize: (state) => ({ auth: state.auth }),
    },
});
