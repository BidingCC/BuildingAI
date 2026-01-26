/**
 * @fileoverview User authentication store for user state management
 * @description This store manages user authentication state, token handling,
 * login/logout functionality, and user information management.
 *
 * @author BuildingAI Teams
 */

import { ROUTES, STORAGE_KEYS } from "@buildingai/constants/web";
import type { UserInfo } from "@buildingai/service/webapi/user";
import { apiGetCurrentUserInfo } from "@buildingai/service/webapi/user";
import { createPinia, defineStore } from "pinia";
import { computed, shallowRef } from "vue";

/**
 * User authentication store
 * @description Store for managing user authentication and user information
 */
const userStore = defineStore("auth", () => {
    /** Token expiration time in seconds */
    const _expireTime = 60 * 60 * 24 * 31;

    const TOKEN = useCookie(STORAGE_KEYS.USER_TOKEN).value || null;

    const TEMPORARY_TOKEN = useCookie(STORAGE_KEYS.USER_TEMPORARY_TOKEN).value || null;
    const LOGIN_TIME_STAMP = Number(useCookie(STORAGE_KEYS.LOGIN_TIME_STAMP).value || 0);

    /** Temporary token */
    const temporaryToken = shallowRef<string | null>(TEMPORARY_TOKEN);
    /** Authentication token */
    const token = shallowRef<string | null>(TOKEN);
    /** User information */
    const userInfo = shallowRef<UserInfo | null>(null);
    /** Login expiration notice flag */
    const onExpireNotice = shallowRef<boolean>(false);
    /** Login timestamp */
    const loginTimeStamp = shallowRef<number>(LOGIN_TIME_STAMP);
    /** Privacy agreement acceptance status */
    const isAgreed = shallowRef<boolean>(false);

    /** Check if user is logged in */
    const isLogin = computed(() => {
        return token.value !== null && token.value !== undefined;
    });

    /**
     * User login
     * @description Handle user login with token and redirect logic
     * @param newToken Authentication token
     */
    const login = async (newToken: string) => {
        const route = useRoute();
        if (!newToken) {
            useMessage().error("Login error, please try again");
            return;
        }
        setToken(newToken);
        setLoginTimeStamp();
        await nextTick();
        getUser();

        const params = route.query as Record<string, string>;
        const redirectUrl = params.redirect;

        if (!redirectUrl || redirectUrl === ROUTES.HOME || redirectUrl === ROUTES.LOGIN) {
            return reloadNuxtApp({
                ttl: 100,
                path: ROUTES.HOME,
            });
        }

        // Parse redirect URL, support URLs with query parameters
        const redirectParts = redirectUrl.split("?");
        const redirectPath = redirectParts[0];

        if (route.path === redirectPath) {
            return reloadNuxtApp({
                ttl: 100,
                path: redirectUrl,
            });
        } else {
            return navigateTo(redirectUrl, { replace: true });
        }
    };

    /**
     * Temporary login
     * @description Set token without full login process
     * @param newToken Authentication token
     */
    const tempLogin = async (newToken: string) => {
        token.value = newToken;
    };

    /**
     * User logout
     * @description Handle user logout with optional expiration notice
     * @param expire Whether logout is due to token expiration
     * @param route Current route object
     */
    const logout = async (expire?: boolean, route = useRoute()) => {
        if (import.meta.client && expire && !onExpireNotice.value) {
            onExpireNotice.value = true;
            useMessage().warning("Login expired, please login again", {
                hook: () => {
                    onExpireNotice.value = false;
                },
            });
        }

        clearToken();
        userInfo.value = null;
        reloadNuxtApp({
            ttl: 100,
        });
        localStorage.removeItem("modelId");
        localStorage.removeItem("mcpIds");

        const needRedirect = route?.meta.auth !== false;
        if (!needRedirect) return;

        return useRouter().replace({
            path: `${ROUTES.HOME}?redirect=${route?.fullPath}`,
            replace: true,
        });
    };

    /**
     * Navigate to login page
     * @description Redirect to login page with current route as redirect parameter
     * @param route Current route object
     */
    const toLogin = async (route = useRoute()) => {
        if (route.path === ROUTES.LOGIN) {
            return;
        }
        clearToken();
        useRouter().push(`${ROUTES.LOGIN}?redirect=${route?.fullPath}`);
    };

    /**
     * Get user information
     * @description Fetch current user information from API
     * @returns Promise with user information or null if failed
     */
    const getUser = async () => {
        try {
            userInfo.value = await apiGetCurrentUserInfo();
            return userInfo.value;
        } catch (error) {
            console.error("Failed to get user information:", error);
            return null;
        }
    };

    /**
     * Set token to cookie
     * @description Set authentication token to cookie with expiration
     * @param newToken Authentication token
     */
    const setToken = (newToken: string | null) => {
        token.value = newToken;
        setLoginTimeStamp();
        useCookie(STORAGE_KEYS.USER_TOKEN, { maxAge: _expireTime }).value = newToken;
    };

    /**
     * Set temporary token
     * @description Set temporary authentication token
     * @param newToken Temporary authentication token
     */
    const setTemporaryToken = (newToken: string | null) => {
        temporaryToken.value = newToken;
        useCookie(STORAGE_KEYS.USER_TEMPORARY_TOKEN).value = newToken;
    };

    /**
     * Clear token
     * @description Clear all authentication tokens and related data
     */
    /**
     * Clear all public agent session cookies
     * @description Remove cookies created by public agent chat to prevent history restore after logout
     */
    const clearPublicAgentCookies = () => {
        if (!import.meta.client) return;

        const cookieNames = document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => c.split("=")[0] || "")
            .filter(Boolean);

        cookieNames.forEach((name) => {
            if (
                name.startsWith("public_agent_token_") ||
                name.startsWith("public_agent_conversation_")
            ) {
                useCookie(name, { maxAge: -1 }).value = null;
                useCookie(name, { maxAge: -1, path: "/" }).value = null;
                useCookie(name, { maxAge: -1, path: "/public" }).value = null;
                useCookie(name, { maxAge: -1, path: "/public/agent" }).value = null;
            }
        });
    };

    const clearToken = () => {
        token.value = null;
        loginTimeStamp.value = 0;
        temporaryToken.value = null;

        useCookie(STORAGE_KEYS.USER_TOKEN, { maxAge: -1 }).value = null;
        useCookie(STORAGE_KEYS.USER_TEMPORARY_TOKEN, { maxAge: -1 }).value = null;
        useCookie(STORAGE_KEYS.LOGIN_TIME_STAMP, { maxAge: -1 }).value = null;

        clearPublicAgentCookies();
    };

    /**
     * Refresh token
     * @description Refresh token if it's been more than 7 hours since login
     */
    const refreshToken = () => {
        // Only refresh if token exists and loginTimeStamp is valid (not 0)
        if (!token.value || loginTimeStamp.value === 0) {
            return;
        }

        if (Date.now() - loginTimeStamp.value >= 3600 * 7 * 1000) {
            useCookie(STORAGE_KEYS.USER_TOKEN, { maxAge: _expireTime }).value = token.value;
            setLoginTimeStamp();
        }
    };

    /**
     * Set login timestamp
     * @description Set current timestamp as login time
     */
    const setLoginTimeStamp = () => {
        useCookie(STORAGE_KEYS.LOGIN_TIME_STAMP, {
            maxAge: _expireTime,
        }).value = String(Date.now());
    };

    return {
        // State variables
        temporaryToken,
        token,
        userInfo,
        onExpireNotice,
        loginTimeStamp,
        isAgreed,
        // Computed properties
        isLogin,
        // Methods
        login,
        tempLogin,
        setToken,
        clearToken,
        logout,
        toLogin,
        getUser,
        setTemporaryToken,
        refreshToken,
    };
});

/**
 * Use user store
 * @description Use user store
 * @returns User store
 */
const Pinia = createPinia();
export const useUserStore = () => userStore(Pinia);
