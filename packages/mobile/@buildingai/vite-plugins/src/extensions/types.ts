export interface Extension {
    config: ExtensionConfig;
    root: string;
    configPath: string;
}

export interface PluginOptions {
    extensionsDir?: string;
    enableHmr?: boolean;
    include?: string[];
    exclude?: string[];
}

export interface ExtensionConfig {
    name?: string;
    root: string;
    pages: PageConfig[];
    version?: string;
    enabled?: boolean;
}

export interface PageConfig {
    path: string;
    style?: PageStyle;
}

export interface PageStyle {
    navigationBarTitleText?: string;
    navigationBarBackgroundColor?: string;
    navigationBarTextStyle?: "white" | "black";
    enablePullDownRefresh?: boolean;
    backgroundColor?: string;
    [key: string]: any;
}

/**
 * 定义扩展配置（提供类型提示）
 */
export function defineExtension(config: ExtensionConfig): ExtensionConfig {
    return config;
}
