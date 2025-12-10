/**
 * @fileoverview Permission store for user permission and menu management
 * @description This store manages user permissions, menu data, and provides
 * permission checking functionality for the console application.
 *
 * @author BuildingAI Teams
 */

import type { MenuFormData } from "@buildingai/service/consoleapi/menu";
import { apiGetUserInfo } from "@buildingai/service/consoleapi/user";
import { createPinia, defineStore } from "pinia";

import { useUserStore } from "./user";

/**
 * Permission store
 * @description Store for managing user permissions and menu data
 */
export const permissionStore = defineStore("permission", () => {
    const userStore = useUserStore();
    const menus = ref<MenuFormData[]>([]);
    const permissions = ref<string[]>([]);

    /**
     * Check if user has specific permission
     * @description Check if the current user has the specified permission code
     * @param permissionCode Permission code to check
     * @returns True if user has permission, false otherwise
     */
    const hasPermission = (permissionCode: string): boolean =>
        permissions.value.includes(permissionCode);

    /**
     * Load user permissions and menu data
     * @description Fetch user permissions, menus, and user info from API
     */
    const { lockFn: loadPermissions } = useLockFn(async () => {
        const result = await apiGetUserInfo();
        menus.value = result.menus || [];
        permissions.value = result.permissions || [];
        userStore.userInfo = result.user ? result.user : null;
    });

    return {
        menus,
        permissions,
        hasPermission,
        loadPermissions,
    };
});

export type PermissionStore = ReturnType<typeof usePermissionStore>;

/**
 * Use permission store
 * @description Use permission store
 * @returns Permission store
 */
const Pinia = createPinia();
export const usePermissionStore = () => permissionStore(Pinia);
