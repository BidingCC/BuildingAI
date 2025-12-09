/**
 * @fileoverview Application store for global app state management
 * @description This store manages global application state including site configuration,
 * login settings, and utility functions for image URL handling.
 *
 * @author BuildingAI Teams
 */

import { defineStore } from "pinia";

import type { SystemInfo } from "@/service";
import type { LoginSettings, SiteConfig } from "@/service";
import { apiGetSystemInfo } from "@/service";
import { apiGetLoginSettings, apiGetSiteConfig } from "@/service";

/**
 * Application store
 * @description Global application state management store
 */
const appStore = defineStore("app", () => {
    const siteConfig = ref<SiteConfig | null>(null);
    const loginWay = reactive({
        loginAgreement: true,
        coerceMobile: 0,
        defaultLoginWay: 1,
    });
    const loginSettings = ref<LoginSettings | null>(null);
    const systemInfo = ref<SystemInfo | null>(null);

    /**
     * Get site configuration
     * @description Fetch and cache site configuration from API
     * @returns Promise with site configuration or null if failed
     */
    const getConfig = async () => {
        try {
            siteConfig.value = await apiGetSiteConfig();
            return siteConfig.value;
        } catch (error) {
            console.error("Failed to get site configuration:", error);
            return null;
        }
    };

    /**
     * Get login settings
     * @description Fetch and cache login settings from API
     * @returns Promise with login settings or null if failed
     */
    const getLoginSettings = async () => {
        try {
            loginSettings.value = await apiGetLoginSettings();
            return loginSettings.value;
        } catch (error) {
            console.error("Failed to get login settings:", error);
            return null;
        }
    };

    /**
     * Get system information
     * @description Fetch and cache system information from API
     * @returns Promise with system information or null if failed
     */
    const getSystemInfo = async () => {
        try {
            systemInfo.value = await apiGetSystemInfo();
            return systemInfo.value;
        } catch (error) {
            console.error("Failed to get system information:", error);
            return null;
        }
    };

    /**
     * Check system initialization and return redirect path if needed
     * @description Check if system is initialized and handle route redirection logic
     * @param path Current route path
     * @returns Redirect path if needed, null otherwise. Throws error if system info fetch fails.
     */
    const checkSystemInitialization = async (path: string): Promise<string | null> => {
        // Normalize path by removing trailing slash for comparison
        const normalizedPath = path.replace(/\/$/, "") || "/";
        const isInstallPage = normalizedPath === "/install";

        // If system info is not loaded, fetch it first
        if (!systemInfo.value) {
            const info = await getSystemInfo();
            if (!info) {
                // If API call fails, it might be because system is not initialized or network issue
                // Return a special value to indicate error, let middleware handle it
                throw new Error("Failed to get system information");
            }
        }

        // If system is already initialized and user is trying to access install page, redirect to home
        if (systemInfo.value?.isInitialized && isInstallPage) {
            return "/";
        }

        // If system is not initialized and user is not on install page, redirect to install page
        if (!systemInfo.value?.isInitialized && !isInstallPage) {
            return "/install";
        }

        return null;
    };

    /**
     * Get image URL
     * @description Process image URL conversion, supports relative path to absolute path conversion
     * @param imageUrl Original image URL
     * @returns Processed image URL
     */
    const getImageUrl = (imageUrl: string): string => {
        if (!imageUrl) return "";

        // If it's a complete URL, return directly
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            return imageUrl;
        }

        // If it's base64, return directly
        if (imageUrl.startsWith("data:")) {
            return imageUrl;
        }

        // Handle relative paths, add base URL (adjust according to actual needs)
        // Base URL can be set according to actual configuration or environment variables
        const baseUrl = "";
        return baseUrl ? `${baseUrl}${imageUrl}` : imageUrl;
    };

    return {
        siteConfig,
        loginWay,
        loginSettings,
        systemInfo,

        getConfig,
        getImageUrl,
        getLoginSettings,
        getSystemInfo,
        checkSystemInitialization,
    };
});
/**
 * Use app store
 * @description Use app store, automatically uses the active Pinia instance
 * @returns App store instance
 */
export const useAppStore = appStore;
