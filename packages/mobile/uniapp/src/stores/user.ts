/**
 * @fileoverview User authentication store for user state management
 * @description This store manages user authentication state, token handling,
 * login/logout functionality, and user information management.
 *
 * @author BuildingAI Teams
 */

import { STORAGE_KEYS } from "@buildingai/constants/web";
import type { UserInfo } from "@buildingai/service/webapi/user";
import { defineStore } from "pinia";
import { getCurrentPageMeta } from "virtual:pages-meta";
import { pages } from "virtual:uni-pages";
import { computed, shallowRef } from "vue";

import { apiGetCurrentUserInfo } from "@/service/user";

/**
 * User authentication store
 * @description Store for managing user authentication and user information
 */
const userStore = defineStore("auth", () => {
    /** Token expiration time in seconds */
    const _expireTime = 60 * 60 * 24 * 31;

    const LOGIN_TIME_STAMP = Number(useCookie(STORAGE_KEYS.LOGIN_TIME_STAMP).value || 0);

    /** Temporary token */
    const temporaryToken = shallowRef<string | null>(
        useCookie<string>(STORAGE_KEYS.USER_TEMPORARY_TOKEN).value || null,
    );
    /** Authentication token */
    const token = shallowRef<string | null>(
        useCookie<string | null>(STORAGE_KEYS.USER_TOKEN).value || null,
    );
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
     * @param isNewUser New user status
     */
    const login = async (newToken: string) => {
        // const route = useRoute();
        if (!newToken) {
            useToast().error("Login error, please try again");
            return;
        }
        setToken(newToken);
        setLoginTimeStamp();
        await nextTick();
        getUser();
    };
    /**
     * Handle redirect
     * @description Handle redirect to the specified page
     * @param redirect Redirect page
     */
    const handleRedirect = async (redirect: string) => {
        if (redirect === `/${pages[0]?.path || "/"}` || redirect === "/pages/login/index") {
            return uni.reLaunch({
                url: `/${pages[0]?.path || "/"}`,
            });
        } else {
            const currentPages = usePages();
            if (currentPages.value.length > 1) {
                const prevPage = currentPages.value[currentPages.value.length - 2];
                await uni.navigateBack();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const { onLoad, options } = prevPage;
                // 刷新上一个页面
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                onLoad && onLoad(options);
            } else if (redirect !== undefined && redirect !== null) {
                try {
                    uni.redirectTo({ url: `/${redirect}` });
                } finally {
                    uni.switchTab({ url: `/${redirect}` });
                }
            } else {
                uni.reLaunch({ url: `/${pages[0]?.path || "/"}` });
            }
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
    const logout = async () => {
        // const logout = async (expire?: boolean, route = useRoute()) => {
        // if (import.meta.client && expire && !onExpireNotice.value) {
        // onExpireNotice.value = true;
        // useMessage().warning("Login expired, please login again", {
        //     hook: () => {
        //         onExpireNotice.value = false;
        //     },
        // });
        // }
        // clearToken();
        // userInfo.value = null;
        // reloadNuxtApp({
        //     ttl: 100,
        // });
        // localStorage.removeItem("modelId");
        // localStorage.removeItem("mcpIds");
        // const needRedirect = route?.meta.auth !== false;
        // if (!needRedirect) return;
        // return useRouter().replace({
        //     path: `${ROUTES.HOME}?redirect=${route?.fullPath}`,
        //     replace: true,
        // });
        toLogin();
    };

    /**
     * Navigate to login page
     * @description Redirect to login page with current route as redirect parameter
     * @param route Current route object
     */
    const toLogin = async () => {
        clearToken();
        const route = getCurrentPageMeta();
        return uni.redirectTo({
            url: "/pages/login/index?redirect=" + route?.path,
        });
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
    const clearToken = () => {
        token.value = null;
        loginTimeStamp.value = 0;
        temporaryToken.value = null;

        useCookie(STORAGE_KEYS.USER_TOKEN, { maxAge: -1 }).value = null;
        useCookie(STORAGE_KEYS.USER_TEMPORARY_TOKEN, { maxAge: -1 }).value = null;
        useCookie(STORAGE_KEYS.LOGIN_TIME_STAMP, { maxAge: -1 }).value = null;
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
        handleRedirect,
        setTemporaryToken,
        refreshToken,
    };
});

/**
 * Use user store
 * @description Use user store, automatically uses the active Pinia instance
 * @returns User store instance
 */
export const useUserStore = userStore;
