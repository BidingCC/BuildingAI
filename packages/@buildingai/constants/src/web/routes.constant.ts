/**
 * @fileoverview Route path constants
 * @description Defines route path constants used in the application
 *
 * @author BuildingAI Teams
 */

/**
 * Application route paths
 * @description Main route paths used throughout the application
 */
export const ROUTES = {
    /** Home page path */
    HOME: "/",
    /** Login page path */
    LOGIN: "/login",
    /** Forbidden page path */
    FORBIDDEN: "/403",
    /** Console/Admin page path */
    CONSOLE: "/console",
    /** Extension page path */
    EXTENSION: "/extension",
    APP: "/app",
    /** BuildingAI middleware page path */
    BUILDINGAI_MIDDLEWARE: "/buildingai-middleware",
} as const;

/**
 * Menu permission types
 * @description Used to identify permission types: group, directory, menu, button
 */
export const MENU_TYPE = {
    /** Group */
    GROUP: 0,
    /** Directory */
    DIRECTORY: 1,
    /** Menu */
    MENU: 2,
    /** Button */
    BUTTON: 3,
} as const;

export type MenuType = (typeof MENU_TYPE)[keyof typeof MENU_TYPE];
