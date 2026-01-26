import type { LinkItem } from "~/components/console/page-link-picker/layout";

/**
 * 菜单项配置
 */
export interface MenuItem {
    id: string;
    title: string;
    link: LinkItem;
    icon?: string;
    children?: MenuItem[];
    isHidden?: boolean;
}

/**
 * 布局风格定义
 */
export interface LayoutStyle {
    id: string;
    name: string;
    component: string;
}

/**
 * 布局配置（实际保存的数据）
 */
export interface LayoutConfig {
    /** 布局ID */
    layout: string;
    /** 菜单项列表 */
    menus: MenuItem[];
}

/**
 * 导航配置（用于布局组件显示）
 */
export interface NavigationConfig {
    /** 菜单项列表 */
    items: MenuItem[];
}
