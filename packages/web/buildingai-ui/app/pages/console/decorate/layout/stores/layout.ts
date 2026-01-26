import { apiGetLayoutConfig, apiSaveLayoutConfig } from "@buildingai/service/consoleapi/decorate";
import { defineStore } from "pinia";

import { defaultMenuItems, layoutStyles } from "../data/layouts";
import type { LayoutConfig, MenuItem, NavigationConfig } from "../types";

/**
 * 布局设计器状态管理
 */
export const useLayoutStore = defineStore("layout", () => {
    // 当前选中的布局风格ID
    const currentLayoutId = ref<string>("layout-1");

    // 当前菜单配置
    const currentMenus = ref<MenuItem[]>([...defaultMenuItems]);

    // 计算属性：当前选中的布局风格
    const currentLayoutStyle = computed(() => {
        return layoutStyles.find((style) => style.id === currentLayoutId.value) || layoutStyles[0];
    });

    // 计算属性：当前布局配置（实际保存的数据）
    const currentLayoutConfig = computed<LayoutConfig>(() => ({
        layout: currentLayoutId.value,
        menus: currentMenus.value,
    }));

    // 计算属性：导航配置（用于布局组件显示）
    // 过滤掉隐藏的菜单项，确保预览面板同步隐藏状态
    const navigationConfig = computed<NavigationConfig>(() => ({
        items: currentMenus.value.filter((item) => !item.isHidden),
    }));

    /**
     * 设置当前布局风格
     */
    const setCurrentLayout = (layoutId: string) => {
        const layout = layoutStyles.find((style) => style.id === layoutId);
        if (layout) {
            currentLayoutId.value = layoutId;
        }
    };

    /**
     * 更新菜单配置
     */
    const updateMenus = (menus: MenuItem[]) => {
        currentMenus.value = [...menus];
    };

    /**
     * 保存当前布局配置到服务器
     */
    const saveCurrentLayout = async () => {
        try {
            const config = { ...currentLayoutConfig.value };

            // 调用 API 保存到服务器，使用 'web' 作为类型
            const response = await apiSaveLayoutConfig("web", config);

            return response;
        } catch (error) {
            console.error("保存布局配置失败:", error);
            throw error;
        }
    };

    /**
     * 从服务器加载布局配置
     */
    const loadLayoutFromServer = async () => {
        try {
            const response = await apiGetLayoutConfig("web");

            currentLayoutId.value = response.data.layout;
            currentMenus.value = [...response.data.menus];

            return response;
        } catch (error) {
            console.error("加载布局配置失败:", error);
            throw error;
        }
    };

    /**
     * 重置为默认配置
     */
    const resetToDefault = () => {
        currentLayoutId.value = "layout-1";
        currentMenus.value = [...defaultMenuItems];
    };

    return {
        // 状态
        currentLayoutId: readonly(currentLayoutId),
        currentMenus: currentMenus,

        // 计算属性
        currentLayoutStyle,
        currentLayoutConfig,
        navigationConfig,

        // 方法
        setCurrentLayout,
        updateMenus,
        saveCurrentLayout,
        loadLayoutFromServer,
        resetToDefault,
    };
});
