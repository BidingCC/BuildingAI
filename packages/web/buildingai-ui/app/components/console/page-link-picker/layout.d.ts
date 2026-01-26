/** Link type enumeration */
export const LinkType = {
    /** System page */
    SYSTEM: "system",
    /** Plugin page */
    PLUGIN: "plugin",
    /** Micro page */
    MICROPAGE: "micropage",
    /** Custom link */
    CUSTOM: "custom",
};
export type _LinkType = (typeof LinkType)[keyof typeof LinkType];

/** Link item interface */
export interface LinkItem {
    /** Link type */
    type?: _LinkType;
    /** Plugin name (for plugin links) */
    pluginName?: string;
    /** Display name */
    name?: string;
    /** Link path */
    path?: string;
    /** Additional data */
    query?: Record<string, unknown>;
}

/** Route meta information interface */
export interface RouteMeta {
    /** Whether to allow display in link selector */
    inLinkSelector?: boolean;
    /** Whether it's a system page */
    inSystem?: boolean;
    /** Page title */
    title?: string;
    /** Page icon */
    icon?: string;
}

/** Feature option interface */
export interface LinkPickerOption {
    /** Option key value */
    key: _LinkType;
    /** Display label */
    label: string;
    /** Icon */
    icon: string;
}

/** Link provider interface */
export interface LinkProvider {
    /** Provider type */
    type: _LinkType;
    /** Get link list */
    getLinks(): Promise<LinkItem[]> | LinkItem[];
    /** Search links */
    searchLinks?(query: string): Promise<LinkItem[]> | LinkItem[];
    /** Validate link */
    validateLink?(link: LinkItem): boolean;
}

/** Menu item configuration */
export type MenuItem = {
    id: string;
    title: string;
    link: LinkItem;
    icon?: string;
    children?: MenuItem[];
};

/** Layout style definition */
export interface LayoutStyle {
    id: string;
    name: string;
    component: string;
}

/** Layout configuration (actual saved data) */
export interface LayoutConfig {
    /** Layout ID */
    layout: string;
    /** Menu items list */
    menus: MenuItem[];
}

/** Navigation configuration (for layout component display) */
export interface NavigationConfig {
    /** Menu items list */
    items: MenuItem[];
}
