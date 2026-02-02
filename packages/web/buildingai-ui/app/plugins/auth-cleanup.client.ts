/**
 * 统一清理缓存
 */

import { useUserStore } from "@buildingai/stores/user";
import { useStorageStore } from "@buildingai/upload";

export default defineNuxtPlugin(() => {
    const userStore = useUserStore();
    const storageStore = useStorageStore();

    /**
     * Unified cache clearing
     */
    const cleanupCaches = () => {
        console.log("[auth-cleanup] Cleaning up caches...");

        storageStore.clearCache();

        // Other
    };

    userStore.$onAction(({ name }) => {
        if (name === "logout" || name === "toLogin") {
            // action 执行前清理缓存
            cleanupCaches();
        }
    });
});
