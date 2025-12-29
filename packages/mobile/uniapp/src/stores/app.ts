/**
 * @fileoverview Application store for global app state management
 * @description This store manages global application state including site configuration,
 * login settings, and utility functions for image URL handling.
 *
 * @author BuildingAI Teams
 */

import type { LoginSettings, SiteConfig } from "@buildingai/service/common";
import { defineStore } from "pinia";

import { apiGetLoginSettings, apiGetSiteConfig } from "@/service/common";

/**
 * Haptic feedback type
 * @description Type of haptic feedback to trigger
 */
type HapticFeedbackType = "light" | "medium" | "heavy" | "selection";

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

    /**
     * Haptic feedback enabled state
     * @description Whether haptic feedback is enabled, persisted in cookie
     */
    const hapticFeedbackEnabled = useCookie<boolean>("hapticFeedbackEnabled", {
        default: () => true,
    });

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

    /**
     * Trigger haptic feedback
     * @description Trigger haptic feedback vibration if enabled
     * @param type Type of haptic feedback (default: "light")
     */
    const triggerHapticFeedback = (type: HapticFeedbackType = "light") => {
        if (!hapticFeedbackEnabled.value) {
            return;
        }

        try {
            // Use uni.vibrateShort which supports all platforms
            uni.vibrateShort({
                type: type === "selection" ? "light" : (type as "light" | "medium" | "heavy"),
            });
        } catch (error) {
            // Silently fail if haptic feedback is not supported
            console.debug("Haptic feedback not supported:", error);
        }
    };

    return {
        siteConfig,
        loginWay,
        loginSettings,
        hapticFeedbackEnabled,

        getConfig,
        getImageUrl,
        getLoginSettings,
        triggerHapticFeedback,
    };
});
/**
 * Use app store
 * @description Use app store, automatically uses the active Pinia instance
 * @returns App store instance
 */
export const useAppStore = appStore;
